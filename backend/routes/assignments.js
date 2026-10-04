const express = require('express');
const Assignment = require('../models/Assignment');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const assignments = await Assignment.find().sort({ dueDate: 1 });
    res.json({ success: true, count: assignments.length, assignments });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, subject, description, dueDate, status } = req.body;
    const assignment = await Assignment.create({ title, subject, description, dueDate, status });
    res.status(201).json({ success: true, assignment });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, subject, description, dueDate, status } = req.body;
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, { title, subject, description, dueDate, status }, {
      new: true, runValidators: true,
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, assignment });
  } catch (error) { next(error); }
});

module.exports = router;
