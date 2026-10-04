const configuredApiBaseUrl = window.CAMPUSFLOW_CONFIG?.apiBaseUrl?.trim();
const API_BASE_URL = (configuredApiBaseUrl || `${window.location.origin}/api`).replace(/\/$/, '');

const state = {
  announcements: [],
  events: [],
  registrations: [],
  timetable: [],
  assignments: [],
  stats: null,
  selectedEvent: null,
};

const campusLocations = [
  { name: 'Central Library', icon: '▤', tone: '', description: 'Quiet study floors, bookable rooms, research help, and a generous coffee corner.', hours: '<strong>Open today</strong> · 7:00 AM–12:00 AM' },
  { name: 'Computer Labs', icon: '⌘', tone: 'blue', description: 'Coursework-ready machines, specialist software, and lab support on every floor.', hours: '<strong>Open today</strong> · 8:00 AM–10:00 PM' },
  { name: 'Seminar Hall', icon: '▦', tone: 'amber', description: 'A flexible space for guest talks, student presentations, and campus gatherings.', hours: '<strong>By reservation</strong> · Check room schedule' },
  { name: 'North Café', icon: '☕', tone: 'pink', description: 'Fresh lunch, coffee, and plenty of comfortable places to catch up with friends.', hours: '<strong>Open today</strong> · 8:00 AM–6:00 PM' },
  { name: 'Sports Ground', icon: '⚽', tone: 'green', description: 'Outdoor courts and fields for casual games, training, and university clubs.', hours: '<strong>Open today</strong> · 6:00 AM–9:00 PM' },
  { name: 'Administration Office', icon: '⌂', tone: 'teal', description: 'Get help with student records, campus services, and general university enquiries.', hours: '<strong>Open today</strong> · 9:00 AM–5:00 PM' },
];

const notifications = [
  { icon: '▦', tone: '', title: 'Campus event updates', body: 'Check the events page for the latest opportunities to meet and learn.', time: 'On page load', unread: true },
  { icon: '☷', tone: 'amber', title: 'Assignment deadlines', body: 'Your pending assignments and due dates are available in Assignments.', time: 'On page load', unread: true },
  { icon: '▤', tone: 'blue', title: 'Campus announcements', body: 'New bulletin items are fetched from the CampusFlow API.', time: 'On page load', unread: true },
  { icon: '✓', tone: 'green', title: 'Event registration', body: 'A confirmation will appear here after a successful registration.', time: 'On page load', unread: true },
];

const byId = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch {
    throw new Error('Unable to connect to CampusFlow server. Please make sure the backend is running.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

const apiGet = (path) => apiRequest(path);
const apiPost = (path, data) => apiRequest(path, { method: 'POST', body: JSON.stringify(data) });
const apiPut = (path, data) => apiRequest(path, { method: 'PUT', body: JSON.stringify(data) });
const apiDelete = (path) => apiRequest(path, { method: 'DELETE' });

function friendlyError(error) {
  if (!error.status) return error.message;
  if (error.status === 400) return error.payload?.error || 'Please check the information and try again.';
  if (error.status === 404) return error.message || 'That item could not be found.';
  if (error.status === 409) return error.message || 'This request conflicts with existing data.';
  if (error.status >= 500) return 'The server could not complete that request. Please try again.';
  return error.message;
}

function showToast(message, type = 'success') {
  byId('toastMessage').textContent = message;
  byId('toast').classList.toggle('toast-error', type === 'error');
  byId('toast').classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => byId('toast').classList.remove('show'), 4000);
}

function setStateMessage(elementId, message, kind = 'loading') {
  const element = byId(elementId);
  element.innerHTML = `<div class="api-state ${kind}">${escapeHtml(message)}</div>`;
}

function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!date) return 'Date to be announced';
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? 'Date to be announced' : new Intl.DateTimeFormat('en', options).format(value);
}

