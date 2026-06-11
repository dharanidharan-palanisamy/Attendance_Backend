const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  leaveType: { type: String, enum: ['casual', 'sick', 'earned', 'emergency', 'half-day'], required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  days: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: String,
  approvedBy: String,
  actionAt: String
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
