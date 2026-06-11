const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'strong-secret-key';
const jwtExpiry = '12h';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: jwtExpiry });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId, department: user.department, designation: user.designation, status: user.status } });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', authMiddleware, async (req, res) => {
  const updates = {};
  const {
    name, phone, currentPassword, newPassword,
    skills, emergencyContact, bankAccount, bloodGroup, dateOfBirth
  } = req.body;

  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (skills !== undefined) updates.skills = skills;
  if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
  if (bankAccount !== undefined) updates.bankAccount = bankAccount;
  if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change password' });
    }
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    updates.password = hash;
  }

  try {
    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
