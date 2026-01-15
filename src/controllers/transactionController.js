/**
 * Controlador de Transacciones
 * Maneja lógica de gastos, ingresos, 'Impuesto al Vicio' y 'Dinero Libre'.
 */
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');

/**
 * Categorías consideradas "Vicio" (Base Global Simplificada)
 * En el futuro esto debería venir de una colección 'Categories' en la DB.
 */
const VICE_CATEGORIES = ['Alcohol', 'Tabaco', 'Fast Food', 'Juegos de Azar', 'Fiesta', 'Vicio', 'Cigarrillos'];
const FOOD_CATEGORIES = ['Comida', 'Supermercado', 'Despensa', 'Groceries', 'Alimentos'];

/**
 * @desc    Crear nueva transacción
 * @route   POST /api/transactions
 * @access  Private
 */
exports.createTransaction = async (req, res) => {
  try {
    const { totalAmount, type, category, merchant, date, items, mood, paymentMethod, installments } = req.body;

    let transactionData = {
      user: req.user.id,
      totalAmount,
      type,
      category,
      merchant,
      date: date || Date.now(),
      items: items || [],
      mood, // Happy, stressed, neutral
      paymentMethod,
      installments: (paymentMethod === 'credit' && installments > 1) 
          ? { current: 1, total: Number(installments) } 
          : { current: 1, total: 1 },
      isVice: false,
      viceTaxAmount: 0,
    };

    // Lógica 1: Impuesto al Vicio (Vice Tax)
    // Si la categoría es vicio, calculamos el 10% y actualizamos una Meta.
    if (type === 'expense' && VICE_CATEGORIES.includes(category)) {
      transactionData.isVice = true;
      const taxRate = 0.10; // 10% hardcoded por ahora, luego vendrá de User.financialProfile
      const tax = totalAmount * taxRate;
      transactionData.viceTaxAmount = tax;

      // Buscar meta "Vice Fund" o crear ahorro en una meta activa
      let viceGoal = await Goal.findOne({ user: req.user.id, $or: [{ isViceFund: true }, { status: 'active' }] }).sort({ isViceFund: -1 }); // Prioriza la marcada como ViceFund
      
      if (viceGoal) {
        viceGoal.currentAmount += tax;
        await viceGoal.save();
        console.log(`[ViceTax] Se añadieron $${tax} a la meta: ${viceGoal.name}`);
      }
    }

    // Guardar transacción
    const transaction = await Transaction.create(transactionData);

    // Lógica 2: Auto-Inventario (Sincronización Despensa)
    // Si es Supermercado y hay items, los movemos a Inventory
    if (type === 'expense' && FOOD_CATEGORIES.includes(category) && items && items.length > 0) {
       const inventoryItems = items.map(item => ({
           user: req.user.id,
           name: item.name,
           quantity: item.quantity || 1,
           price: item.price,
           category: 'perishable', // Asumimos perecedero por defecto para comida
           purchaseDate: transaction.date,
           sourceTransaction: transaction._id,
           estimatedLifeDays: 7 // Default provisional
       }));
       
       if(inventoryItems.length > 0) {
           await Inventory.insertMany(inventoryItems);
           console.log(`[AutoInventory] ${inventoryItems.length} ítems movidos a la despensa.`);
       }
    }

    res.status(201).json({
      success: true,
      data: transaction,
      viceTaxApplied: transaction.viceTaxAmount > 0 ? transactionData.viceTaxAmount : 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener transacciones (con filtros)
 * @route   GET /api/transactions
 * @access  Private
 */
exports.getTransactions = async (req, res) => {
  try {
    // Usamos aggregate para hacer join con Merchants y obtener el logo
    const transactions = await Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
        { $sort: { date: -1 } },
        {
          $lookup: {
            from: 'merchants',         // Nombre de la colección en MongoDB (plural, lowercase)
            localField: 'merchant',    // Campo en Transaction (nombre string)
            foreignField: 'name',      // Campo en Merchant (nombre string)
            as: 'merchantInfo'
          }
        },
        {
          $unwind: { path: '$merchantInfo', preserveNullAndEmptyArrays: true }
        },
        {
          $addFields: {
             merchantLogo: '$merchantInfo.logoUrl'
          }
        },
        {
          $project: {
             merchantInfo: 0 // Limpiar output
          }
        }
    ]);
    
    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Obtener "Dinero Libre" y Estadísticas del Mes (Cash Flow + Crédito Inteligente)
 * @route   GET /api/transactions/stats
 * @access  Private
 * @logic   DineroLibre = Ingresos - (Gastos Directos + Cuotas de Crédito Activas)
 */
exports.getMonthlyStats = async (req, res) => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
        
        // 1. Ingresos y Gastos Directos (Cash/Debit/Transfer) del mes actual
        // Los gastos con crédito NO se suman aquí por el total, sino por cuotas abajo
        const cashStats = await Transaction.aggregate([
            { 
                $match: { 
                    user: new mongoose.Types.ObjectId(req.user.id),
                    date: { $gte: firstDayOfMonth, $lt: nextMonthStart }
                } 
            },
            {
                $group: {
                    _id: null,
                    income: { 
                        $sum: { $cond: [{ $eq: ["$type", "income"] }, "$totalAmount", 0] } 
                    },
                    directExpenses: {
                        $sum: { 
                            $cond: [
                                { $and: [
                                    { $eq: ["$type", "expense"] }, 
                                    { $ne: ["$paymentMethod", "credit"] } 
                                ]}, 
                                "$totalAmount", 
                                0
                            ] 
                        }
                    }
                }
            }
        ]);

        const income = cashStats[0]?.income || 0;
        let expenses = cashStats[0]?.directExpenses || 0;

        // 2. Gastos de Crédito (Cuotas Activas)
        // Buscamos compras a crédito pasadas (hasta 4 años atrás) que sigan vigentes
        const creditTransactions = await Transaction.find({
            user: req.user.id,
            type: 'expense',
            paymentMethod: 'credit',
            date: { $gte: new Date(currentYear - 4, currentMonth, 1) } 
        });

        let creditExpenses = 0;
        const activeInstallments = []; 

        creditTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const totalInstallments = tx.installments?.total || 1;
            
            // Cálculos de índices temporales (Mes absoluto)
            const startMonthIndex = txDate.getFullYear() * 12 + txDate.getMonth();
            const currentMonthIndex = currentYear * 12 + currentMonth;
            const endMonthIndex = startMonthIndex + totalInstallments;

            // Verificar si la deuda está activa en el mes actual
            if (currentMonthIndex >= startMonthIndex && currentMonthIndex < endMonthIndex) {
                const monthlyShare = tx.totalAmount / totalInstallments;
                creditExpenses += monthlyShare;
                
                const currentQuotaNum = (currentMonthIndex - startMonthIndex) + 1;
                
                activeInstallments.push({
                    _id: tx._id,
                    description: tx.merchant || tx.category,
                    current: currentQuotaNum,
                    total: totalInstallments,
                    amount: monthlyShare
                });
            }
        });

        const totalExpenses = expenses + creditExpenses;
        const freeMoney = income - totalExpenses;

        res.status(200).json({
            success: true,
            data: {
                freeMoney,
                income,
                expenses: totalExpenses,
                activeInstallments, 
                savingsTarget: 0
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener Proyecciones de Pagos Futuros (Compromisos)
 * @route   GET /api/transactions/projections
 * @access  Private
 */
exports.getProjections = async (req, res) => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const futureMonths = 6;
        const summary = [];

        const creditTransactions = await Transaction.find({
            user: req.user.id,
            type: 'expense',
            paymentMethod: 'credit',
            date: { $gte: new Date(currentYear - 4, currentMonth, 1) } 
        });

        for (let i = 1; i <= futureMonths; i++) {
            const targetDate = new Date(currentYear, currentMonth + i, 1);
            const targetMonthIndex = targetDate.getFullYear() * 12 + targetDate.getMonth();
            const monthName = targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            
            let monthlyTotal = 0;
            let count = 0;

            creditTransactions.forEach(tx => {
                const txDate = new Date(tx.date);
                const totalInstallments = tx.installments?.total || 1;
                const startMonthIndex = txDate.getFullYear() * 12 + txDate.getMonth();
                const endMonthIndex = startMonthIndex + totalInstallments;

                if (targetMonthIndex >= startMonthIndex && targetMonthIndex < endMonthIndex) {
                    const monthlyShare = tx.totalAmount / totalInstallments;
                    console.log(`📊 Projection: ${tx.merchant || tx.category} - Total: ${tx.totalAmount}, Cuotas: ${totalInstallments}, Mensual: ${monthlyShare}`);
                    monthlyTotal += monthlyShare;
                    count++;
                }
            });

            if (monthlyTotal > 0) {
                 console.log(`📅 ${monthName}: ${monthlyTotal} (${count} pagos)`);
                 summary.push({
                    month: monthName,
                    amount: monthlyTotal,
                    commitmentsCount: count
                });
            }
        }

        res.status(200).json({ success: true, data: summary });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Obtener transacción por ID
 * @route   GET /api/transactions/:id
 * @access  Private
 */
exports.getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
        }

        // Verificar que pertenece al usuario
        if (transaction.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'No autorizado' });
        }

        // Lookup del merchant para obtener logo
        const result = await Transaction.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: 'merchants',
                    localField: 'merchant',
                    foreignField: 'name',
                    as: 'merchantInfo'
                }
            },
            {
                $unwind: { path: '$merchantInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    merchantLogo: '$merchantInfo.logoUrl'
                }
            },
            {
                $project: {
                    merchantInfo: 0
                }
            }
        ]);

        res.status(200).json({ success: true, data: result[0] || transaction });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Actualizar transacción
 * @route   PATCH /api/transactions/:id
 * @access  Private
 */
