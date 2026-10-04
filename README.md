# CampusFlow — Smart University Management System

CampusFlow is a full-stack campus information platform for students and administrators. It brings campus announcements, events, event registration, timetable and classroom details, assignments, and administration into one responsive interface.

## Features

- Student dashboard with announcements, upcoming events, timetable, deadlines, and campus statistics
- Event details and MongoDB-backed student registration
- Duplicate registration and event capacity validation
- Admin dashboard for announcements, events, assignments, and registration review
- REST API backed by MongoDB and Mongoose

## Technology and architecture

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express.js, REST API
- Database: MongoDB with Mongoose
- Production layout: public static frontend hosting → public Node.js/Express API hosting → MongoDB Atlas

The frontend uses a same-origin `/api` base by default. If frontend and backend are deployed on separate origins, set `window.CAMPUSFLOW_CONFIG.apiBaseUrl` in `frontend/js/config.js` to the public backend origin followed by `/api`. This URL is public configuration; never put database credentials or other secrets in frontend files.

## Local setup

Requirements: Node.js, npm, and a running local MongoDB instance.

```powershell
cd CampusFlow/backend
npm install
Copy-Item .env.example .env
npm start
```

The example MongoDB value is a placeholder. For local development, set `MONGODB_URI=mongodb://127.0.0.1:27017/campusflow` in the untracked `backend/.env` file. The app is served at `http://localhost:5000/`; API health and database status are at `/api/health` and `/api/db-status`.

Development commands from `backend/`:

- `npm start` — start the server
- `npm run dev` — start with nodemon
- `npm run seed` — replace CampusFlow collections with demo data; this is destructive to existing data and should only be run intentionally

## Environment variables

Set these in the backend hosting provider's environment settings for production. Do not commit `.env`.

| Variable | Purpose |
|---|---|
| `PORT` | Port supplied by the host (the app defaults to 5000 locally) |
| `MONGODB_URI` | Private connection string for MongoDB Atlas or another reachable MongoDB deployment |
| `FRONTEND_ORIGINS` | Comma-separated public frontend origins allowed to call the API, such as `https://your-site.example` |
| `NODE_ENV` | Set to `production` on the backend host to enforce production CORS allowlisting |

Copy `backend/.env.example` as a template. It contains placeholders only. Never publish a MongoDB URI, Atlas password, or other credentials. Do not use the developer's local MongoDB as a public production database.

## Production deployment

1. Create a MongoDB Atlas cluster (or another hosted MongoDB service), configure a database user and network access, then store its connection string only as the backend's `MONGODB_URI` secret.
2. Deploy `backend/` as a Node.js web service. Set `PORT` as required by the host, `NODE_ENV=production`, and `FRONTEND_ORIGINS` to the exact frontend origin(s).
3. Deploy `frontend/` as a static site. Set `apiBaseUrl` in `frontend/js/config.js` to `https://<deployed-backend-domain>/api` before building/uploading the static files.
4. Verify the public `/api/health`, `/api/db-status`, and core data routes, then complete an event-registration demo on the deployed frontend.

No public deployment is currently configured. The API does not include authentication; protect the demo from public writes or add access control before treating it as a production service.

## API overview

- `GET /api/health`, `GET /api/db-status`
- `/api/announcements`: `GET`, `POST`, `DELETE /:id`
- `/api/events`: `GET`, `POST`, `PUT /:id`, `DELETE /:id`
- `/api/registrations`: `GET`, `POST`
- `/api/timetable`: `GET`, `POST`
- `/api/assignments`: `GET`, `POST`, `PUT /:id`
- `GET /api/stats`

## Demo flow

Review dashboard information, open an event, register a student, confirm duplicate protection, check timetable and assignment status, then use the admin dashboard to manage an event and inspect registrations/statistics.

## Known limitations

- There is no authentication or authorization; the admin interface is a demo UI, not a secured admin system.
- Capacity is checked before registration insertion, so simultaneous requests could exceed event capacity.
- Campus information and notifications are currently frontend-provided demo content.
- Production hosting, a public frontend/backend URL, and a GitHub repository have not been set up.
