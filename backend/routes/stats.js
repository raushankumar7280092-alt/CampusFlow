const express = require('express');
const Announcement = require('../models/Announcement');
const Assignment = require('../models/Assignment');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Timetable = require('../models/Timetable');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [announcements, events, registrations, timetableEntries, assignments, pendingAssignments, completedAssignments, eventRegistrationCounts] = await Promise.all([
      Announcement.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments(),
      Timetable.countDocuments(),
      Assignment.countDocuments(),
      Assignment.countDocuments({ status: 'pending' }),
      Assignment.countDocuments({ status: 'completed' }),
      Registration.aggregate([{ $group: { _id: '$eventId', registrations: { $sum: 1 } } }, { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } }, { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, eventId: '$_id', eventTitle: '$event.title', registrations: 1 } }]),
    ]);

    res.json({
      success: true,
      stats: { announcements, events, registrations, timetableEntries, assignments, pendingAssignments, completedAssignments },
      eventRegistrationCounts,
    });
  } catch (error) { next(error); }
});

module.exports = router;
