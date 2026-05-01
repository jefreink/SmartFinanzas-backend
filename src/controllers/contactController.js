const Contact = require('../models/Contact');

exports.createContact = async (req, res) => {
  try {
    const { fullName, username, phone, email, avatar, relation } = req.body;

    if (!fullName) return res.status(400).json({ success: false, message: 'Full name is required' });

    const contact = await Contact.create({
      owner: req.user._id,
      fullName,
      username,
      phone,
      email,
      avatar,
      relation
    });

    res.json({ success: true, data: contact });
  } catch (error) {
    console.error('createContact error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A contact with this email or username already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ owner: req.user._id }).sort({ fullName: 1 });
    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('getContacts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, owner: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (error) {
    console.error('getContactById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const { fullName, username, phone, email, avatar, relation } = req.body;

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { fullName, username, phone, email, avatar, relation },
      { new: true, runValidators: true }
    );

    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (error) {
    console.error('updateContact error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A contact with this email or username already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    console.error('deleteContact error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
