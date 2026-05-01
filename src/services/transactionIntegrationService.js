const Goal = require('../models/Goal');
const Inventory = require('../models/Inventory');
const Loan = require('../models/Loan');
const { addPoints } = require('../controllers/gamificationController');

const VICE_CATEGORIES = ['Alcohol', 'Tabaco', 'Fast Food', 'Juegos de Azar', 'Fiesta', 'Vicio', 'Cigarrillos'];

class TransactionIntegrationService {

    static async applyViceTax(transactionData, subtotal, user, session) {
        const userViceCategories = user.financialProfile?.viceCategories || VICE_CATEGORIES;
        if (transactionData.type === 'expense' && userViceCategories.includes(transactionData.category)) {
            transactionData.isVice = true;
            const taxRate = user.financialProfile?.viceTaxRate || 0.10;
            const tax = subtotal * taxRate;
            transactionData.viceTaxAmount = tax;

            let viceGoalQuery = Goal.findOne({ user: user.id, $or: [{ isViceFund: true }, { status: 'active' }] })
                .sort({ isViceFund: -1 });

            if (session) viceGoalQuery = viceGoalQuery.session(session);

            let viceGoal = await viceGoalQuery;

            if (viceGoal) {
                viceGoal.currentAmount += tax;
                await viceGoal.save(session ? { session } : undefined);
                console.log(`[ViceTax] Se añadieron $${tax} a la meta: ${viceGoal.name}`);
            }
        }
    }

    static async createSplitLoans(transaction, splitParticipants, items, tipAmount, session) {
        let debtsCreated = 0;
        if (transaction.isSplit && splitParticipants && splitParticipants.length > 0) {
            const otherParticipants = splitParticipants.filter(p => !p.isMe);

            if (otherParticipants.length > 0) {
                const loansToCreate = otherParticipants.map(participant => ({
                    amount: participant.total,
                    totalAmount: participant.total,
                    borrower: participant.userId || null,
                    contact: participant.contactId || null,
                    borrowerName: participant.name,
                    lender: transaction.user,
                    notes: `División de ${transaction.merchant || transaction.category} - ${splitParticipants.length} participantes`,
                    description: `División de gasto: ${items.map(i => i.name).join(', ')}${tipAmount > 0 ? ' + $' + tipAmount + ' propina' : ''}`,
                    debtType: 'split-bill',
                    sourceTransaction: transaction._id,
                    createdBy: transaction.user,
                    status: 'pending'
                }));

                await Loan.insertMany(loansToCreate, session ? { session } : undefined);
                debtsCreated = loansToCreate.length;
                console.log(`[SplitBill] Se crearon ${debtsCreated} deudas para la transacción dividida`);
            }
        }
        return debtsCreated;
    }

    static async autoSyncInventory(transaction, items, session) {
        let createdInventoryItems = [];
        if (transaction.type === 'expense' && transaction.category === 'Supermercado' && items && items.length > 0 && !transaction.isSplit) {
            const inventoryItems = items.map(item => ({
                user: transaction.user,
                name: item.name,
                quantity: item.quantity || 1,
                price: item.price,
                category: 'perishable',
                purchaseDate: transaction.date,
                sourceTransaction: transaction._id,
                estimatedLifeDays: 7
            }));

            if (inventoryItems.length > 0) {
                createdInventoryItems = await Inventory.insertMany(inventoryItems, session ? { session } : undefined);
                console.log(`[AutoInventory] ${inventoryItems.length} ítems movidos a la despensa.`);
            }
        }
        return createdInventoryItems;
    }

    static triggerGamification(userId) {
        addPoints(userId, 10).catch(console.error);
    }
}

module.exports = TransactionIntegrationService;
