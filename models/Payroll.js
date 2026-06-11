const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },
  month: { type: String, required: true }, // YYYY-MM
  baseSalary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  transport: { type: Number, default: 0 },
  medical: { type: Number, default: 0 },
  otherAllowances: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  pf: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  leaveDays: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
  paidDate: { type: String, default: '' },
  generatedBy: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
