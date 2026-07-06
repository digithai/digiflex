import WfhRequest from '../models/WfhRequest.js';
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import WfhSettings from '../models/WfhSettings.js';
import nodemailer from 'nodemailer';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, addWeeks, parseISO } from 'date-fns';
import { isSuperAdminRole, isTenantAdminRole } from '../middleware/authMiddleware.js';
import { createCalendarEvent, deleteCalendarEvent } from '../services/googleCalendarService.js';

const getTransporter = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging') {
    return nodemailer.createTransport({
      service: 'Gmail',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const getTenantQuery = (req) => ({ tenant: req.user.tenant._id });

const getOrCreateSettings = async (tenantId) => {
  let doc = await WfhSettings.findOne({ tenant: tenantId });
  if (!doc) {
    doc = await WfhSettings.create({ tenant: tenantId });
  }
  return doc;
};

const getGoogleCalendarConfig = (settings) => ({
  enabled: !!settings?.googleCalendar?.enabled,
  serviceAccountCredentialsFile: String(settings?.googleCalendar?.serviceAccountCredentialsFile || '').trim(),
  calendarId: String(settings?.googleCalendar?.calendarId || '').trim(),
  calendarUser: String(settings?.googleCalendar?.calendarUser || '').trim(),
});

export const requestWfh = async (req, res) => {
  try {
    const { type, date, userId, allowAnyDate, status } = req.body;
    const actor = req.user;
    const tenantId = actor.tenant._id;

    let user = actor;
    if (userId && (isTenantAdminRole(actor.role) || actor.role === 'approver' || isSuperAdminRole(actor.role))) {
      const maybeUser = await User.findOne({ _id: userId, tenant: tenantId });
      if (!maybeUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }
      user = maybeUser;
    }

    const selectedDate = parseISO(date);
    const settings = await getOrCreateSettings(tenantId);
    const googleCalendarConfig = getGoogleCalendarConfig(settings);
    const today = new Date();
    const intervals = [];
    const scopes = settings.allowedDateScopes || {};

    if (scopes.thisWeek) {
      intervals.push({
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      });
    }

    if (scopes.nextWeek) {
      intervals.push({
        start: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
        end: endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
      });
    }

    if (scopes.withinMonth) {
      intervals.push({
        start: startOfMonth(today),
        end: endOfMonth(today),
      });
    }

    if (!allowAnyDate) {
      if (intervals.length === 0) {
        const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
        if (!isWithinInterval(selectedDate, { start: nextWeekStart, end: nextWeekEnd })) {
          return res.status(400).json({ message: 'You can only request WFH for next week.' });
        }
      } else if (!intervals.some(({ start, end }) => isWithinInterval(selectedDate, { start, end }))) {
        return res.status(400).json({ message: 'Selected date is outside the allowed WFH date range.' });
      }
    }

    const disallowedWeekdays = settings.disallowedWeekdays?.length
      ? settings.disallowedWeekdays
      : [1, 5, 0, 6];

    if (disallowedWeekdays.includes(selectedDate.getDay())) {
      return res.status(400).json({ message: 'WFH requests on this weekday are not allowed.' });
    }

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

    const baseWeeklyQuery = {
      tenant: tenantId,
      user: user._id,
      date: { $gte: weekStart, $lte: weekEnd },
      type: 'wfh',
    };

    // Rejected requests do not consume weekly allowance.
    const [approvedCount, pendingCount] = await Promise.all([
      WfhRequest.countDocuments({ ...baseWeeklyQuery, status: 'approved' }),
      WfhRequest.countDocuments({ ...baseWeeklyQuery, status: 'pending' }),
    ]);
    const weeklyUsedCount = approvedCount + pendingCount;

    const holidaysInWeek = await Holiday.countDocuments({
      tenant: tenantId,
      date: { $gte: weekStart, $lte: weekEnd },
    });

    const baseMaxDays = user.wfhWeekly || 1;
    const effectiveMaxDays = Math.max(0, baseMaxDays - holidaysInWeek);

    if (effectiveMaxDays <= 0) {
      const message = holidaysInWeek > 0
        ? 'No WFH allowed this week because of public holidays.'
        : `No WFH allowed this week. Your weekly allowance is ${baseMaxDays} day(s), already used.`;
      return res.status(400).json({ message });
    }

    if (weeklyUsedCount >= effectiveMaxDays) {
      const message = holidaysInWeek > 0
        ? `You can request up to ${effectiveMaxDays} WFH day(s) this week due to public holidays. Current usage: ${weeklyUsedCount} (approved: ${approvedCount}, pending: ${pendingCount}).`
        : `You can request up to ${effectiveMaxDays} WFH day(s) per week. Current usage: ${weeklyUsedCount} (approved: ${approvedCount}, pending: ${pendingCount}).`;
      return res.status(400).json({ message });
    }

    const concurrentApproved = await WfhRequest.find({
      tenant: tenantId,
      date,
      type: 'wfh',
      status: 'approved',
    }).populate('user');

    const samePositionCount = concurrentApproved.filter(
      (reqDoc) => reqDoc.user && reqDoc.user.position === user.position
    ).length;

    const positionConcurrencyMap = settings.positionConcurrency || new Map();
    const allowedForPosition = positionConcurrencyMap.get
      ? (positionConcurrencyMap.get(user.position) ?? 1)
      : (positionConcurrencyMap[user.position] ?? 1);

    if (samePositionCount >= allowedForPosition) {
      return res.status(400).json({
        message: `There are already ${samePositionCount} colleague(s) with position ${user.position} working from home on this date. Maximum allowed is ${allowedForPosition}.`,
      });
    }

    const newRequest = await WfhRequest.create({
      tenant: tenantId,
      user: user._id,
      type,
      date,
      status: status || 'pending',
    });

    // Only send approval emails for pending requests
    if (newRequest.status === 'pending') {
      const approvers = await User.find({ tenant: tenantId, role: 'approver' });
      const admins = await User.find({ tenant: tenantId, role: 'tenant_admin' });
      const recipients = actor.role === 'approver' ? admins : approvers;
      const transporter = getTransporter();

      recipients.forEach((recipient) => {
        const appUrl = process.env.FRONTEND_URL || process.env.VITE_BASE_URL || 'http://localhost:7091';
        transporter.sendMail(
          {
            from: process.env.EMAIL_USER,
            to: recipient.email,
            subject: `New WFH Request from ${user.name}`,
            text: `${user.name} has requested ${type.toUpperCase()} for ${date}.\n\nPlease review it in the approval page:\n${appUrl}`,
          },
          (error, info) => {
            if (error) console.error('Error sending email:', error);
            else console.log('Email sent:', info.response);
          }
        );
      });
    }

    // Sync to Google Calendar if approved
    if (newRequest.status === 'approved' && newRequest.type === 'wfh' && googleCalendarConfig.enabled) {
      try {
        const calendarEvent = await createCalendarEvent(newRequest, user, googleCalendarConfig, actor);
        if (calendarEvent) {
          newRequest.googleCalendarEventId = calendarEvent.id;
          await newRequest.save();
        }
      } catch (calendarError) {
        console.error('[WFH] Failed to sync to Google Calendar:', calendarError);
        // Don't fail the request creation if calendar sync fails
      }
    }

    return res.status(201).json({ message: 'Request submitted successfully.', request: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting WFH request' });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const requests = await WfhRequest.find({
      ...getTenantQuery(req),
      status: 'pending',
    }).populate('user', 'name email position role');
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

export const getApprovedRequests = async (req, res) => {
  try {
    const requests = await WfhRequest.find({
      ...getTenantQuery(req),
      status: 'approved',
    }).populate('user', 'name email position role');
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch approved requests' });
  }
};

export const getRejectedRequests = async (req, res) => {
  try {
    const requests = await WfhRequest.find({
      ...getTenantQuery(req),
      status: 'rejected',
    }).populate('user', 'name email position role');
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch rejected requests' });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant._id);
    const googleCalendarConfig = getGoogleCalendarConfig(settings);

    const request = await WfhRequest.findOne({
      _id: req.params.id,
      ...getTenantQuery(req),
    }).populate('user');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'approved';
    await request.save();

    // Sync to Google Calendar for WFH requests
    if (request.type === 'wfh' && googleCalendarConfig.enabled) {
      try {
        const calendarEvent = await createCalendarEvent(request, request.user, googleCalendarConfig, req.user);
        if (calendarEvent) {
          request.googleCalendarEventId = calendarEvent.id;
          await request.save();
        }
      } catch (calendarError) {
        console.error('[WFH] Failed to sync to Google Calendar:', calendarError);
        // Don't fail the approval if calendar sync fails
      }
    }

    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: request.user.email,
      subject: 'Your WFH request has been approved',
      text: `Hi ${request.user.name}, your WFH request for ${request.date} has been approved by ${req.user.name} (${req.user.email}).`,
    });

    res.json({ message: 'Request approved', request });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ message: 'Failed to approve request' });
  }
};

