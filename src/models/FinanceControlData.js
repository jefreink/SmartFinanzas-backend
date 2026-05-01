const mongoose = require('mongoose');

const financeItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['subscription', 'debt_i_owe', 'debt_owed_to_me', 'other_income', 'expense', 'savings_goal', 'prepaid_transfer', 'prepaid_expense'],
    required: true
  },
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  person: { type: String, trim: true, default: '' },
  category: { type: String, default: null },
  date: { type: String, default: '' },
  paid: { type: Boolean, default: false }
}, { timestamps: true });

const financeControlDataSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  salary: {
    gross: { type: Number, default: 0 },
    deductions: {
      afp: { type: Number, default: 0 },
      health: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    net: { type: Number, default: 0 }
  },
  items: [financeItemSchema],
  lastMonthTotal: { type: Number, default: 0 }
}, { timestamps: true });

financeControlDataSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('FinanceControlData', financeControlDataSchema);
