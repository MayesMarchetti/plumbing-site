require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const appointmentsRouter = require('./routes/appointments');
const completedJobsRouter = require('./routes/completedJobs');
const appointmentModel = require('./models/appointmentModel');
const { sendAppointmentNotification, sendCustomerConfirmation } = require('./services/emailNotifier');
const { buildAppointmentInvite } = require('./services/icsInvite');
const requireAdminAuth = require('./middleware/basicAuth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', requireAdminAuth, (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'admin') });
});

app.use('/api/appointments', appointmentsRouter);
app.use('/api/completed-jobs', completedJobsRouter);

app.post('/api/book', async (req, res) => {
  const { name, email, phone, service, date, time, startHour } = req.body || {};

  if (!name || !email || !phone || !service || !date || !time) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }

  let appointment;
  try {
    appointment = await appointmentModel.create({
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      requested_time: `${date} ${time}`,
      service_type: service,
    });
  } catch (err) {
    console.error('Failed to save appointment:', err);
    return res.status(500).json({ ok: false, error: 'Failed to save your appointment request.' });
  }

  const icsInvite = startHour
    ? buildAppointmentInvite({
        uid: `appointment-${appointment.id}@plumbing-appointments.local`,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        requestedTime: `${date}T${startHour}:00`,
      })
    : null;

  const [{ sent }, { sent: confirmationSent }] = await Promise.all([
    sendAppointmentNotification(appointment, { icsInvite }),
    sendCustomerConfirmation(appointment),
  ]);

  return res.json({
    ok: true,
    id: appointment.id,
    calendarInviteAttached: Boolean(icsInvite),
    emailSent: sent,
    confirmationEmailSent: confirmationSent,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Plumbing site running at http://localhost:${PORT}`);
  });
}

module.exports = app;
