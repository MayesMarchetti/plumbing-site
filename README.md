# Plumbing Site and Appointment Booking Platform

A full-stack web app for a plumbing business. Customers request appointments from
the public site; staff manage each request through its lifecycle
(**pending → confirmed → completed**) from a password-protected admin dashboard.

> Stock template. All company name, contact details, imagery, and copy are
> placeholders (`Plumbing Co.`, `(555) 555-5555`, `info@example.com`,
> `images/placeholder*.svg`, `[year]`, `#00000000`) meant to be replaced with real
> branding before launch.

## Features

- **Public marketing site** — static, responsive, no framework (`public/`).
- **Online booking** — `POST /api/appointments/request` creates an appointment,
  emails the customer a confirmation, and alerts the business by email.
- **Admin dashboard** (`/admin`) — list appointments by status, confirm them
  (setting a scheduled time), and mark them complete with job details.
- **Google Calendar integration** — confirming an appointment patches its
  Google Calendar event with the scheduled time and customer details.
- **Completed-jobs reporting** — filter by employee, service type, or price
  range, and export the results to an `.xlsx` file.
- **Graceful degradation** — email and calendar integrations log a warning and
  no-op when their environment variables are not set; core booking still works.

## Tech stack

| Area        | Choice                                   |
|-------------|------------------------------------------|
| Runtime     | Node.js, Express 5                       |
| Database    | PostgreSQL via Supabase                  |
| Email       | Resend                                   |
| Calendar    | Google Calendar API (service account)    |
| Reports     | ExcelJS                                  |
| Auth        | HTTP Basic Auth (admin routes)           |

## Architecture

```
server.js              Express app, static hosting, /api/book
routes/                HTTP layer
  appointments.js        /api/appointments  (public /request + admin CRUD, /confirm, /complete)
  completedJobs.js       /api/completed-jobs  (list + /export)
models/
  appointmentModel.js    Supabase data access; status + field-update whitelisting
services/
  emailNotifier.js       Resend: customer confirmation + staff notification
  googleCalendar.js       Google Calendar event updates
  icsInvite.js            .ics invite builder
  completionLog.js        completed_jobs table + Excel export
middleware/
  basicAuth.js           admin authentication
db/
  schema.sql             Supabase schema (run once in the SQL editor)
  supabaseClient.js      configured client
admin/index.html         admin dashboard (vanilla JS)
public/                  marketing site
```

## Local setup

```bash
npm install
cp .env.example .env      # then fill in the values
# run db/schema.sql in the Supabase SQL editor
npm run dev               # nodemon, http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | no (default 3000) | server port |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | yes | database |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | yes | admin login |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `BOOKING_NOTIFY_EMAIL` | for email | booking emails |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` / `GOOGLE_CALENDAR_ID` | for calendar | Google Calendar sync |

## API

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/api/appointments/request` | public | customer books an appointment |
| `GET` | `/api/appointments?status=` | admin | list appointments |
| `GET` | `/api/appointments/:id` | admin | one appointment |
| `PATCH` | `/api/appointments/:id` | admin | update fields |
| `POST` | `/api/appointments/:id/confirm` | admin | set confirmed time, update calendar |
| `POST` | `/api/appointments/:id/complete` | admin | mark complete, log the job |
| `DELETE` | `/api/appointments/:id` | admin | delete |
| `GET` | `/api/completed-jobs?employee=&serviceType=&minAmount=&maxAmount=` | admin | filtered job log |
| `GET` | `/api/completed-jobs/export` | admin | download `.xlsx` |
