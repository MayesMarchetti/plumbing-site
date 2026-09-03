const express = require('express');
const appointments = require('../models/appointmentModel');
const { buildAppointmentInvite } = require('../services/icsInvite');
const { sendAppointmentNotification, sendCustomerConfirmation } = require('../services/emailNotifier');
const { updateConfirmedEvent } = require('../services/googleCalendar');
const { appendCompletionRow } = require('../services/completionLog');
const requireAdminAuth = require('../middleware/basicAuth');

const router = express.Router();

// /request is the public "book an appointment" endpoint the website's own
// forms call — everything else here manages existing appointments and is
// admin-only.
router.use((req, res, next) => {
  if (req.path === '/request') return next();
  return requireAdminAuth(req, res, next);
});

router.post('/request', async (req, res) => {
  const { customer_name, customer_email, customer_phone, requested_time } = req.body || {};

  if (!customer_name || !customer_email || !customer_phone || !requested_time) {
    return res.status(400).json({
      ok: false,
      error: 'customer_name, customer_email, customer_phone, and requested_time are required.',
    });
  }

  let appointment;
  try {
    appointment = await appointments.create({ customer_name, customer_email, customer_phone, requested_time });
  } catch (err) {
    console.error('Failed to create appointment:', err);
    return res.status(500).json({ ok: false, error: 'Failed to create appointment.' });
  }

  const icsInvite = buildAppointmentInvite({
    uid: `appointment-${appointment.id}@plumbing-appointments.local`,
    customerName: customer_name,
    customerEmail: customer_email,
    customerPhone: customer_phone,
    requestedTime: requested_time,
  });

  const [{ sent }, { sent: confirmationSent }] = await Promise.all([
    sendAppointmentNotification(appointment, { icsInvite }),
    sendCustomerConfirmation(appointment),
  ]);

  res.status(201).json({
    ok: true,
    appointment,
    calendarInviteAttached: Boolean(icsInvite),
    emailSent: sent,
    confirmationEmailSent: confirmationSent,
  });
});

router.post('/', async (req, res) => {
  const { customer_name, customer_email, customer_phone, requested_time, service_type } = req.body || {};

  if (!customer_name || !customer_email || !customer_phone || !requested_time) {
    return res.status(400).json({
      ok: false,
      error: 'customer_name, customer_email, customer_phone, and requested_time are required.',
    });
  }

  try {
    const appointment = await appointments.create({
      customer_name,
      customer_email,
      customer_phone,
      requested_time,
      service_type,
    });
    res.status(201).json({ ok: true, appointment });
  } catch (err) {
    console.error('Failed to create appointment:', err);
    res.status(500).json({ ok: false, error: 'Failed to create appointment.' });
  }
});

router.get('/', async (req, res) => {
  const { status } = req.query;

  if (status && !appointments.VALID_STATUSES.includes(status)) {
    return res.status(400).json({ ok: false, error: `Invalid status filter: ${status}` });
  }

  try {
    const list = await appointments.list({ status });
    res.json({ ok: true, appointments: list });
  } catch (err) {
    console.error('Failed to list appointments:', err);
    res.status(500).json({ ok: false, error: 'Failed to load appointments.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const appointment = await appointments.getById(req.params.id);
    if (!appointment) return res.status(404).json({ ok: false, error: 'Appointment not found.' });
    res.json({ ok: true, appointment });
  } catch (err) {
    console.error('Failed to load appointment:', err);
    res.status(500).json({ ok: false, error: 'Failed to load appointment.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const existing = await appointments.getById(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Appointment not found.' });

    const appointment = await appointments.update(req.params.id, req.body || {});
    res.json({ ok: true, appointment });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await appointments.remove(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Appointment not found.' });
    res.status(204).send();
  } catch (err) {
    console.error('Failed to delete appointment:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete appointment.' });
  }
});

router.post('/:id/confirm', async (req, res) => {
  const { confirmed_time, customer_name, customer_phone, customer_email } = req.body || {};

  if (!confirmed_time || !customer_name || !customer_phone || !customer_email) {
    return res.status(400).json({
      ok: false,
      error: 'confirmed_time, customer_name, customer_phone, and customer_email are required.',
    });
  }

  let appointment;
  try {
    const existing = await appointments.getById(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Appointment not found.' });

    appointment = await appointments.update(req.params.id, {
      status: 'confirmed',
      confirmed_time,
      customer_name,
      customer_phone,
      customer_email,
    });
  } catch (err) {
    console.error('Failed to confirm appointment:', err);
    return res.status(500).json({ ok: false, error: 'Failed to confirm appointment.' });
  }

  let calendarEventUpdated = false;
  if (appointment.google_calendar_event_id) {
    calendarEventUpdated = await updateConfirmedEvent({
      eventId: appointment.google_calendar_event_id,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      confirmedTime: confirmed_time,
    });
  }

  res.json({ ok: true, appointment, calendarEventUpdated });
});

router.post('/:id/complete', async (req, res) => {
  const { employee_name, service_type, payment_amount, date_completed, description } = req.body || {};

  if (!employee_name || !service_type || payment_amount === undefined || payment_amount === null || !date_completed || !description) {
    return res.status(400).json({
      ok: false,
      error: 'employee_name, service_type, payment_amount, date_completed, and description are required.',
    });
  }

  let appointment;
  try {
    const existing = await appointments.getById(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Appointment not found.' });

    appointment = await appointments.update(req.params.id, {
      status: 'completed',
      assigned_employee: employee_name,
      service_type,
      payment_amount,
    });
  } catch (err) {
    console.error('Failed to complete appointment:', err);
    return res.status(500).json({ ok: false, error: 'Failed to complete appointment.' });
  }

  const logAppended = await appendCompletionRow({
    employeeName: employee_name,
    customerName: appointment.customer_name,
    customerPhone: appointment.customer_phone,
    serviceType: service_type,
    paymentAmount: payment_amount,
    dateCompleted: date_completed,
    description,
  });

  res.json({ ok: true, appointment, logAppended });
});

module.exports = router;
