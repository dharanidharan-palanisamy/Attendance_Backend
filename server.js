require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const taskRoutes = require('./routes/tasks');
const leaveRoutes = require('./routes/leave');
const adminRoutes = require('./routes/admin');
const holidayRoutes = require('./routes/holiday');
const seedRoutes = require('./routes/seed');
const payrollRoutes = require('./routes/payroll');
const announcementRoutes = require('./routes/announcements');

const app = express();
const PORT = process.env.PORT || 10000;
let MONGODB_URI = process.env.MONGODB_URI || '';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use((req, res, next) => {
  const allowedOrigin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/holiday', holidayRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/announcements', announcementRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const { MongoMemoryServer } = require('mongodb-memory-server');

async function startServer() {
  try {
    if (!MONGODB_URI && process.env.NODE_ENV !== 'production') {
      const mongod = await MongoMemoryServer.create();
      MONGODB_URI = mongod.getUri();
      console.log('Using in-memory MongoDB for development');
    }

    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
    
    // Auto-seed if database is empty (common with in-memory server restarts)
    const User = require('./models/User');
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      console.log('Database empty, auto-seeding mock data...');
      const bcrypt = require('bcryptjs');
      const Attendance = require('./models/Attendance');
      const Holiday = require('./models/Holiday');

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
      console.log('Auto-seed completed successfully!');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Could not connect to provided MongoDB; falling back to in-memory server failed. Exiting.');
    }
    process.exit(1);
  }
}

startServer();
