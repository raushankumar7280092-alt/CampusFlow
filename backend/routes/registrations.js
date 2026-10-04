const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const registrations = await Registration.find()
      .populate('eventId', 'title date time location capacity')
      .sort({ registeredAt: -1 });
    res.json({ success: true, count: registrations.length, registrations });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { eventId, studentName, studentEmail } = req.body;
    if (typeof eventId !== 'string' || typeof studentName !== 'string' || typeof studentEmail !== 'string' || !eventId.trim() || !studentName.trim() || !studentEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Validation error', error: 'eventId, studentName, and studentEmail are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return res.status(400).json({ success: false, message: 'Validation error', error: 'studentEmail must be a valid email address' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const normalizedEmail = studentEmail.trim().toLowerCase();
    const existing = await Registration.findOne({ eventId, studentEmail: normalizedEmail });
    if (existing) return res.status(409).json({ success: false, message: 'Student is already registered for this event' });

    const registeredCount = await Registration.countDocuments({ eventId });
    if (registeredCount >= event.capacity) {
      return res.status(409).json({ success: false, message: 'Event capacity has been reached' });
    }

    const registration = await Registration.create({ eventId, studentName, studentEmail: normalizedEmail });
    await registration.populate('eventId', 'title date time location capacity');
    res.status(201).json({ success: true, registration });
  } catch (error) { next(error); }
});

module.exports = router;
