/**
 * Trip Model
 * Modelo para gestionar viajes compartidos con gastos divididos
 */

const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    destination: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    coverImage: {
      type: String,
      default: null,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        name: {
          type: String,
          required: true,
        },
        avatar: String,
        email: String,
      },
    ],
    expenses: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        description: String,
        amount: Number,
        currency: {
          type: String,
          default: 'USD',
        },
        paidBy: {
          userId: mongoose.Schema.Types.ObjectId,
          name: String,
        },
        splitBetween: [
          {
            userId: mongoose.Schema.Types.ObjectId,
            name: String,
            amount: Number,
          },
        ],
        date: Date,
        category: {
          type: String,
          enum: ['food', 'transport', 'accommodation', 'activities', 'other'],
          default: 'other',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Virtual para calcular balances entre participantes
TripSchema.virtual('balances').get(function() {
  const balances = {};

  // Inicializar balances
  this.participants.forEach((p) => {
    balances[p.userId || p.name] = 0;
  });

  // Calcular balances
  this.expenses.forEach((expense) => {
    const paidByKey = expense.paidBy.userId || expense.paidBy.name;
    balances[paidByKey] = (balances[paidByKey] || 0) + expense.amount;

    expense.splitBetween.forEach((split) => {
      const splitKey = split.userId || split.name;
      balances[splitKey] = (balances[splitKey] || 0) - split.amount;
    });
  });

  return balances;
});

module.exports = mongoose.model('Trip', TripSchema);
