const mongoose = require('mongoose');

const userCategorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  categories: [{
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#B0BEC5' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('UserCategory', userCategorySchema);
