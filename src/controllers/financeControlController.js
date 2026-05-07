/**
 * Finance Control Controller
 * CRUD independiente para datos de control financiero mensual.
 * No depende de Transaction, Loan ni ningún otro modelo.
 */

const FinanceControlData = require('../models/FinanceControlData');
const UserCategory = require('../models/UserCategory');

// Categorías por defecto
const DEFAULT_CATEGORIES = [
  { name: 'Alimentación', color: '#FF6B6B' },
  { name: 'Transporte', color: '#4ECDC4' },
  { name: 'Vivienda', color: '#45B7D1' },
  { name: 'Entretenimiento', color: '#96CEB4' },
  { name: 'Salud', color: '#FFEAA7' },
  { name: 'Educación', color: '#DDA0DD' },
  { name: 'Vestuario', color: '#98D8C8' },
  { name: 'Servicios', color: '#F7DC6F' },
  { name: 'Otros', color: '#B0BEC5' }
];

// Helper: mes actual como string "YYYY-MM"
const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * @desc    Obtener datos del mes (o crear vacío con datos del mes anterior)
 * @route   GET /api/finance-control/current
 * @access  Private
 */
const getCurrentData = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || getCurrentMonth();

    let data = await FinanceControlData.findOne({ user: userId, month });
    if (!data) {
      // Buscar el mes anterior para auto-completar lastMonthTotal
      const [year, mon] = month.split('-').map(Number);
      const prevDate = new Date(year, mon - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const prevData = await FinanceControlData.findOne({ user: userId, month: prevMonth });

      let lastMonthTotal = 0;
      if (prevData) {
        // Calcular egresos del mes anterior
        const prevItems = prevData.items || [];
        lastMonthTotal = prevItems
          .filter(i => ['expense', 'subscription', 'debt_i_owe', 'prepaid_transfer', 'credit_card_payment'].includes(i.type))
          .reduce((sum, i) => sum + i.amount, 0);
      }

      data = await FinanceControlData.create({
        user: userId,
        month,
        salary: { gross: 0, deductions: { afp: 0, health: 0, other: 0 }, net: 0 },
        items: [],
        lastMonthTotal
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting finance control data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Obtener historial de meses disponibles
 * @route   GET /api/finance-control/history
 * @access  Private
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const months = await FinanceControlData.find(
      { user: userId },
      { month: 1, 'salary.net': 1, items: 1, _id: 0 }
    ).sort({ month: -1 }).lean();

    // Resumen ligero por mes
    const history = months.map(m => {
      const items = m.items || [];
      const income = (m.salary?.net || 0) + items.filter(i => i.type === 'other_income').reduce((s, i) => s + i.amount, 0);
      const expenses = items.filter(i => ['expense', 'subscription', 'debt_i_owe', 'prepaid_transfer', 'credit_card_payment'].includes(i.type)).reduce((s, i) => s + i.amount, 0);
      return { month: m.month, income, expenses, balance: income - expenses, itemCount: items.length };
    });

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Guardar/actualizar sueldo
 * @route   PUT /api/finance-control/salary
 * @access  Private
 */
const updateSalary = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.body.month || getCurrentMonth();
    const { gross, deductions } = req.body;

    const afp = deductions?.afp || 0;
    const health = deductions?.health || 0;
    const other = deductions?.other || 0;
    const net = Math.max(0, gross - afp - health - other);

    const data = await FinanceControlData.findOneAndUpdate(
      { user: userId, month },
      { $set: { salary: { gross, deductions: { afp, health, other }, net } } },
      { new: true, upsert: true }
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating salary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: calcula el balance actual a partir de los datos del mes
const calculateBalance = (data) => {
  const net = data.salary?.net || 0;
  let totalEgresos = 0;
  let totalOtherIncome = 0;
  let totalPaidOwedToMe = 0;

  (data.items || []).forEach(item => {
    switch (item.type) {
      case 'expense':
      case 'subscription':
      case 'debt_i_owe':
      case 'prepaid_transfer':
      case 'credit_card_payment':
        totalEgresos += item.amount;
        break;
      case 'other_income':
        totalOtherIncome += item.amount;
        break;
      case 'debt_owed_to_me':
        if (item.paid) totalPaidOwedToMe += item.amount;
        else totalEgresos += item.amount;
        break;
      // credit_card_purchase, savings_goal, prepaid_expense no afectan balance principal directamente
    }
  });

  return net + totalOtherIncome - totalEgresos + totalPaidOwedToMe;
};

// Helper: calcula el impacto de un item en el balance GENERAL
const getItemImpact = (type, amount, paid) => {
  switch (type) {
    case 'expense':
    case 'subscription':
    case 'debt_i_owe':
    case 'prepaid_transfer':
    case 'credit_card_payment':
      return -amount;
    case 'other_income':
      return +amount;
    case 'debt_owed_to_me':
      return paid ? +amount : -amount;
    default:
      return 0;
  }
};

// Helper: determina a qué "pool" pertenece un item
const getBalancePool = (type) => {
  if (type === 'prepaid_transfer' || type === 'prepaid_expense') return 'prepaid';
  if (type === 'credit_card_purchase' || type === 'credit_card_payment') return 'credit_card';
  return 'general';
};

// Helper: impacto dentro de su propio pool
const getPoolImpact = (type, amount) => {
  switch (type) {
    case 'prepaid_transfer': return +amount;   // entra dinero a prepago
    case 'prepaid_expense': return -amount;    // sale dinero de prepago
    case 'credit_card_purchase': return +amount; // sube la deuda
    case 'credit_card_payment': return -amount;  // baja la deuda
    default: return 0;
  }
};

/**
 * @desc    Agregar item
 * @route   POST /api/finance-control/items
 * @access  Private
 */
const addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.body.month || getCurrentMonth();
    const { type, name, amount, person, category, date, paid, account } = req.body;

    // Obtener datos actuales para calcular balance antes
    let data = await FinanceControlData.findOne({ user: userId, month });
    if (!data) {
      data = await FinanceControlData.create({ user: userId, month, items: [] });
    }

    const pool = getBalancePool(type);
    let balanceBefore, balanceAfter;

    if (pool === 'general') {
      balanceBefore = calculateBalance(data);
      const impact = getItemImpact(type, amount, paid || false);
      balanceAfter = balanceBefore + impact;
    } else {
      // Calcular balance del pool específico, filtrado por cuenta si aplica
      const poolTypes = pool === 'prepaid'
        ? ['prepaid_transfer', 'prepaid_expense']
        : ['credit_card_purchase', 'credit_card_payment'];
      const accountName = account || null;
      let poolBalance = 0;
      data.items.filter(i => poolTypes.includes(i.type) && (i.account || null) === accountName).forEach(i => {
        poolBalance += getPoolImpact(i.type, i.amount);
      });
      balanceBefore = poolBalance;
      balanceAfter = poolBalance + getPoolImpact(type, amount);
    }

    data.items.push({ type, name, amount, person, category, date, paid: paid || false, account: account || null, balanceBefore, balanceAfter });
    await data.save();

    const newItem = data.items[data.items.length - 1];
    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Editar item
 * @route   PUT /api/finance-control/items/:itemId
 * @access  Private
 */
const updateItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const month = req.body.month || getCurrentMonth();
    const updates = req.body;

    const data = await FinanceControlData.findOne({ user: userId, month });
    if (!data) return res.status(404).json({ success: false, message: 'Datos no encontrados' });

    const item = data.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item no encontrado' });

    if (updates.name !== undefined) item.name = updates.name;
    if (updates.amount !== undefined) item.amount = updates.amount;
    if (updates.person !== undefined) item.person = updates.person;
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.date !== undefined) item.date = updates.date;
    if (updates.paid !== undefined) item.paid = updates.paid;

    await data.save();
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Eliminar item
 * @route   DELETE /api/finance-control/items/:itemId
 * @access  Private
 */
const deleteItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const month = req.query.month || getCurrentMonth();

    const data = await FinanceControlData.findOneAndUpdate(
      { user: userId, month },
      { $pull: { items: { _id: itemId } } },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: 'Datos no encontrados' });

    res.json({ success: true, message: 'Item eliminado' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Actualizar gasto del mes anterior
 * @route   PUT /api/finance-control/last-month
 * @access  Private
 */
const updateLastMonth = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.body.month || getCurrentMonth();
    const { lastMonthTotal } = req.body;

    const data = await FinanceControlData.findOneAndUpdate(
      { user: userId, month },
      { $set: { lastMonthTotal } },
      { new: true, upsert: true }
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating last month:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Resetear datos del mes
 * @route   DELETE /api/finance-control/reset
 * @access  Private
 */
const resetMonth = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || getCurrentMonth();

    await FinanceControlData.findOneAndDelete({ user: userId, month });
    res.json({ success: true, message: 'Datos del mes eliminados' });
  } catch (error) {
    console.error('Error resetting month:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Obtener categorías del usuario (default + custom)
 * @route   GET /api/finance-control/categories
 * @access  Private
 */
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    let userCat = await UserCategory.findOne({ user: userId });
    if (!userCat) {
      userCat = await UserCategory.create({ user: userId, categories: [] });
    }
    // Combinar default + custom
    const all = [...DEFAULT_CATEGORIES, ...userCat.categories];
    res.json({ success: true, data: { defaults: DEFAULT_CATEGORIES, custom: userCat.categories, all } });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Agregar categoría personalizada
 * @route   POST /api/finance-control/categories
 * @access  Private
 */
const addCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Nombre requerido' });

    let userCat = await UserCategory.findOne({ user: userId });
    if (!userCat) {
      userCat = await UserCategory.create({ user: userId, categories: [] });
    }

    // Verificar que no exista ya (ni en default ni en custom)
    const allNames = [...DEFAULT_CATEGORIES.map(c => c.name.toLowerCase()), ...userCat.categories.map(c => c.name.toLowerCase())];
    if (allNames.includes(name.trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'La categoría ya existe' });
    }

    userCat.categories.push({ name: name.trim(), color: color || '#B0BEC5' });
    await userCat.save();

    res.json({ success: true, data: userCat.categories });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Eliminar categoría personalizada
 * @route   DELETE /api/finance-control/categories/:categoryId
 * @access  Private
 */
const deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;

    const userCat = await UserCategory.findOneAndUpdate(
      { user: userId },
      { $pull: { categories: { _id: categoryId } } },
      { new: true }
    );
    if (!userCat) return res.status(404).json({ success: false, message: 'No encontrado' });

    res.json({ success: true, data: userCat.categories });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Recalcular balances de todos los items existentes (migración)
 * @route   POST /api/finance-control/recalculate-balances
 * @access  Private
 */
const recalculateBalances = async (req, res) => {
  try {
    const userId = req.user.id;
    // Obtener todos los meses del usuario
    const allMonths = await FinanceControlData.find({ user: userId }).sort({ month: 1 });
    let totalUpdated = 0;

    for (const monthData of allMonths) {
      // Ordenar items por createdAt
      const sortedItems = [...monthData.items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const net = monthData.salary?.net || 0;
      let runningGeneral = net;
      let runningPrepaid = 0;
      const runningAccounts = {}; // { accountName: balance }

      for (const item of sortedItems) {
        const pool = getBalancePool(item.type);
        let balanceBefore, balanceAfter;

        if (pool === 'general') {
          balanceBefore = runningGeneral;
          const impact = getItemImpact(item.type, item.amount, item.paid);
          balanceAfter = runningGeneral + impact;
          runningGeneral = balanceAfter;
        } else if (pool === 'prepaid') {
          balanceBefore = runningPrepaid;
          balanceAfter = runningPrepaid + getPoolImpact(item.type, item.amount);
          runningPrepaid = balanceAfter;
        } else {
          // credit_card - agrupar por account
          const accKey = item.account || '__default__';
          if (runningAccounts[accKey] == null) runningAccounts[accKey] = 0;
          balanceBefore = runningAccounts[accKey];
          balanceAfter = runningAccounts[accKey] + getPoolImpact(item.type, item.amount);
          runningAccounts[accKey] = balanceAfter;
        }

        // Actualizar el item en el array
        const itemInDoc = monthData.items.id(item._id);
        if (itemInDoc) {
          itemInDoc.balanceBefore = balanceBefore;
          itemInDoc.balanceAfter = balanceAfter;
          totalUpdated++;
        }
      }

      await monthData.save();
    }

    res.json({ success: true, message: `Balances recalculados para ${totalUpdated} items en ${allMonths.length} meses` });
  } catch (error) {
    console.error('Error recalculating balances:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCurrentData,
  getHistory,
  updateSalary,
  addItem,
  updateItem,
  deleteItem,
  updateLastMonth,
  resetMonth,
  getCategories,
  addCategory,
  deleteCategory,
  recalculateBalances
};