export const rejectRequest = async (req, res) => {
  const { reason } = req.body;

  try {
    const request = await WfhRequest.findOne({
      _id: req.params.id,
      ...getTenantQuery(req),
    }).populate('user');

    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Update status to rejected and save reason
    request.status = 'rejected';
    request.rejectionReason = reason || 'No reason provided';
    await request.save();

    // Get approvers/tenant admins for contact information
    const approvers = await User.find({
      tenant: req.user.tenant._id,
      role: { $in: ['tenant_admin', 'approver'] }
    }).select('email name');

    const approverEmails = approvers.map(a => a.email).join(', ');
    const approverNames = approvers.map(a => a.name).join(', ');

    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: request.user.email,
      subject: 'Your WFH request has been rejected',
      text: `Hi ${request.user.name},

Your WFH request for ${request.date} has been rejected.

Reason: ${reason || 'No reason provided'}

You are welcome to submit a new request for a different date if needed. If you have any questions or would like to discuss this decision, please feel free to contact the approvals team:

${approverNames}
${approverEmails}

Thank you for your understanding.`,
    });

    res.status(200).json({ message: 'Request rejected', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reject request' });
  }
};

export const deleteRequest = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant._id);
    const googleCalendarConfig = getGoogleCalendarConfig(settings);

    const request = await WfhRequest.findOne({
      _id: req.params.id,
      ...getTenantQuery(req),
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Delete from Google Calendar if synced
    if (request.type === 'wfh' && request.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(request, googleCalendarConfig);
      } catch (calendarError) {
        console.error('[WFH] Failed to delete from Google Calendar:', calendarError);
        // Don't fail the deletion if calendar sync fails
      }
    }

    await request.deleteOne();
    res.json({ message: 'Request deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ message: 'Failed to delete request' });
  }
};

export const updateRequestDate = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const request = await WfhRequest.findOne({
      _id: req.params.id,
      ...getTenantQuery(req),
    }).populate('user');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const oldDate = request.date;
    request.date = date;
    await request.save();

    try {
      const transporter = getTransporter();
      const formatDate = (value) => {
        try {
          return new Date(value).toISOString().slice(0, 10);
        } catch {
          return String(value);
        }
      };

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: request.user.email,
        subject: 'Your WFH request date has been updated',
        text: `Hi ${request.user.name}, your approved WFH request has been updated.\n\nOld date: ${formatDate(oldDate)}\nNew date: ${formatDate(request.date)}.`,
      });
    } catch (mailErr) {
      console.error('Error sending WFH date change email:', mailErr);
    }

    res.json(request);
  } catch (err) {
    console.error('Error updating date:', err);
    res.status(500).json({ message: 'Failed to update date' });
  }
};

export const exportWfhRequests = async (req, res) => {
  try {
    const requests = await WfhRequest.find({
      ...getTenantQuery(req),
    })
      .populate('user', 'name email')
      .sort({ date: -1 });

    // Generate CSV
    const csvHeader = 'Date,User,Status,Reason\n';
    const csvRows = requests.map((r) => {
      const date = r.date ? new Date(r.date).toISOString().slice(0, 10) : '';
      const user = r.user?.name || 'Unknown';
      const status = r.status || 'unknown';
      const reason = r.rejectionReason || '';
      return `"${date}","${user}","${status}","${reason}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=wfh_requests.csv');
    
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting WFH requests:', err);
    res.status(500).json({ message: 'Failed to export WFH requests' });
  }
};