const express = require('express');
const Announcement = require('../models/Announcement');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const announcements = await Announcement.find().sort({ date: -1 });
    res.json({ success: true, count: announcements.length, announcements });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, date, priority } = req.body;
    const announcement = await Announcement.create({ title, description, date, priority });
    res.status(201).json({ success: true, announcement });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, message: 'Announcement deleted', announcement });
  } catch (error) { next(error); }
});

module.exports = router;
