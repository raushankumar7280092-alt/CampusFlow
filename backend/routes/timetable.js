const express = require('express');
const Timetable = require('../models/Timetable');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const timetable = await Timetable.find().sort({ day: 1, startTime: 1 });
    res.json({ success: true, count: timetable.length, timetable });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { day, subject, teacher, room, startTime, endTime } = req.body;
    const entry = await Timetable.create({ day, subject, teacher, room, startTime, endTime });
    res.status(201).json({ success: true, timetable: entry });
  } catch (error) { next(error); }
});

module.exports = router;
