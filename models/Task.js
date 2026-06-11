const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'blocked'], default: 'pending' },
  category: { type: String, enum: ['development', 'design', 'testing', 'meeting', 'documentation', 'support', 'other'], default: 'other' },
  estimatedHours: { type: Number, default: 1 },
  date: { type: String, required: true },
  proofNotes: String,
  proofAttachment: String,
  completedAt: String
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