function renderCurrentDates() {
  const today = new Date();
  const longDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today).toUpperCase();
  const shortDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();
  byId('currentDate').innerHTML = `<span class="sun-icon">☼</span> ${escapeHtml(longDate)}`;
  byId('adminDate').textContent = longDate;
  byId('todayTimetableDate').textContent = shortDate;
}

function eventDateParts(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return { day: '—', month: 'TBA' };
  return { day: String(value.getDate()).padStart(2, '0'), month: new Intl.DateTimeFormat('en', { month: 'short' }).format(value).toUpperCase() };
}

function eventTheme(title = '') {
  const normalized = title.toLowerCase();
  if (normalized.includes('ai') || normalized.includes('cloud')) return { theme: 'ai', category: 'BUILD SOMETHING NEW' };
  if (normalized.includes('hack')) return { theme: 'hack', category: 'MAKE IT HAPPEN' };
  if (normalized.includes('cultural') || normalized.includes('festival')) return { theme: 'culture', category: 'CAMPUS TOGETHER' };
  return { theme: 'tech', category: 'MEET · LEARN · CONNECT' };
}

function loadingAll() {
  setStateMessage('dashboardEvents', 'Loading events...');
  setStateMessage('dashboardAnnouncements', 'Loading announcements...');
  setStateMessage('dashboardTimetable', 'Loading timetable...');
  setStateMessage('dashboardDeadlines', 'Loading assignments...');
  setStateMessage('allAnnouncements', 'Loading announcements...');
  setStateMessage('allEvents', 'Loading events...');
  setStateMessage('timetableRows', 'Loading timetable...');
  setStateMessage('assignmentRows', 'Loading assignments...');
  setStateMessage('adminAnnouncements', 'Loading announcements...');
  setStateMessage('adminEvents', 'Loading events...');
  setStateMessage('adminAssignments', 'Loading assignments...');
  setStateMessage('adminRegistrations', 'Loading registrations...');
}

function renderDashboardEvents() {
  const upcoming = state.events.filter((event) => new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0))).slice(0, 3);
  if (!upcoming.length) return setStateMessage('dashboardEvents', 'No upcoming events yet.', 'empty');
  byId('dashboardEvents').innerHTML = upcoming.map((event) => {
    const date = eventDateParts(event.date);
    return `<article class="mini-event"><div class="date-tile"><span>${date.month}</span><strong>${date.day}</strong></div><div class="mini-event-copy"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.time)} · ${escapeHtml(event.location)}</small></div><span class="mini-event-meta">${Number(event.capacity) || 0} places</span></article>`;
  }).join('');
}

function renderDashboardAnnouncements() {
  if (!state.announcements.length) return setStateMessage('dashboardAnnouncements', 'No announcements have been posted.', 'empty');
  byId('dashboardAnnouncements').innerHTML = state.announcements.slice(0, 3).map((item) => `
    <article class="mini-announcement"><span class="announcement-bar ${escapeHtml(item.priority)}"></span><div class="announcement-content"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description.slice(0, 82))}${item.description.length > 82 ? '…' : ''}</p></div><time>${formatDate(item.date, { month: 'short', day: 'numeric' })}</time></article>`).join('');
}

function renderDashboardTimetable() {
  const today = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date());
  const rows = state.timetable.filter((item) => item.day.toLowerCase() === today.toLowerCase());
  if (!rows.length) return setStateMessage('dashboardTimetable', `No classes scheduled for ${today}.`, 'empty');
  byId('dashboardTimetable').innerHTML = `<div class="schedule-list">${rows.slice(0, 3).map((item) => `
    <div class="schedule-row"><span class="schedule-time">${escapeHtml(item.startTime)}</span><div class="schedule-subject"><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(item.teacher)}</small></div><span class="room-chip">${escapeHtml(item.room)}</span></div>`).join('')}</div>`;
}

