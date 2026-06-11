const express = require('express');
const multer = require('multer');
const path = require('path');
const Task = require('../models/Task');
const User = require('../models/User');
const { authMiddleware, permit } = require('../middleware/auth');

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const suffix = Date.now();
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `proof-${suffix}${ext}`);
  }
});
const upload = multer({ storage });

// Create / Assign Task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, status, category, estimatedHours, date, employeeId } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    let targetEmpId = req.user.employeeId;
    let targetEmpName = req.user.name;
    let targetDept = req.user.department;

    // Admin, HR, and Manager can assign tasks to other employees
    if (['admin', 'hr', 'manager'].includes(req.user.role) && employeeId) {
      const targetUser = await User.findOne({ employeeId });
      if (!targetUser) {
        return res.status(404).json({ error: 'Assigned employee not found' });
      }
      targetEmpId = targetUser.employeeId;
      targetEmpName = targetUser.name;
      targetDept = targetUser.department;
    }

    const task = new Task({
      employeeId: targetEmpId,
      employeeName: targetEmpName,
      department: targetDept,
      title,
      description,
      priority: priority || 'medium',
      status: status || 'pending',
      category: category || 'other',
      estimatedHours: Number(estimatedHours) || 1,
      date
    });

    await task.save();
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my tasks
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const date = req.query.date;
    const filter = { employeeId: req.user.employeeId };
    if (date) filter.date = date;
    const tasks = await Task.find(filter).sort({ priority: -1, createdAt: 1 });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Task (Employees update their own, Admins/HR/Managers can update any)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const isAdminOrManager = ['admin', 'hr', 'manager'].includes(req.user.role);
    
    const query = { _id: req.params.id };
    if (!isAdminOrManager) {
      query.employeeId = req.user.employeeId;
    }

    const task = await Task.findOneAndUpdate(query, updates, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Task (Employees delete their own, Admins/HR/Managers can delete any)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const isAdminOrManager = ['admin', 'hr', 'manager'].includes(req.user.role);
    
    const query = { _id: req.params.id };
    if (!isAdminOrManager) {
      query.employeeId = req.user.employeeId;
    }

    const task = await Task.findOneAndDelete(query);
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ message: 'Task removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Task Proof / Complete Task
router.post('/upload-proof', authMiddleware, upload.single('proofAttachment'), async (req, res) => {
  try {
    const { taskId, proofNotes } = req.body;
    if (!taskId) return res.status(400).json({ error: 'Task ID is required' });
    const proofAttachment = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    // Employee uploads proof for their own task
    const task = await Task.findOne({ _id: taskId, employeeId: req.user.employeeId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    task.proofNotes = proofNotes || task.proofNotes;
    if (proofAttachment) task.proofAttachment = proofAttachment;
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    await task.save();
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tasks (admin/hr)
router.get('/all', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.month) filter.date = { $regex: `^${req.query.month}` };
    const tasks = await Task.find(filter).sort({ date: -1, priority: 1 });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks summary stats
router.get('/stats', authMiddleware, permit('admin', 'hr'), async (req, res) => {
  try {
    const tasks = await Task.find();
    const totals = tasks.reduce((acc, task) => {
      acc.total += 1;
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, { total: 0, pending: 0, 'in-progress': 0, completed: 0, blocked: 0 });
    res.json({ totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
