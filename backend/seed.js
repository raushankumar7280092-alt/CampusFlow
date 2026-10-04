require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Announcement = require('./models/Announcement');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const Timetable = require('./models/Timetable');
const Assignment = require('./models/Assignment');

async function seed() {
  try {
    await connectDB();

    await Promise.all([
      Announcement.deleteMany({}), Event.deleteMany({}), Registration.deleteMany({}),
      Timetable.deleteMany({}), Assignment.deleteMany({}),
    ]);

    await Announcement.insertMany([
      { title: 'Semester registration opens', description: 'Course registration for the new semester is open in the student portal through Friday.', priority: 'high' },
      { title: 'Library extended hours', description: 'The central library will remain open until midnight during examination week.', priority: 'medium' },
      { title: 'Campus shuttle update', description: 'The north campus shuttle now departs every 20 minutes from the main gate.', priority: 'low' },
      { title: 'Guest lecture announced', description: 'Join the School of Computing for a talk on responsible artificial intelligence.', priority: 'medium' },
    ]);

    const events = await Event.insertMany([
      { title: 'Innovation and Technology Summit', description: 'A day of talks and workshops with researchers and technology leaders.', date: new Date('2026-10-12T00:00:00.000Z'), time: '10:00 AM', location: 'Auditorium A', capacity: 120 },
      { title: 'Autumn Cultural Festival', description: 'Celebrate campus arts, music, food, and student performances.', date: new Date('2026-10-18T00:00:00.000Z'), time: '4:00 PM', location: 'Central Quad', capacity: 300 },
      { title: 'Career Connections Fair', description: 'Meet employers and alumni offering internships and graduate roles.', date: new Date('2026-10-24T00:00:00.000Z'), time: '11:00 AM', location: 'Student Centre', capacity: 200 },
      { title: 'Research Poster Showcase', description: 'Explore student research across science, engineering, and humanities.', date: new Date('2026-11-03T00:00:00.000Z'), time: '1:30 PM', location: 'Science Building Atrium', capacity: 100 },
    ]);

    await Timetable.insertMany([
      { day: 'Monday', subject: 'Data Structures', teacher: 'Dr. Meera Shah', room: 'CS-204', startTime: '09:00', endTime: '10:30' },
      { day: 'Monday', subject: 'Discrete Mathematics', teacher: 'Prof. Arjun Rao', room: 'B-112', startTime: '11:00', endTime: '12:30' },
      { day: 'Tuesday', subject: 'Database Systems', teacher: 'Dr. Kavita Nair', room: 'CS-Lab 1', startTime: '10:00', endTime: '11:30' },
      { day: 'Wednesday', subject: 'Computer Networks', teacher: 'Prof. Dev Malhotra', room: 'C-301', startTime: '13:00', endTime: '14:30' },
      { day: 'Thursday', subject: 'Software Engineering', teacher: 'Dr. Sana Iqbal', room: 'CS-210', startTime: '09:30', endTime: '11:00' },
    ]);

    await Assignment.insertMany([
      { title: 'Linked List Implementation', subject: 'Data Structures', description: 'Implement and analyze a doubly linked list with unit examples.', dueDate: new Date('2026-10-08T23:59:00.000Z'), status: 'pending' },
      { title: 'ER Diagram Project', subject: 'Database Systems', description: 'Design an ER model for a university course registration system.', dueDate: new Date('2026-10-11T23:59:00.000Z'), status: 'pending' },
      { title: 'Proofs and Relations Set', subject: 'Discrete Mathematics', description: 'Complete exercises on equivalence relations and induction.', dueDate: new Date('2026-10-06T23:59:00.000Z'), status: 'completed' },
      { title: 'Network Protocol Report', subject: 'Computer Networks', description: 'Compare transport-layer reliability approaches with references.', dueDate: new Date('2026-10-15T23:59:00.000Z'), status: 'pending' },
      { title: 'Requirements Specification', subject: 'Software Engineering', description: 'Submit use cases and acceptance criteria for the group project.', dueDate: new Date('2026-10-20T23:59:00.000Z'), status: 'pending' },
    ]);

    await Registration.insertMany([
      { eventId: events[0]._id, studentName: 'Aarav Menon', studentEmail: 'aarav.menon@example.edu' },
      { eventId: events[0]._id, studentName: 'Nisha Kapoor', studentEmail: 'nisha.kapoor@example.edu' },
      { eventId: events[1]._id, studentName: 'Ishaan Verma', studentEmail: 'ishaan.verma@example.edu' },
      { eventId: events[2]._id, studentName: 'Riya Sen', studentEmail: 'riya.sen@example.edu' },
    ]);

    console.log('Seed complete: 4 announcements, 4 events, 5 timetable entries, 5 assignments, and 4 registrations.');
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
