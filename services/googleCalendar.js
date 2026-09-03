const { google } = require('googleapis');

const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const DEFAULT_DURATION_MINUTES = 60;

let calendarClient = null;

function getCalendarClient() {
  if (!KEY_FILE || !CALENDAR_ID) return null;

  if (!calendarClient) {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    calendarClient = google.calendar({ version: 'v3', auth });
  }

  return calendarClient;
}

async function updateConfirmedEvent({ eventId, customerName, customerEmail, customerPhone, confirmedTime }) {
  const calendar = getCalendarClient();
  if (!calendar) {
    console.error('Google Calendar is not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE and GOOGLE_CALENDAR_ID in .env');
    return false;
  }

  const start = new Date(confirmedTime);
  if (Number.isNaN(start.getTime())) {
    console.error(`Cannot update calendar event: confirmed_time is not a valid date (${confirmedTime})`);
    return false;
  }
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);

  try {
    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: {
        summary: `CONFIRMED: ${customerName} - Plumbing Appointment`,
        description: [
          `Customer: ${customerName}`,
          `Phone: ${customerPhone}`,
          `Email: ${customerEmail}`,
          `Confirmed Time: ${start.toISOString()}`,
        ].join('\n'),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        status: 'confirmed',
      },
    });
    return true;
  } catch (err) {
    console.error('Failed to update Google Calendar event:', err.message);
    return false;
  }
}

module.exports = { updateConfirmedEvent };
