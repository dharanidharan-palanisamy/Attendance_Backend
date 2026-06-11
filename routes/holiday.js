const express = require('express');
const Holiday = require('../models/Holiday');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const holidays = await Holiday.find({ date: { $regex: `^${year}` } }).sort({ date: 1 });
  res.json({ holidays });
});

router.post('/', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const { name, date, type } = req.body;
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }
  const holiday = new Holiday({ name, date, type: type || 'national', createdBy: req.user.name });
  await holiday.save();
  res.json({ holiday });
});

router.put('/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const { name, date, type } = req.body;
  const holiday = await Holiday.findById(req.params.id);
  if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
  holiday.name = name || holiday.name;
  holiday.date = date || holiday.date;
  holiday.type = type || holiday.type;
  await holiday.save();
  res.json({ holiday });
});

router.delete('/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
  res.json({ message: 'Holiday removed' });
});

module.exports = router;
