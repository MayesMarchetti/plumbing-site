const DEFAULT_DURATION_MINUTES = 60;

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildAppointmentInvite({ uid, customerName, customerEmail, customerPhone, requestedTime }) {
  const start = new Date(requestedTime);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plumbing Co.//Appointment Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICSText(`UNCONFIRMED: ${customerName} - Plumbing Call`)}`,
    `DESCRIPTION:${escapeICSText(`Customer phone: ${customerPhone}\nCustomer email: ${customerEmail}`)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

module.exports = { buildAppointmentInvite };
