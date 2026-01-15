const Contact = require('../models/Contact');

exports.createContact = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const contact = await Contact.create({
      owner: req.user._id,
      name,
      email,
      avatar
    });

    res.json({ success: true, contact });
  } catch (error) {
    console.error('createContact error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A contact with this email already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ owner: req.user._id }).sort({ name: 1 });
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('getContacts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
