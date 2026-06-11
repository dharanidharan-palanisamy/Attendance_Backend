const express = require('express');
const Announcement = require('../models/Announcement');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();

// GET announcements (all users can see announcements target for them or 'all')
router.get('/', authMiddleware, async (req, res) => {
  try {
    const role = req.user.role;
    // Show announcements targeting 'all' or the user's specific role
    const announcements = await Announcement.find({
      target: { $in: ['all', role] }
    }).sort({ createdAt: -1 });
    
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST announcement (admin & hr only)
router.post('/', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const { title, content, target, date } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = new Announcement({
      title,
      content,
      target: target || 'all',
      date: date || new Date().toISOString().slice(0, 10),
      author: req.user.name
    });

    await announcement.save();
    res.status(201).json({ announcement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE announcement (admin & hr only)
router.delete('/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
