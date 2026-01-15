const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String }, // URL or base64 if needed, or stick to initials
  },
  { timestamps: true }
);

// Prevent duplicate contacts with same email for same user?
ContactSchema.index({ owner: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $ne: '' } } });

module.exports = mongoose.model('Contact', ContactSchema);
