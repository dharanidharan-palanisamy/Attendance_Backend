const express = require('express');
const User = require('../models/User');
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();

// Generate payroll for an employee for a month
router.post('/generate', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const { employeeId, month, bonus = 0, otherDeductions = 0, notes = '' } = req.body;
    if (!employeeId || !month) {
      return res.status(400).json({ error: 'employeeId and month are required' });
    }

    const user = await User.findOne({ employeeId }).select('-password');
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    // Get attendance for the month
    const records = await Attendance.find({ employeeId, date: { $regex: `^${month}` } });
    const presentDays = records.filter(r => r.status === 'present').length;
    const leaveDays = records.filter(r => r.status === 'leave').length;
    const workingDays = new Date(month + '-01');
    const lastDay = new Date(workingDays.getFullYear(), workingDays.getMonth() + 1, 0).getDate();
    const absentDays = Math.max(0, lastDay - presentDays - leaveDays);

    // Calculate pay
    const baseSalary = user.salary || 0;
    const hra = user.allowances?.hra || 0;
    const transport = user.allowances?.transport || 0;
    const medical = user.allowances?.medical || 0;
    const otherAllowances = user.allowances?.other || 0;
    const grossSalary = baseSalary + hra + transport + medical + otherAllowances + Number(bonus);

    const taxRate = user.taxRate || 10;
    const tax = Math.round((grossSalary * taxRate) / 100);
    const pf = Math.round(baseSalary * 0.12);
    const totalDeductions = pf + tax + Number(otherDeductions);
    const netSalary = grossSalary - totalDeductions;

    // Upsert payroll record
    let payroll = await Payroll.findOne({ employeeId, month });
    if (!payroll) {
      payroll = new Payroll({
        employeeId,
        employeeName: user.name,
        department: user.department,
        designation: user.designation,
        month
      });
    }

    Object.assign(payroll, {
      baseSalary, hra, transport, medical, otherAllowances,
      bonus: Number(bonus), grossSalary,
      pf, tax, otherDeductions: Number(otherDeductions),
      totalDeductions, netSalary,
      presentDays, absentDays, leaveDays,
      status: 'processed',
      generatedBy: req.user.name,
      notes
    });

    await payroll.save();
    res.json({ payroll });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all payrolls (admin)
router.get('/all', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const payrolls = await Payroll.find(filter).sort({ month: -1, employeeName: 1 });
    res.json({ payrolls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as paid
router.put('/:id/pay', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });
    payroll.status = 'paid';
    payroll.paidDate = new Date().toISOString().slice(0, 10);
    await payroll.save();
    res.json({ payroll });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my payslips (employee)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const payrolls = await Payroll.find({ employeeId: req.user.employeeId }).sort({ month: -1 });
    res.json({ payrolls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific payslip
router.get('/my/:month', authMiddleware, async (req, res) => {
  try {
    const payroll = await Payroll.findOne({ employeeId: req.user.employeeId, month: req.params.month });
    res.json({ payroll });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