function renderDashboardDeadlines() {
  const pending = state.assignments.filter((item) => item.status === 'pending').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
  if (!pending.length) return setStateMessage('dashboardDeadlines', 'You are all caught up.', 'empty');
  byId('dashboardDeadlines').innerHTML = `<div class="deadline-list">${pending.map((item) => `
    <div class="deadline-row"><span class="deadline-date">${formatDate(item.dueDate, { month: 'short', day: 'numeric' })}</span><div class="deadline-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subject)} · Due ${formatDate(item.dueDate)}</small></div>${isDueSoon(item.dueDate) ? '<span class="due-soon">Due soon</span>' : ''}</div>`).join('')}</div>`;
}

function isDueSoon(date) {
  const days = (new Date(date) - new Date()) / 86400000;
  return days >= 0 && days <= 10;
}

function renderAnnouncements(search = '') {
  const items = state.announcements.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase()));
  if (!items.length) return setStateMessage('allAnnouncements', search ? 'No announcements match your search.' : 'No announcements have been posted yet.', 'empty');
  byId('allAnnouncements').innerHTML = items.map((item) => `
    <article class="announcement-card"><span class="announcement-bar ${escapeHtml(item.priority)}"></span><div class="announcement-card-content"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="announcement-card-meta"><time>${formatDate(item.date)}</time><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></div></div></article>`).join('');
}

function eventCard(event, admin = false) {
  const date = eventDateParts(event.date);
  const visual = eventTheme(event.title);
  const actions = admin ? `<button class="button button-soft action-button" data-edit-event="${escapeHtml(event._id)}">Edit</button><button class="button button-danger action-button" data-delete-event="${escapeHtml(event._id)}">Delete</button>` : `<button class="button button-primary register-button" type="button" data-register="${escapeHtml(event._id)}">Register <span>→</span></button>`;
  return `<article class="event-card"><div class="event-cover ${visual.theme}"><span class="cover-label">${visual.category}</span><span class="cover-date"><small>${date.month}</small><strong>${date.day}</strong></span></div><div class="event-card-content"><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p><div class="event-details"><span>◷ ${formatDate(event.date)} · ${escapeHtml(event.time)}</span><span>⌖ ${escapeHtml(event.location)}</span></div><div class="event-card-bottom"><span class="capacity-text">Capacity: ${Number(event.capacity) || 0}</span><div class="event-actions">${actions}</div></div></div></article>`;
}

