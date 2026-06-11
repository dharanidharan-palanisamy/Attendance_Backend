const express = require('express');
const Leave = require('../models/Leave');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body;
  if (!leaveType || !fromDate || !toDate) {
    return res.status(400).json({ error: 'leaveType, fromDate, and toDate are required' });
  }
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
  const leave = new Leave({
    employeeId: req.user.employeeId,
    employeeName: req.user.name,
    department: req.user.department,
    leaveType,
    fromDate,
    toDate,
    days,
    reason,
    status: 'pending'
  });
  await leave.save();
  res.json({ leave });
});

router.get('/my', authMiddleware, async (req, res) => {
  const leaves = await Leave.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
  res.json({ leaves });
});

router.get('/balance', authMiddleware, async (req, res) => {
  const balance = { casual: 12, sick: 6, earned: 15, emergency: 3, halfDay: 4 };
  const approved = await Leave.find({ employeeId: req.user.employeeId, status: 'approved' });
  approved.forEach((record) => {
    if (record.leaveType === 'casual') balance.casual -= record.days;
    if (record.leaveType === 'sick') balance.sick -= record.days;
    if (record.leaveType === 'earned') balance.earned -= record.days;
    if (record.leaveType === 'emergency') balance.emergency -= record.days;
    if (record.leaveType === 'half-day') balance.halfDay -= record.days;
  });
  res.json({ balance });
});

router.get('/all', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.status = req.query.status;
  const leaves = await Leave.find(filter).sort({ createdAt: -1 });
  res.json({ leaves });
});

router.put('/:id', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  const { status, adminNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });
  leave.status = status;
  leave.adminNote = adminNote || leave.adminNote;
  leave.approvedBy = req.user.name;
  leave.actionAt = new Date().toISOString();
  await leave.save();
  res.json({ leave });
});

module.exports = router;