exports.updateTransaction = async (req, res) => {
    try {
        let transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
        }

        // Verificar que pertenece al usuario
        if (transaction.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'No autorizado' });
        }

        // Campos que se pueden actualizar
        const allowedUpdates = [
            'category',
            'merchant',
            'items',
            'totalAmount',
            'mood',
            'notes',
            'tags',
            'paymentMethod',
            'installments'
        ];

        const updates = {};
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Si se actualizan items, recalcular isVice
        if (updates.category) {
            const isVice = VICE_CATEGORIES.includes(updates.category);
            updates.isVice = isVice;
            if (isVice && transaction.type === 'expense') {
                const taxRate = 0.10;
                updates.viceTaxAmount = transaction.totalAmount * taxRate;
            } else {
                updates.viceTaxAmount = 0;
            }
        }

        transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: transaction });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Actualizar items de una transacción (reconstrucción de detalle)
 * @route   PATCH /api/transactions/:id/items
 * @access  Private
 */
exports.updateTransactionItems = async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, error: 'Items debe ser un array' });
        }

        let transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
        }

        // Verificar que pertenece al usuario
        if (transaction.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'No autorizado' });
        }

        // Actualizar items
        transaction.items = items;

        // Opcional: recalcular totalAmount basado en suma de items
        if (items.length > 0) {
            const calculatedTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
            transaction.totalAmount = calculatedTotal;

            // Recalcular vice tax si aplica
            if (transaction.isVice && transaction.type === 'expense') {
                const taxRate = 0.10;
                transaction.viceTaxAmount = calculatedTotal * taxRate;
            }
        }

        await transaction.save();

        res.status(200).json({ success: true, data: transaction });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Eliminar transacción
 * @route   DELETE /api/transactions/:id
 * @access  Private
 */
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
        }

        // Verificar que pertenece al usuario
        if (transaction.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'No autorizado' });
        }

        // Si la transacción tenía vice tax, revertir el monto de la meta
        if (transaction.isVice && transaction.viceTaxAmount > 0) {
            const viceGoal = await Goal.findOne({
                user: req.user.id,
                title: { $regex: /vicio/i }
            });

            if (viceGoal) {
                viceGoal.currentAmount = Math.max(0, viceGoal.currentAmount - transaction.viceTaxAmount);
                await viceGoal.save();
            }
        }

        await Transaction.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, data: {}, message: 'Transacción eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};
