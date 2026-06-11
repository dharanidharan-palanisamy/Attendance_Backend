const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'hr', 'manager', 'employee'], default: 'employee' },
  department: { type: String, default: 'General' },
  designation: { type: String, default: 'Staff' },
  employeeId: { type: String, required: true, unique: true },
  joinDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  phone: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'on-leave'], default: 'active' },
  // Extended fields
  salary: { type: Number, default: 0 },
  manager: { type: String, default: '' },
  address: { type: String, default: '' },
  photo: { type: String, default: '' },
  skills: [{ type: String }],
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' }
  },
  bankAccount: {
    accountNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
    ifsc: { type: String, default: '' }
  },
  allowances: {
    hra: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  taxRate: { type: Number, default: 10 },
  bloodGroup: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
