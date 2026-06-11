const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');

const router = express.Router();

const seedStatus = async () => {
  const users = await User.countDocuments();
  const attendances = await Attendance.countDocuments();
  const holidays = await Holiday.countDocuments();
  return { users, attendances, holidays };
};

router.get('/', async (req, res) => {
  const status = await seedStatus();
  res.json({ seeded: status.users > 0, status });
});

router.get('/run', async (req, res) => {
  const key = req.query.key;
  const secret = process.env.SEED_KEY || 'run-seed-123';
  if (key !== secret) {
    return res.status(403).json({ error: 'Invalid seed key' });
  }
  const existing = await User.countDocuments();
  if (existing > 0) {
    return res.status(400).json({ error: 'Database already seeded' });
  }

  const users = [
    { name: 'Super Admin', email: 'admin@jac.com', role: 'admin', department: 'Management', designation: 'CEO', employeeId: 'ADM001', phone: '9000000001', password: 'Admin@123', status: 'active' },
    { name: 'HR Manager', email: 'hr@jac.com', role: 'hr', department: 'Human Resources', designation: 'HR Manager', employeeId: 'HR001', phone: '9000000002', password: 'Hr@123', status: 'active' },
    { name: 'Nina Shah', email: 'nina@jac.com', role: 'employee', department: 'Design', designation: 'UI Designer', employeeId: 'EMP101', phone: '9000000011', password: 'Emp@123', status: 'active' },
    { name: 'Amit Rao', email: 'amit@jac.com', role: 'employee', department: 'Development', designation: 'Frontend Engineer', employeeId: 'EMP102', phone: '9000000012', password: 'Emp@123', status: 'active' },
    { name: 'Priya Singh', email: 'priya@jac.com', role: 'employee', department: 'Support', designation: 'Support Specialist', employeeId: 'EMP103', phone: '9000000013', password: 'Emp@123', status: 'active' },
    { name: 'Sameer Patel', email: 'sameer@jac.com', role: 'employee', department: 'Testing', designation: 'QA Engineer', employeeId: 'EMP104', phone: '9000000014', password: 'Emp@123', status: 'active' }
  ];
  const hashes = await Promise.all(users.map((user) => bcrypt.hash(user.password, 10)));
  await User.insertMany(users.map((user, i) => ({ ...user, password: hashes[i], joinDate: new Date().toISOString().slice(0, 10) })));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 20);
  const attendanceDocs = [];
  users.filter((u) => u.role === 'employee').forEach((employee) => {
    for (let i = 0; i < 20; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const day = date.getDay();
      const formatted = date.toISOString().slice(0, 10);
      const status = day === 0 || day === 6 ? 'leave' : 'present';
      attendanceDocs.push({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        date: formatted,
        status,
        checkIn: status === 'present' ? `${formatted}T09:15:00.000Z` : undefined,
        checkOut: status === 'present' ? `${formatted}T18:00:00.000Z` : undefined,
        hoursWorked: status === 'present' ? 8 : 0,
        totalBreakMinutes: status === 'present' ? 60 : 0,
        selfie: status === 'present' ? '/uploads/selfie-seed.jpg' : undefined,
        location: status === 'present' ? 'Office' : 'WFH'
      });
    }
  });
  await Attendance.insertMany(attendanceDocs);

  const holidays = [
    { name: 'New Year', date: `${new Date().getFullYear()}-01-01`, type: 'national' },
    { name: 'Republic Day', date: `${new Date().getFullYear()}-01-26`, type: 'national' },
    { name: 'Holi', date: `${new Date().getFullYear()}-03-25`, type: 'festival' },
    { name: 'Good Friday', date: `${new Date().getFullYear()}-04-18`, type: 'festival' },
    { name: 'Independence Day', date: `${new Date().getFullYear()}-08-15`, type: 'national' },
    { name: 'Diwali', date: `${new Date().getFullYear()}-11-04`, type: 'festival' },
    { name: 'Christmas', date: `${new Date().getFullYear()}-12-25`, type: 'festival' },
    { name: 'Company Day', date: `${new Date().getFullYear()}-09-10`, type: 'optional' }
  ];
  await Holiday.insertMany(holidays.map((holiday) => ({ ...holiday, createdBy: 'Seed Script' })));

  res.json({ message: 'Seed complete' });
});

module.exports = router;