function renderEvents(search = '') {
  const items = state.events.filter((event) => `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(search.toLowerCase()));
  if (!items.length) return setStateMessage('allEvents', search ? 'No events match your search.' : 'No events are scheduled yet.', 'empty');
  byId('allEvents').innerHTML = items.map((event) => eventCard(event)).join('');
}

function renderTimetable() {
  if (!state.timetable.length) return setStateMessage('timetableRows', 'No timetable entries have been added.', 'empty');
  byId('timetableRows').innerHTML = state.timetable.map((item, index) => `<tr><td>${escapeHtml(item.day)}</td><td>${escapeHtml(item.startTime)} – ${escapeHtml(item.endTime)}</td><td><span class="subject-cell"><span class="subject-dot ${['violet', 'blue', 'green', 'orange'][index % 4]}"></span>${escapeHtml(item.subject)}</span></td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.room)}</td></tr>`).join('');
}

function renderAssignments(filter = 'all') {
  byId('assignmentAllCount').textContent = String(state.assignments.length);
  byId('assignmentPendingCount').textContent = String(state.assignments.filter((item) => item.status === 'pending').length);
  byId('assignmentCompletedCount').textContent = String(state.assignments.filter((item) => item.status === 'completed').length);
  const items = state.assignments.filter((item) => filter === 'all' || item.status === filter).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (!items.length) return setStateMessage('assignmentRows', 'No assignments to show.', 'empty');
  byId('assignmentRows').innerHTML = items.map((item) => `<tr><td>${escapeHtml(item.title)}<br><small>${escapeHtml(item.description)}</small>${item.status === 'pending' && isDueSoon(item.dueDate) ? '<span class="due-soon assignment-due-soon">Due soon</span>' : ''}</td><td>${escapeHtml(item.subject)}</td><td>${formatDate(item.dueDate)}</td><td><span class="status-badge ${escapeHtml(item.status)}">${item.status === 'pending' ? 'Pending' : 'Completed'}</span></td></tr>`).join('');
}

function renderCampus() {
  byId('campusCards').innerHTML = campusLocations.map((place) => `<article class="campus-card"><span class="campus-icon ${place.tone}">${place.icon}</span><h3>${place.name}</h3><p>${place.description}</p><div class="campus-hours">${place.hours}</div></article>`).join('');
}

function renderNotifications() {
  byId('notificationNavCount').textContent = String(notifications.filter((item) => item.unread).length);
  byId('notificationList').innerHTML = notifications.map((item, index) => `<article class="notification-row ${item.unread ? 'unread' : ''}" data-notification="${index}" tabindex="0"><span class="notification-symbol ${item.tone}">${item.icon}</span><div class="notification-copy"><strong>${item.title}</strong><p>${item.body}</p><time>${item.time}</time></div>${item.unread ? '<i class="unread-dot" aria-label="Unread"></i>' : ''}</article>`).join('');
}

function renderDashboardStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = state.events.filter((event) => new Date(event.date) >= today).length;
  const pending = state.assignments.filter((item) => item.status === 'pending').length;
  byId('studentUpcomingCount').textContent = String(upcoming).padStart(2, '0');
  byId('studentUpcomingFoot').textContent = upcoming ? `${upcoming} upcoming on campus` : 'No upcoming events yet';
  byId('studentPendingCount').textContent = String(pending).padStart(2, '0');
  byId('studentPendingFoot').textContent = pending ? `${pending} assignments to complete` : 'You are all caught up';
  byId('studentAnnouncementsCount').textContent = String(state.announcements.length).padStart(2, '0');
  byId('announcementNavCount').textContent = String(state.announcements.length);
  byId('studentRegistrationsCount').textContent = String(state.stats?.stats?.registrations ?? state.registrations.length).padStart(2, '0');
}

function renderAdminStats() {
  if (!state.stats) return;
  const stats = state.stats.stats;
  const values = document.querySelectorAll('.admin-stats .stat-value');
  const mapping = [stats.events, stats.registrations, stats.announcements, stats.pendingAssignments];
  values.forEach((element, index) => { element.textContent = String(mapping[index] ?? 0).padStart(2, '0'); });
}

function renderAdminLists() {
  byId('adminAnnouncements').innerHTML = state.announcements.length ? state.announcements.map((item) => `<div class="admin-manage-row"><div><strong>${escapeHtml(item.title)}</strong><small>${formatDate(item.date)} · ${escapeHtml(item.priority)}</small></div><button class="button button-danger action-button" data-delete-announcement="${escapeHtml(item._id)}">Delete</button></div>`).join('') : '<div class="api-state empty">No announcements have been posted.</div>';
  byId('adminEvents').innerHTML = state.events.length ? state.events.map((item) => `<div class="admin-manage-row"><div><strong>${escapeHtml(item.title)}</strong><small>${formatDate(item.date)} · ${escapeHtml(item.location)}</small></div><div class="manage-actions"><button class="button button-soft action-button" data-edit-event="${escapeHtml(item._id)}">Edit</button><button class="button button-danger action-button" data-delete-event="${escapeHtml(item._id)}">Delete</button></div></div>`).join('') : '<div class="api-state empty">No events have been added.</div>';
  byId('adminAssignments').innerHTML = state.assignments.length ? state.assignments.map((item) => `<div class="admin-manage-row"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subject)} · Due ${formatDate(item.dueDate)}</small></div><button class="button button-soft action-button" data-toggle-assignment="${escapeHtml(item._id)}" data-next-status="${item.status === 'pending' ? 'completed' : 'pending'}">Mark ${item.status === 'pending' ? 'complete' : 'pending'}</button></div>`).join('') : '<div class="api-state empty">No assignments have been added.</div>';
  if (!state.registrations.length) {
    byId('adminRegistrations').innerHTML = '<div class="api-state empty">No event registrations yet.</div>';
  } else {
    byId('adminRegistrations').innerHTML = `<div class="table-scroll"><table><thead><tr><th>STUDENT</th><th>EMAIL</th><th>EVENT</th><th>REGISTERED</th></tr></thead><tbody>${state.registrations.map((item) => `<tr><td>${escapeHtml(item.studentName)}</td><td>${escapeHtml(item.studentEmail)}</td><td>${escapeHtml(item.eventId?.title || 'Event removed')}</td><td>${formatDate(item.registeredAt)}</td></tr>`).join('')}</tbody></table></div>`;
  }
}

function renderAll() {
  renderDashboardEvents();
  renderDashboardAnnouncements();
  renderDashboardTimetable();
  renderDashboardDeadlines();
  renderAnnouncements(byId('announcementSearch').value);
  renderEvents(byId('eventSearch').value);
  renderTimetable();
  const selectedFilter = document.querySelector('[data-filter].selected')?.dataset.filter || 'all';
  renderAssignments(selectedFilter);
  renderDashboardStats();
  renderAdminStats();
  renderAdminLists();
}

async function refreshData({ quiet = false } = {}) {
  if (!quiet) loadingAll();
  const resources = [
    ['announcements', '/announcements', 'announcements'],
    ['events', '/events', 'events'],
    ['registrations', '/registrations', 'registrations'],
    ['timetable', '/timetable', 'timetable'],
    ['assignments', '/assignments', 'assignments'],
    ['stats', '/stats', null],
  ];
  const results = await Promise.allSettled(resources.map(([, path]) => apiGet(path)));
  const errors = [];
  const failedResources = new Map();
  results.forEach((result, index) => {
    const [key, , field] = resources[index];
    if (result.status === 'fulfilled') state[key] = field ? result.value[field] || [] : result.value;
    else {
      errors.push(result.reason);
      failedResources.set(key, result.reason);
      if (key === 'stats') state.stats = null;
    }
  });
  renderAll();
  const messages = {
    announcements: ['allAnnouncements', 'dashboardAnnouncements', 'adminAnnouncements'],
    events: ['allEvents', 'dashboardEvents', 'adminEvents'],
    timetable: ['timetableRows', 'dashboardTimetable'],
    assignments: ['assignmentRows', 'dashboardDeadlines', 'adminAssignments'],
    registrations: ['adminRegistrations'],
  };
  failedResources.forEach((error, key) => (messages[key] || []).forEach((id) => setStateMessage(id, friendlyError(error), 'error')));
  if (errors.length && !quiet) showToast(friendlyError(errors[0]), 'error');
  if (!errors.length) byId('connectionStatus').textContent = 'Connected to campus data';
  else byId('connectionStatus').textContent = 'Some campus data could not be loaded';
}

function navigate(section) {
  const target = byId(`section-${section}`) || byId(section);
  if (!target) return;
  document.querySelectorAll('.page-section').forEach((page) => page.classList.remove('is-visible'));
  target.classList.add('is-visible');
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.nav === section));
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeMobileMenu() {
  byId('sidebar').classList.remove('open');
  byId('sidebarScrim').classList.remove('visible');
  byId('menuToggle').setAttribute('aria-expanded', 'false');
  byId('menuToggle').setAttribute('aria-label', 'Open navigation');
}

let previouslyFocused;
function openRegistration(eventId) {
  const event = state.events.find((item) => item._id === eventId);
  if (!event) return showToast('That event is no longer available. Refresh and try again.', 'error');
  state.selectedEvent = event;
  const modal = byId('registrationModal');
  byId('modalEventName').textContent = event.title;
  byId('registrationForm').reset();
  byId('registrationSuccess').classList.remove('visible');
  byId('registrationSuccess').classList.remove('registration-error');
  byId('nameError').textContent = '';
  byId('emailError').textContent = '';
  previouslyFocused = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  byId('studentName').focus();
}

function closeRegistration() {
  const modal = byId('registrationModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (previouslyFocused) previouslyFocused.focus();
}

async function submitRegistration(event) {
  event.preventDefault();
  const name = byId('studentName');
  const email = byId('studentEmail');
  byId('nameError').textContent = name.value.trim().length < 2 ? 'Please enter your full name.' : '';
  byId('emailError').textContent = email.validity.valid ? '' : 'Please enter a valid email address.';
  if (name.value.trim().length < 2 || !email.validity.valid || !state.selectedEvent) return;
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Registering…';
  try {
    await apiPost('/registrations', { eventId: state.selectedEvent._id, studentName: name.value.trim(), studentEmail: email.value.trim() });
    notifications.unshift({ icon: '✓', tone: 'green', title: 'Event registration confirmed', body: `Your place at ${state.selectedEvent.title} is confirmed.`, time: 'Just now', unread: true });
    renderNotifications();
    closeRegistration();
    byId('registrationForm').reset();
    await refreshData({ quiet: true });
    showToast('Registration confirmed. You’re on the list.');
  } catch (error) {
    const message = error.status === 409
      ? ((error.message || '').toLowerCase().includes('capacity') ? 'This event has reached its registration capacity.' : 'You are already registered for this event.')
      : friendlyError(error);
    byId('registrationSuccess').textContent = message;
    byId('registrationSuccess').classList.add('visible');
    byId('registrationSuccess').classList.toggle('registration-error', error.status !== undefined);
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Confirm registration <span>→</span>';
  }
}

async function handleAdminForm(form) {
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const action = form.dataset.adminAction;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    if (action === 'announcement') await apiPost('/announcements', values);
    if (action === 'event') await apiPost('/events', { ...values, capacity: Number(values.capacity), date: new Date(`${values.date}T00:00:00`).toISOString() });
    if (action === 'assignment') await apiPost('/assignments', { ...values, dueDate: new Date(`${values.dueDate}T00:00:00`).toISOString() });
    if (action === 'timetable') await apiPost('/timetable', values);
    form.reset();
    await refreshData({ quiet: true });
    showToast(`${action[0].toUpperCase()}${action.slice(1)} added successfully.`);
  } catch (error) {
    showToast(friendlyError(error), 'error');
  } finally {
    submit.disabled = false;
  }
}

async function deleteAnnouncement(id) {
  const item = state.announcements.find((entry) => entry._id === id);
  if (!item || !window.confirm(`Delete “${item.title}”?`)) return;
  try {
    await apiDelete(`/announcements/${encodeURIComponent(id)}`);
    await refreshData({ quiet: true });
    showToast('Announcement deleted.');
  } catch (error) { showToast(friendlyError(error), 'error'); }
}

async function deleteEvent(id) {
  const item = state.events.find((entry) => entry._id === id);
  if (!item || !window.confirm(`Delete “${item.title}”? Existing registrations for this event will also be removed.`)) return;
  try {
    await apiDelete(`/events/${encodeURIComponent(id)}`);
    await refreshData({ quiet: true });
    showToast('Event and its registrations deleted.');
  } catch (error) { showToast(friendlyError(error), 'error'); }
}

async function editEvent(id) {
  const item = state.events.find((entry) => entry._id === id);
  if (!item) return;
  const title = window.prompt('Event title', item.title);
  if (title === null) return;
  const description = window.prompt('Event description', item.description);
  if (description === null) return;
  const date = window.prompt('Event date (YYYY-MM-DD)', new Date(item.date).toISOString().slice(0, 10));
  if (date === null) return;
  const time = window.prompt('Event time', item.time);
  if (time === null) return;
  const location = window.prompt('Event location', item.location);
  if (location === null) return;
  const capacity = Number(window.prompt('Capacity', String(item.capacity)));
  if (!Number.isFinite(capacity) || capacity < 1) return showToast('Capacity must be at least 1.', 'error');
  try {
    await apiPut(`/events/${encodeURIComponent(id)}`, { title, description, date: new Date(`${date}T00:00:00`).toISOString(), time, location, capacity });
    await refreshData({ quiet: true });
    showToast('Event updated successfully.');
  } catch (error) { showToast(friendlyError(error), 'error'); }
}

async function toggleAssignment(id, status) {
  const item = state.assignments.find((entry) => entry._id === id);
  if (!item) return;
  try {
    await apiPut(`/assignments/${encodeURIComponent(id)}`, { status });
    await refreshData({ quiet: true });
    showToast('Assignment status updated.');
  } catch (error) { showToast(friendlyError(error), 'error'); }
}

document.addEventListener('click', (event) => {
  const navButton = event.target.closest('[data-nav]');
  if (navButton) navigate(navButton.dataset.nav);
  const registerButton = event.target.closest('[data-register]');
  if (registerButton) openRegistration(registerButton.dataset.register);
  const deleteAnnouncementButton = event.target.closest('[data-delete-announcement]');
  if (deleteAnnouncementButton) deleteAnnouncement(deleteAnnouncementButton.dataset.deleteAnnouncement);
  const deleteEventButton = event.target.closest('[data-delete-event]');
  if (deleteEventButton) deleteEvent(deleteEventButton.dataset.deleteEvent);
  const editEventButton = event.target.closest('[data-edit-event]');
  if (editEventButton) editEvent(editEventButton.dataset.editEvent);
  const assignmentButton = event.target.closest('[data-toggle-assignment]');
  if (assignmentButton) toggleAssignment(assignmentButton.dataset.toggleAssignment, assignmentButton.dataset.nextStatus);
  if (event.target.closest('.modal-close') || event.target.id === 'cancelRegistration') closeRegistration();
  if (event.target.id === 'toastClose') byId('toast').classList.remove('show');
  const notification = event.target.closest('[data-notification]');
  if (notification) {
    const item = notifications[Number(notification.dataset.notification)];
    item.unread = false;
    renderNotifications();
    showToast('Notification marked as read');
  }
  if (event.target.id === 'sidebarScrim') closeMobileMenu();
  if (event.target.id === 'mapButton') showToast('Campus map preview is coming soon');
  if (event.target.id === 'weekButton') showToast('Showing your current week');
  if (event.target.id === 'registrationDetails') refreshData().then(() => showToast('Campus data refreshed.'));
});

document.addEventListener('keydown', (event) => {
  const modal = byId('registrationModal');
  if (event.key === 'Escape' && modal.classList.contains('open')) closeRegistration();
  if (event.key === 'Tab' && modal.classList.contains('open')) {
    const focusable = [...modal.querySelectorAll('button,input')].filter((element) => !element.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  const notification = event.target.closest('[data-notification]');
  if (notification && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); notification.click(); }
});

byId('menuToggle').addEventListener('click', () => {
  const isOpen = byId('sidebar').classList.toggle('open');
  byId('sidebarScrim').classList.toggle('visible', isOpen);
  byId('menuToggle').setAttribute('aria-expanded', String(isOpen));
  byId('menuToggle').setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

byId('registrationForm').addEventListener('submit', submitRegistration);
document.querySelectorAll('[data-admin-action]').forEach((form) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  handleAdminForm(form);
}));
byId('announcementSearch').addEventListener('input', (event) => renderAnnouncements(event.target.value));
byId('eventSearch').addEventListener('input', (event) => renderEvents(event.target.value));
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('selected', item === button));
  renderAssignments(button.dataset.filter);
}));
byId('markRead').addEventListener('click', () => {
  notifications.forEach((item) => { item.unread = false; });
  renderNotifications();
  showToast('All notifications marked as read');
});
byId('toastClose').addEventListener('click', () => byId('toast').classList.remove('show'));
byId('brandLogo').addEventListener('load', () => byId('brandLogo').parentElement.classList.add('logo-loaded'));
byId('brandLogo').addEventListener('error', () => byId('brandFallback').textContent = 'CF');

renderCampus();
renderNotifications();
renderCurrentDates();
loadingAll();
refreshData();
