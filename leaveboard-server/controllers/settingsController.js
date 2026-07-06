import WfhSettings from '../models/WfhSettings.js';
import { isTenantAdminRole, isSuperAdminRole } from '../middleware/authMiddleware.js';

const getOrCreateSettings = async (req) => {
  let doc = await WfhSettings.findOne({ tenant: req.user.tenant._id });
  if (!doc) {
    doc = await WfhSettings.create({ tenant: req.user.tenant._id });
  }
  return doc;
};

const toSettingsResponse = (settingsDoc, canViewSecrets) => {
  const data = settingsDoc.toObject({ flattenMaps: true });
  if (!canViewSecrets && data.googleCalendar) {
    data.googleCalendar.serviceAccountCredentialsFile = '';
  }
  return data;
};

export const getWfhSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req);
    const canViewSecrets = isTenantAdminRole(req.user?.role) || isSuperAdminRole(req.user?.role);
    res.json(toSettingsResponse(settings, canViewSecrets));
  } catch (err) {
    console.error('[SETTINGS] Error fetching WFH settings:', err);
    res.status(500).json({ message: 'Failed to fetch WFH settings' });
  }
};

export const updateWfhSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req);

    const { allowedDateScopes, disallowedWeekdays, positionConcurrency, googleCalendar } = req.body || {};

    if (allowedDateScopes && typeof allowedDateScopes === 'object') {
      settings.allowedDateScopes.thisWeek = !!allowedDateScopes.thisWeek;
      settings.allowedDateScopes.nextWeek = !!allowedDateScopes.nextWeek;
      settings.allowedDateScopes.withinMonth = !!allowedDateScopes.withinMonth;
    }

    if (Array.isArray(disallowedWeekdays)) {
      settings.disallowedWeekdays = disallowedWeekdays
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
    }

    if (positionConcurrency && typeof positionConcurrency === 'object') {
      const nextPositionConcurrency = {};

      Object.entries(positionConcurrency).forEach(([position, value]) => {
        const num = Number(value);
        if (!Number.isNaN(num) && num >= 0) {
          nextPositionConcurrency[position] = num;
        }
      });

      settings.positionConcurrency = nextPositionConcurrency;
    }

    if (googleCalendar && typeof googleCalendar === 'object') {
      const canManageGoogleCalendar = isTenantAdminRole(req.user?.role) || isSuperAdminRole(req.user?.role);
      if (!canManageGoogleCalendar) {
        return res.status(403).json({ message: 'Only tenant admins can manage Google Calendar settings' });
      }

      if (!settings.googleCalendar) {
        settings.googleCalendar = {
          enabled: false,
          serviceAccountCredentialsFile: '',
          calendarId: '',
          calendarUser: '',
        };
      }

      const nextEnabled = !!googleCalendar.enabled;
      const nextCredentials = googleCalendar.serviceAccountCredentialsFile !== undefined
        ? String(googleCalendar.serviceAccountCredentialsFile || '').trim()
        : String(settings.googleCalendar?.serviceAccountCredentialsFile || '').trim();
      const nextCalendarId = googleCalendar.calendarId !== undefined
        ? String(googleCalendar.calendarId || '').trim()
        : String(settings.googleCalendar?.calendarId || '').trim();
      const nextCalendarUser = googleCalendar.calendarUser !== undefined
        ? String(googleCalendar.calendarUser || '').trim()
        : String(settings.googleCalendar?.calendarUser || '').trim();

      if (nextEnabled && (!nextCredentials || !nextCalendarId)) {
        return res.status(400).json({
          message: 'Service account credentials file and calendar ID are required when Google Calendar sync is enabled',
        });
      }

      settings.googleCalendar.enabled = !!googleCalendar.enabled;

      if (googleCalendar.serviceAccountCredentialsFile !== undefined) {
        settings.googleCalendar.serviceAccountCredentialsFile = nextCredentials;
      }

      if (googleCalendar.calendarId !== undefined) {
        settings.googleCalendar.calendarId = nextCalendarId;
      }

      if (googleCalendar.calendarUser !== undefined) {
        settings.googleCalendar.calendarUser = nextCalendarUser;
      }
    }

    await settings.save();
    const canViewSecrets = isTenantAdminRole(req.user?.role) || isSuperAdminRole(req.user?.role);
    res.json(toSettingsResponse(settings, canViewSecrets));
  } catch (err) {
    console.error('[SETTINGS] Error updating WFH settings:', err);
    res.status(500).json({ message: 'Failed to update WFH settings' });
  }
};
