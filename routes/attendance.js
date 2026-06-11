const express = require('express');
const multer = require('multer');
const path = require('path');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const User = require('../models/User');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const suffix = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `selfie-${suffix}${ext}`);
  }
});
const upload = multer({ storage });

const todayDate = () => new Date().toISOString().slice(0, 10);
const computeHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, (new Date(checkOut) - new Date(checkIn)) / 3600000);
};

router.post('/checkin', authMiddleware, upload.single('selfie'), async (req, res) => {
  const { location = 'Office' } = req.body;
  const selfiePath = req.file ? `/uploads/${req.file.filename}` : undefined;
  const user = req.user;
  const date = todayDate();
  let attendance = await Attendance.findOne({ employeeId: user.employeeId, date });
  if (!attendance) {
    attendance = new Attendance({
      employeeId: user.employeeId,
      employeeName: user.name,
      department: user.department,
      date,
      location,
      selfie: selfiePath,
      checkIn: new Date().toISOString(),
      status: 'present'
    });
  } else {
    attendance.checkIn = new Date().toISOString();
    attendance.location = location;
    if (selfiePath) attendance.selfie = selfiePath;
    attendance.status = 'present';
  }
  await attendance.save();
  res.json({ attendance });
});

router.post('/checkout', authMiddleware, async (req, res) => {
  const user = req.user;
  const date = todayDate();
  const attendance = await Attendance.findOne({ employeeId: user.employeeId, date });
  if (!attendance || !attendance.checkIn) {
    return res.status(400).json({ error: 'No check-in record found for today' });
  }

  // Enforce that at least one daily task must exist to verify work
  const totalTasks = await Task.countDocuments({
    employeeId: user.employeeId,
    date
  });
  if (totalTasks === 0) {
    return res.status(400).json({ error: 'No daily tasks logged. Please submit a daily work summary proof before checking out.' });
  }

  // Enforce that all logged tasks must be completed
  const remainingTasks = await Task.countDocuments({
    employeeId: user.employeeId,
    date,
    status: { $ne: 'completed' }
  });
  if (remainingTasks > 0) {
    return res.status(400).json({ error: `${remainingTasks} tasks remaining - complete with proof before checkout` });
  }

  attendance.checkOut = new Date().toISOString();
  attendance.hoursWorked = computeHours(attendance.checkIn, attendance.checkOut) - (attendance.totalBreakMinutes / 60);
  await attendance.save();
  res.json({ attendance });
});

router.post('/break/start', authMiddleware, async (req, res) => {
  const user = req.user;
  const date = todayDate();
  const attendance = await Attendance.findOne({ employeeId: user.employeeId, date });
  if (!attendance) {
    return res.status(400).json({ error: 'Check in first before starting a break' });
  }
  attendance.breaks.push({ start: new Date().toISOString(), type: req.body.type || 'break' });
  await attendance.save();
  res.json({ attendance });
});

router.post('/break/end', authMiddleware, async (req, res) => {
  const user = req.user;
  const date = todayDate();
  const attendance = await Attendance.findOne({ employeeId: user.employeeId, date });
  if (!attendance) {
    return res.status(400).json({ error: 'Attendance record not found' });
  }
  const activeBreak = attendance.breaks.find((b) => b.start && !b.end);
  if (!activeBreak) {
    return res.status(400).json({ error: 'No active break found' });
  }
  activeBreak.end = new Date().toISOString();
  const start = new Date(activeBreak.start);
  const end = new Date(activeBreak.end);
  attendance.totalBreakMinutes += Math.round((end - start) / 60000);
  await attendance.save();
  res.json({ attendance });
});

router.get('/today', authMiddleware, async (req, res) => {
  const user = req.user;
  const attendance = await Attendance.findOne({ employeeId: user.employeeId, date: todayDate() });
  res.json({ attendance });
});

router.get('/my', authMiddleware, async (req, res) => {
  const user = req.user;
  const month = req.query.month || todayDate().slice(0, 7);
  const records = await Attendance.find({ employeeId: user.employeeId, date: { $regex: `^${month}` } }).sort({ date: 1 });
  res.json({ records });
});

router.get('/my/summary', authMiddleware, async (req, res) => {
  const user = req.user;
  const month = req.query.month || todayDate().slice(0, 7);
  const records = await Attendance.find({ employeeId: user.employeeId, date: { $regex: `^${month}` } });
  const summary = records.reduce((acc, rec) => {
    acc.present += rec.status === 'present' ? 1 : 0;
    acc.leave += rec.status === 'leave' ? 1 : 0;
    acc.hours += rec.hoursWorked || 0;
    return acc;
  }, { present: 0, leave: 0, hours: 0 });
  summary.avgHours = summary.present ? Number((summary.hours / summary.present).toFixed(2)) : 0;
  res.json({ summary, records });
});

router.get('/all', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.date) filter.date = req.query.date;
  if (req.query.month) filter.date = { $regex: `^${req.query.month}` };
  const records = await Attendance.find(filter).sort({ date: -1 });
  res.json({ records });
});

router.post('/manual', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const { employeeId, employeeName, department, date, status, checkIn, checkOut, notes } = req.body;
  if (!employeeId || !employeeName || !date) {
    return res.status(400).json({ error: 'employeeId, employeeName and date are required' });
  }
  const attendance = new Attendance({
    employeeId,
    employeeName,
    department,
    date,
    status: status || 'present',
    checkIn,
    checkOut,
    notes,
    manualEntry: true,
    enteredBy: req.user.name,
    hoursWorked: checkIn && checkOut ? computeHours(checkIn, checkOut) : 0
  });
  await attendance.save();
  res.json({ attendance });
});

module.exports = router;
