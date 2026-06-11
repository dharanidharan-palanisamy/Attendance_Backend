const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  start: String,
  end: String,
  type: { type: String, default: 'break' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  date: { type: String, required: true },
  checkIn: String,
  checkOut: String,
  status: { type: String, enum: ['present', 'leave', 'absent'], default: 'present' },
  hoursWorked: { type: Number, default: 0 },
  totalBreakMinutes: { type: Number, default: 0 },
  selfie: String,
  location: { type: String, default: 'Office' },
  breaks: [breakSchema],
  manualEntry: { type: Boolean, default: false },
  enteredBy: String,
  notes: String
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
