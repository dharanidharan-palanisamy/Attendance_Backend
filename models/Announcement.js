const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  target: { type: String, enum: ['all', 'employee', 'manager', 'admin'], default: 'all' },
  author: { type: String, default: 'System Admin' }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
