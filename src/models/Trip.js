const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  destination: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  budget: { type: Number, default: 0 },
  currency: { type: String, default: 'CLP' },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If they are a registered user
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }, // If they are a contact
    name: { type: String }, // Fallback name
    isMe: { type: Boolean, default: false }
  }],
  description: { type: String },
  coverImage: { type: String } // URL for trip cover
}, { timestamps: true });

// Virtual for duration?
TripSchema.virtual('durationDays').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Trip', TripSchema);
