const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['national', 'festival', 'optional'], default: 'national' },
  createdBy: String
}, { timestamps: true });

holidaySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
