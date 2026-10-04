const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const events = await Event.find().sort({ date: 1, time: 1 });
    res.json({ success: true, count: events.length, events });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, date, time, location, capacity } = req.body;
    const event = await Event.create({ title, description, date, time, location, capacity });
    res.status(201).json({ success: true, event });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, date, time, location, capacity } = req.body;
    const event = await Event.findByIdAndUpdate(req.params.id, { title, description, date, time, location, capacity }, {
      new: true, runValidators: true,
    });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    await Registration.deleteMany({ eventId: event._id });
    res.json({ success: true, message: 'Event deleted', event });
  } catch (error) { next(error); }
});

module.exports = router;
