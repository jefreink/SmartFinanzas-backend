const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    username: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String }, // URL or base64 if needed
    relation: { type: String, trim: true, default: 'friend' }, // friend, family, colleague, other
  },
  { timestamps: true }
);

// Prevent duplicate contacts with same email for same user
ContactSchema.index({ owner: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $ne: '' } } });
ContactSchema.index({ owner: 1, username: 1 }, { unique: true, partialFilterExpression: { username: { $exists: true, $ne: '' } } });

module.exports = mongoose.model('Contact', ContactSchema);
