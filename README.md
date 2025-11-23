# Attendance Tracker

Full-stack attendance tracker built with Node.js, Express, MongoDB, and a lightweight MVC layout. Anyone can create session reports from the public form, while admins (with credentials) manage the student roster.

## Features

- Public session form: capture metadata (title, date, time, overview) and toggle attendance from the managed student list.
- Session reports: saved to MongoDB and available via shareable `/sessions/:id` URLs with print-friendly styling.
- Admin portal: login-protected student directory for adding and editing students.
- REST API: `/api/students` for active roster, `/api/sessions` for new session submissions.

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or hosted)

### Installation

```bash
npm install
cp env.sample .env
```

Fill `.env` with your Mongo URI, session secret, and desired admin credentials.

### Development

```bash
npm run dev
```

Visit:

- `http://localhost:4000` – public session form
- `http://localhost:4000/batch-manager.html` – admin portal

### Production

```bash
npm start
```

## Environment Variables

| Variable         | Description                                |
| ---------------- | ------------------------------------------ |
| `MONGODB_URI`    | Connection string for MongoDB              |
| `SESSION_SECRET` | Secret used to sign Express sessions       |
| `ADMIN_USERNAME` | Username for admin login                   |
| `ADMIN_PASSWORD` | Password for admin login                   |
| `PORT`           | Optional; defaults to `4000`               |

## Project Structure

```
src/
  config/db.js           # Database connection
  controllers/           # Auth, student, session controllers
  middlewares/           # Admin guard
  models/                # Student & Session schemas
  routes/                # Admin/API/session routes
  server.js              # Express bootstrap
public/                  # Static assets (HTML, CSS, JS)
env.sample               # Environment template
```

## Scripts

- `npm run dev` – Run server with Nodemon
- `npm start` – Run server in production mode

## Future Ideas

- CSV export of session reports
- Bulk student import
- Attendance analytics dashboards

