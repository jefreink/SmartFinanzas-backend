/**
 * Finance Control Controller
 * CRUD independiente para datos de control financiero mensual.
 * No depende de Transaction, Loan ni ningún otro modelo.
 */

const FinanceControlData = require('../models/FinanceControlData');

// Helper: mes actual como string "YYYY-MM"
const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * @desc    Obtener datos del mes actual (o crear vacío)
 * @route   GET /api/finance-control/current
 * @access  Private
 */
const getCurrentData = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || getCurrentMonth();

    let data = await FinanceControlData.findOne({ user: userId, month });
    if (!data) {
      data = await FinanceControlData.create({
        user: userId,
        month,
        salary: { gross: 0, deductions: { afp: 0, health: 0, other: 0 }, net: 0 },
        items: [],
        lastMonthTotal: 0
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting finance control data:', error);
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

/**
 * @desc    Agregar item
 * @route   POST /api/finance-control/items
 * @access  Private
 */
const addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.body.month || getCurrentMonth();
    const { type, name, amount, person, category, date, paid } = req.body;

    const data = await FinanceControlData.findOneAndUpdate(
      { user: userId, month },
      { $push: { items: { type, name, amount, person, category, date, paid: paid || false } } },
      { new: true, upsert: true }
    );
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

module.exports = {
  getCurrentData,
  updateSalary,
  addItem,
  updateItem,
  deleteItem,
  updateLastMonth,
  resetMonth
};
