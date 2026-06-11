const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const totalEmployees = await User.countDocuments({ role: 'employee' });
  const presentToday = await Attendance.countDocuments({ date: today, status: 'present' });
  const leaveToday = await Attendance.countDocuments({ date: today, status: 'leave' });
  const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
  const totalRecords = await Attendance.countDocuments();
  const averageHours = await Attendance.aggregate([{ $match: { date: today, hoursWorked: { $gt: 0 } } }, { $group: { _id: null, avgHours: { $avg: '$hoursWorked' } } }]);
  res.json({ totalEmployees, presentToday, absentToday: Math.max(0, totalEmployees - presentToday - leaveToday), onLeave: leaveToday, pendingLeaves, avgHoursPerDay: averageHours[0]?.avgHours || 0, totalRecords });
});

router.get('/employees', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { employeeId: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  const employees = await User.find(filter).select('-password').sort({ name: 1 });
  res.json({ employees });
});

router.post('/employees', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const { name, email, phone, employeeId, joinDate, department, designation, role, status, password } = req.body;
  if (!name || !email || !employeeId) {
    return res.status(400).json({ error: 'Name, email, and employeeId are required' });
  }
  const existing = await User.findOne({ $or: [{ email }, { employeeId }] });
  if (existing) {
    return res.status(400).json({ error: 'Email or employee ID already exists' });
  }
  const hash = await bcrypt.hash(password || 'Emp@123', 10);
  const user = new User({ name, email, phone, employeeId, joinDate: joinDate || new Date().toISOString().slice(0, 10), department: department || 'General', designation: designation || 'Staff', role: role || 'employee', status: status || 'active', password: hash });
  await user.save();
  res.json({ user: { ...user.toObject(), password: undefined } });
});

router.put('/employees/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const updates = { ...req.body };
  delete updates.password;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Employee not found' });
  Object.assign(user, updates);
  if (req.body.password) {
    user.password = await bcrypt.hash(req.body.password, 10);
  }
  await user.save();
  res.json({ user: { ...user.toObject(), password: undefined } });
});

router.delete('/employees/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'Employee not found' });
  res.json({ message: 'Employee deleted' });
});

router.get('/reports/department', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const attendance = await Attendance.aggregate([
    { $match: { date: { $regex: `^${month}` } } },
    { $group: { _id: '$department', present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }, leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } }, hours: { $sum: '$hoursWorked' }, count: { $sum: 1 } } },
    { $project: { department: '$_id', present: 1, leave: 1, hours: 1, count: 1, _id: 0 } }
  ]);
  res.json({ departments: attendance });
});

router.get('/reports/employee/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const employeeId = req.params.id;
  const attendance = await Attendance.find({ employeeId }).sort({ date: -1 }).limit(50);
  const tasks = await Task.find({ employeeId }).sort({ date: -1 }).limit(50);
  res.json({ attendance, tasks });
});

module.exports = router;
