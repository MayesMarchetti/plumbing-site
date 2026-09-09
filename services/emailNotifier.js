const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const NOTIFY_EMAIL = process.env.BOOKING_NOTIFY_EMAIL;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendCustomerConfirmation(appointment) {
  if (!resend) {
    console.error('Resend is not configured. Set RESEND_API_KEY in .env');
    return { sent: false };
  }

  if (!appointment.customer_email) {
    console.error('Cannot send customer confirmation: appointment has no customer_email');
    return { sent: false };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: appointment.customer_email,
      subject: 'We received your appointment request — Plumbing Co.',
      html: `
        <h2>Thanks, ${escapeHtml(appointment.customer_name)}!</h2>
        <p>We've received your appointment request and a member of our team will reach out shortly to confirm the details.</p>
        <p><strong>Requested time:</strong> ${escapeHtml(appointment.requested_time)}</p>
        ${appointment.service_type ? `<p><strong>Service:</strong> ${escapeHtml(appointment.service_type)}</p>` : ''}
        <p><strong>Phone on file:</strong> ${escapeHtml(appointment.customer_phone)}</p>
        <p>Need to make a change? Call us at (555) 555-5555.</p>
        <p>&mdash; Plumbing Co.</p>
      `,
    });

    if (error) {
      console.error('Resend error (customer confirmation):', error);
      return { sent: false };
    }

    return { sent: true };
  } catch (err) {
    console.error('Unexpected error sending customer confirmation:', err);
    return { sent: false };
  }
}

async function sendAppointmentNotification(appointment, { icsInvite } = {}) {
  if (!resend || !NOTIFY_EMAIL) {
    console.error('Resend is not configured. Set RESEND_API_KEY and BOOKING_NOTIFY_EMAIL in .env');
    return { sent: false };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `New appointment request from ${appointment.customer_name}`,
      html: `
        <h2>New Appointment Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(appointment.customer_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(appointment.customer_email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(appointment.customer_phone)}</p>
        ${appointment.service_type ? `<p><strong>Service:</strong> ${escapeHtml(appointment.service_type)}</p>` : ''}
        <p><strong>Requested Time:</strong> ${escapeHtml(appointment.requested_time)}</p>
        ${icsInvite ? '<p>A calendar invite for this tentative appointment is attached.</p>' : ''}
      `,
      attachments: icsInvite
        ? [
            {
              filename: 'appointment.ics',
              content: Buffer.from(icsInvite).toString('base64'),
            },
          ]
        : undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return { sent: false };
    }

    return { sent: true };
  } catch (err) {
    console.error('Unexpected error sending booking email:', err);
    return { sent: false };
  }
}

module.exports = { sendAppointmentNotification, sendCustomerConfirmation };
