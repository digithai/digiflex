import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const toDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const direct = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const addOneDay = (dateOnly) => {
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
};

// Get service account credentials
const getServiceAccountAuth = () => {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  
  console.log('[Google Calendar] Loading service account credentials...');
  console.log('[Google Calendar] Key path from env:', keyPath);
  
  if (!keyPath) {
    console.log('[Google Calendar] Service account key path not configured');
    return null;
  }

  const fullPath = path.resolve(keyPath);
  console.log('[Google Calendar] Resolved full path:', fullPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log('[Google Calendar] Service account key file not found:', fullPath);
    return null;
  }

  try {
    const keyFile = fs.readFileSync(fullPath, 'utf8');
    const key = JSON.parse(keyFile);

    console.log('[Google Calendar] Service account email:', key.client_email);
    console.log('[Google Calendar] Project ID:', key.project_id);

    const impersonateUser = process.env.GOOGLE_CALENDAR_IMPERSONATE_USER;
    if (impersonateUser) {
      console.log('[Google Calendar] Using domain-wide delegation as:', impersonateUser);
    }

    const auth = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      subject: impersonateUser || undefined,
    });

    console.log('[Google Calendar] Service account auth created successfully');
    return auth;
  } catch (error) {
    console.error('[Google Calendar] Error loading service account key:', error);
    return null;
  }
};

// Get calendar ID from environment
const getCalendarId = () => {
  const calendarId = process.env.GOOGLE_CALENDAR_CALENDAR_ID;
  console.log('[Google Calendar] Calendar ID from env:', calendarId);
  
  if (!calendarId) {
    console.log('[Google Calendar] Calendar ID not configured, skipping sync');
    return null;
  }
  return calendarId;
};

// Create calendar event for WFH request
export const createCalendarEvent = async (request, user, approver = null) => {
  try {
    const auth = getServiceAccountAuth();
    if (!auth) {
      console.log('[Google Calendar] Service account not configured, skipping sync');
      return null;
    }

    const calendarId = getCalendarId();
    if (!calendarId) {
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const startDate = toDateOnly(request.date);
    if (!startDate) {
      console.error('[Google Calendar] Invalid request date:', request.date);
      return null;
    }
    const endDate = addOneDay(startDate);
    
    const event = {
      summary: `WFH - ${user.name}`,
      description: approver 
        ? `Work From Home request for ${user.name} (${user.email}) approved by ${approver.name} (${approver.email})`
        : `Work From Home request for ${user.name} (${user.email})`,
      start: {
        date: startDate, // All-day event must be YYYY-MM-DD
      },
      end: {
        date: endDate, // End date is exclusive for all-day events
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      resource: event,
    });

    console.log('[Google Calendar] Event created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Google Calendar] Error creating event:', error.message);
    console.error('[Google Calendar] Error details:', error.errors);
    console.error('[Google Calendar] API response error:', error?.response?.data?.error);
    console.error('[Google Calendar] Full error:', error);
    throw error;
  }
};

// Delete calendar event for WFH request
export const deleteCalendarEvent = async (request) => {
  try {
    const auth = getServiceAccountAuth();
    if (!auth) {
      console.log('[Google Calendar] Service account not configured, skipping sync');
      return null;
    }

    if (!request.googleCalendarEventId) {
      console.log('[Google Calendar] No Google Calendar event ID found, skipping deletion');
      return null;
    }

    const calendarId = getCalendarId();
    if (!calendarId) {
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });
    
    await calendar.events.delete({
      calendarId,
      eventId: request.googleCalendarEventId,
    });

    console.log('[Google Calendar] Event deleted:', request.googleCalendarEventId);
    return true;
  } catch (error) {
    console.error('[Google Calendar] Error deleting event:', error.message);
    console.error('[Google Calendar] Error details:', error.errors);
    console.error('[Google Calendar] Full error:', error);
    throw error;
  }
};

// Update calendar event (for date changes)
export const updateCalendarEvent = async (request, user) => {
  try {
    const auth = getServiceAccountAuth();
    if (!auth) {
      console.log('[Google Calendar] Service account not configured, skipping sync');
      return null;
    }

    if (!request.googleCalendarEventId) {
      console.log('[Google Calendar] No Google Calendar event ID found, creating new event');
      return createCalendarEvent(request, user);
    }

    const calendarId = getCalendarId();
    if (!calendarId) {
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const startDate = toDateOnly(request.date);
    if (!startDate) {
      console.error('[Google Calendar] Invalid request date:', request.date);
      return null;
    }
    const endDate = addOneDay(startDate);
    
    const event = {
      summary: `WFH - ${user.name}`,
      description: `Work From Home request for ${user.name} (${user.email})`,
      start: {
        date: startDate,
      },
      end: {
        date: endDate,
      },
    };

    const response = await calendar.events.update({
      calendarId,
      eventId: request.googleCalendarEventId,
      resource: event,
    });

    console.log('[Google Calendar] Event updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Google Calendar] Error updating event:', error.message);
    console.error('[Google Calendar] Error details:', error.errors);
    console.error('[Google Calendar] API response error:', error?.response?.data?.error);
    console.error('[Google Calendar] Full error:', error);
    throw error;
  }
};
