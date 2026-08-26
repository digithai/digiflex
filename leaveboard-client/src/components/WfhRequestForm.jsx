import { useState, useEffect, useMemo, forwardRef, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import SectionWrap from './SectionWrap';
import styles from '../styles/WfhRequestForm.module.css';
import { getWeekBounds } from '../utils/dateUtils';
import DatePicker from 'react-datepicker';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const WfhRequestForm = ({ onSubmitted, targetWeek }) => {
  const [type, setType] = useState('wfh');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState(null);
  const { token, user } = useSelector(state => state.auth);
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [disallowedWeekdays, setDisallowedWeekdays] = useState([1, 5, 0, 6]); // default: Monday, Friday, weekend
  const [positionConcurrency, setPositionConcurrency] = useState({});
  const [blocked, setBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holidayAdjustmentData, setHolidayAdjustmentData] = useState(null);
  const [allowedDateScopes, setAllowedDateScopes] = useState(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const datePickerRef = useRef(null);
  const [autoDismissMessage, setAutoDismissMessage] = useState(null);
  const timerRef = useRef(null);

  const url = `${import.meta.env.VITE_BASE_URL}/api/wfh/request`;
  const approvedUrl = `${import.meta.env.VITE_BASE_URL}/api/wfh/approved`;
  const pendingUrl = `${import.meta.env.VITE_BASE_URL}/api/wfh/approvals`;
  const holidaysUrl = `${import.meta.env.VITE_BASE_URL}/api/holidays`;
  const settingsUrl = `${import.meta.env.VITE_BASE_URL}/api/settings/wfh`;
  const formatDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

   // Fetch WFH settings so we can respect dynamic disallowed weekdays client-side
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(settingsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const settings = res.data || null;

        if (settings && settings.allowedDateScopes){
          setAllowedDateScopes(settings.allowedDateScopes);
        }

        const serverDisallowed =
          settings && Array.isArray(settings.disallowedWeekdays) && settings.disallowedWeekdays.length
            ? settings.disallowedWeekdays
            : [1, 5, 0, 6];
        setDisallowedWeekdays(serverDisallowed.map((n) => Number(n)));
        if (settings && settings.positionConcurrency) {
          setPositionConcurrency(settings.positionConcurrency);
        }
      } catch (_) {
        setDisallowedWeekdays([1, 5, 0, 6]);
      }
    };
    if (token) fetchSettings();
  }, [settingsUrl, token]);

  // const weekScope = tenantSettings?.wfhScope || 'next';
  const weekScope = useMemo(() => {
    if (!allowedDateScopes) return 'next'; // default
    if (allowedDateScopes.thisWeek) return 'this';
    if (allowedDateScopes.nextWeek) return 'next';
    return 'next'; // default
  }, [allowedDateScopes]);

  // Calculate "Next Week" boundaries for WFH scope
  const { nextWeekMonday, nextWeekFriday, nextWeekSunday } = useMemo(() => {
    const today = new Date();
    const curMon = startOfWeek(today, { weekStartsOn: 1 });
    const nextMon = addDays(curMon, 7);
    return {
      nextWeekMonday: nextMon,
      nextWeekFriday: addDays(nextMon, 4),
      nextWeekSunday: addDays(nextMon, 6),
    };
  }, []);

  // Calulate minimum date for WFH request based on week scope
  const { minStartDate, minFriday, minSunday } = useMemo(() => {
    if (weekScope === 'this') {
      const today = new Date();
      const curMon = startOfWeek(today, { weekStartsOn: 1 });
      return {
        minStartDate: today,
        minFriday: addDays(curMon, 4),
        minSunday: addDays(curMon, 6),
      };
    }
    else{
      const today = new Date();
      const curMon = startOfWeek(today, { weekStartsOn: 1 });
      const nextMon = addDays(curMon, 7);
      return {
        minStartDate: nextMon,
        minFriday: addDays(nextMon, 4),
        minSunday: addDays(nextMon, 6),
      };
    }
  }, [weekScope]);

  // Auto-dismiss message after 5 seconds (after WFH request submit)
  useEffect(() => {
    if (message) {
      setAutoDismissMessage(message);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Set new timer
      timerRef.current = setTimeout(() => {
        console.log("Timer expired, clearing message");
        setAutoDismissMessage(null);
        timerRef.current = null;
      }, 5000);
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [message]);

  const getMessageType = (msg) => {
    if (!msg) return 'error';
    if (msg.includes('success') || msg.includes('submitted')) return 'success';
    if (msg.includes('error') || msg.includes('failed')) return 'error';
    return 'error';
  };

  const messageType = getMessageType(autoDismissMessage);

  const formatDateKey = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (type === 'sick' && Array.isArray(date)) {
      const diff = (new Date(date[1]) - new Date(date[0])) / (1000 * 60 * 60 * 24) + 1;
      if (diff > 2) {
        setMessage('📩 If your sick leave is longer than 2 days, please send a medical certificate to hr@digithaigroup.com');
      }
    }
  }, [type, date]);

  // Fetch approved and pending requests to check user's weekly limit client-side
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const [approvedRes, pendingRes] = await Promise.all([
          axios.get(approvedUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(pendingUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setApproved(approvedRes.data || []);
        setPending(pendingRes.data || []);
      } catch (e) {
        // leave approved empty on error; server will still enforce limit
      }
    };
    if (token) fetchExisting();
  }, [approvedUrl, pendingUrl, token, date]);

  // Fetch holidays so we can block WFH requests on public holidays client-side
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(holidaysUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHolidays(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setHolidays([]);
      }
    };
    if (token) fetchHolidays();
  }, [holidaysUrl, token]);

  // Check if WFH is blocked due to holidays or disallowed weekdays
  useEffect(() => {
    if (type === 'wfh' && user && date) {
      const selected = new Date(date);
      const day = selected.getDay(); // 0 = Sun, 1 = Mon, 5 = Fri, 6 = Sat

      // Block public holidays
      const isHoliday = holidays.some((h) => h?.date === date);
      if (isHoliday) {
        setBlocked(true);
        return;
      }

      // Block weeks where holidays reduce weekly WFH allowance to 0
      const { start: weekStart, end: weekEnd } = getWeekBounds(date);
      const holidaysInWeek = holidays.filter((h) => {
        if (!h?.date) return false;
        const hd = new Date(h.date);
        return hd >= weekStart && hd <= weekEnd;
      }).length;

      const baseMaxDays = user.wfhWeekly || 1;
      const effectiveMaxDays = Math.max(0, baseMaxDays - holidaysInWeek);
      if (effectiveMaxDays <= 0) {
        setBlocked(true);
        return;
      }

      // Block days disallowed by WFH weekday rules
      if (disallowedWeekdays.includes(day)) {
        setBlocked(true);
        return;
      }

      const { start, end } = getWeekBounds(date);
      const userId = user._id || user.id;
      const maxDays = user.wfhWeekly || 1;
      const approvedAndPendingCount = [...approved, ...pending].filter((r) => {
        if (!r || !r.user) return false;
        const rid = r.user._id || r.user.id;
        if (rid !== userId) return false;
        const rd = new Date(r.date);
        return rd >= start && rd <= end && String(r.type).toLowerCase() === 'wfh';
      }).length;

      const sameDay = (r) => {
        if (!r || !r.user) return false;
        const rid = r.user._id || r.user.id;
        if (rid !== userId) return false;
        const rd = new Date(r.date);
        const rdStr = new Date(rd.getTime() - rd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        return rdStr === date && String(r.type).toLowerCase() === 'wfh';
      };

      const hasApprovedSameDay = approved.some(sameDay);
      const hasPendingSameDay = pending.some(sameDay);

      const limitBlocked = approvedAndPendingCount >= maxDays;
      const dateBlocked = hasApprovedSameDay || hasPendingSameDay;

      setBlocked(limitBlocked || dateBlocked);

      // Keep success messages, clear others
      if (message && !message.includes('success') && !message.includes('submitted')) {
        setMessage(null);
      }
    } else {
      setBlocked(false);
    }
  }, [type, user, date, approved, pending, holidays, disallowedWeekdays]);

  // Calculate holiday adjustment for target week
  useEffect(() => {
    if (targetWeek && user) {
      const { start: weekStart, end: weekEnd } = targetWeek;
      const holidaysInWeek = holidays.filter((h) => {
        if (!h?.date) return false;
        const hd = new Date(h.date);
        return hd >= weekStart && hd <= weekEnd;
      }).length;

      const baseMaxDays = user.wfhWeekly || 1;
      const effectiveMaxDays = Math.max(0, baseMaxDays - holidaysInWeek); // Adjust weekly max days based on holidays in week
      const wfhAnnualBalance = Number(user?.wfhAnnualBalance) || 0;
      const annualCapDays = Math.min(effectiveMaxDays, wfhAnnualBalance);
      
      // Calculate used days for target week
      const userId = user._id || user.id;
      const usedDays = [...approved, ...pending].filter((r) => {
        if (!r || !r.user) return false;
        const rid = r.user._id || r.user.id;
        if (rid !== userId) return false;
        const rd = new Date(r.date);
        return rd >= weekStart && rd <= weekEnd && String(r.type).toLowerCase() === 'wfh';
      }).length;
      
      const usableDays = Math.max(0, annualCapDays - usedDays);
      const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

      setHolidayAdjustmentData({ 
        holidaysInWeek, 
        weekLabel, 
        baseMaxDays, 
        effectiveMaxDays, 
        annualCapDays, 
        usableDays, 
        wfhAnnualBalance, 
        usedDays 
      });
    }
  }, [targetWeek, holidays, user, approved, pending]);

  const countsForWeek = (() => {
    if (!user || !date) return { approved: 0, pending: 0, all: 0 };
    const { start, end } = getWeekBounds(date);
    const userId = user._id || user.id;
    const inWeekForUser = (r) => {
      if (!r || !r.user) return false;
      const rid = r.user._id || r.user.id;
      if (rid !== userId) return false;
      const rd = new Date(r.date);
      return rd >= start && rd <= end && String(r.type).toLowerCase() === 'wfh';
    };
    const a = approved.filter(inWeekForUser).length;
    const p = pending.filter(inWeekForUser).length;
    return { approved: a, pending: p, all: a + p };
  })();


  // Calendar Date Evaluation & Policy Validation
  const evaluateDateStatus = (d, weekScope = 'next') => {
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const time = new Date(d).setHours(0, 0, 0, 0);

    // Check if date is outside the allowed range
    if (d === minStartDate) {
      return {
        selectable: false,
        type: 'today',
        label: 'Today',
      };
    }

    if (d < minStartDate || d > minSunday) {
      return {
        selectable: false,
        type: 'outside_range',
        label: 'Outside allowed date range',
      };
    }

    // Calculate week boundaries based on scope (tenant's settings)
    let weekStart, weekEnd;

    if (weekScope === 'this'){
      const today = new Date();
      weekStart = startOfWeek(today, {weekStartsOn: 1});
      weekEnd = addDays(weekStart, 6);
    }
    else{
      weekStart = nextWeekMonday;
      weekEnd = nextWeekSunday;
    }

    const monTime = new Date(weekStart).setHours(0, 0, 0, 0);
    const sunTime = new Date(weekEnd).setHours(23, 59, 59, 999);
    const inScope = time >= monTime && time <= sunTime;

    const dateKey = formatDateKey(d);
    const holiday = holidays.find((h) => h?.date === dateKey);
    const isDisallowedWeekday = disallowedWeekdays.includes(dayOfWeek);

    // Check if user already has an approved or pending request for this specific date
    const userId = user._id || user.id;
    const sameDay = (r) => {
      if (!r || !r.user) return false;
      const rid = r.user._id || r.user.id;
      if (rid !== userId) return false;
      const rd = new Date(r.date);
      const rdStr = new Date(rd.getTime() - rd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      return rdStr === dateKey && String(r.type).toLowerCase() === 'wfh';
    };
    const hasUserApproved = approved.some(sameDay);
    const hasUserPending = pending.some(sameDay);

    const userPos = (user && user.team) || '';
    const maxAllowed = positionConcurrency[userPos] ?? 1;
    const samePosApproved = approved.filter((r) => {
      const rKey = r.date ? r.date.slice(0, 10) : '';
      return (
        rKey === dateKey &&
        r.status === 'approved' &&
        r.user?.position === userPos
      );
    });
    const isMaxReached = samePosApproved.length >= maxAllowed;

    const samePosPending = pending.filter((r) => {
      const rKey = r.date ? r.date.slice(0, 10) : '';
      return (
        rKey === dateKey &&
        r.status === 'pending' &&
        r.user?.position === userPos
      );
    });
    const isMaxPendingReached = samePosPending.length >= maxAllowed;
    const totalWithPending = samePosApproved.length + samePosPending.length;

    if (!inScope) {
      return {
        selectable: false,
        type: 'outside_scope',
        label: 'Outside Next Week',
      };
    }
    if (isWeekend) {
      return { selectable: false, type: 'weekend', label: 'Weekend' };
    }
    if (holiday) {
      return {
        selectable: false,
        type: 'holiday',
        label: `Holiday: ${holiday.name}`,
      };
    }
    if (isDisallowedWeekday) {
      return {
        selectable: false,
        type: 'mon_fri_restricted',
        label: 'Mandatory Office Day',
      };
    }
    if (hasUserApproved) {
      return {
        selectable: false,
        type: 'user_approved',
        label: 'Your WFH Approved',
      };
    }
    if (hasUserPending) {
      return {
        selectable: false,
        type: 'user_pending',
        label: 'Your WFH Pending',
      };
    }
    if (isMaxReached) {
      return {
        selectable: false,
        type: 'max_position_quota',
        label: 'Capacity Alert (Selectable)',
        counts: { approved: samePosApproved.length, pending: samePosPending.length, max: maxAllowed }
      };
    }
    if (totalWithPending >= maxAllowed) {
      return {
        selectable: true,
        type: 'team_pending_warning',
        label: 'Team Pending Warning',
        counts: { approved: samePosApproved.length, pending: samePosPending.length, max: maxAllowed }
      };
    }
    return { selectable: true, type: 'eligible', label: 'Eligible for WFH' };
  };

  // Handle date hover/click for info panel
  const handleDateHover = useCallback((date) => {
    const status = evaluateDateStatus(date, weekScope);
    setSelectedDateInfo({ date, status, detailed: true });
  }, [weekScope, approved, pending, holidays, disallowedWeekdays, positionConcurrency, user]);

  const handleDateClick = useCallback((date) => {
    const status = evaluateDateStatus(date, weekScope);
    setSelectedDateInfo({ date, status, detailed: true });
    setCalendarOpen(false);
  }, [weekScope, approved, pending, holidays, disallowedWeekdays, positionConcurrency, user]);

  const clearDateInfo = useCallback(() => {
    setSelectedDateInfo(null);
  }, []);

  // Generate info panel content
  const getInfoPanelContent = ({ date, status, detailed = false }) => {
    // console.log('Info panel status:', status);
    const dateStr = format(date, 'EEE, MMM d');
    
    const getStatusIcon = (type) => {
      switch (type) {
        case 'eligible': return '✅';
        case 'holiday': return '🎉';
        case 'mon_fri_restricted': return '🏢';
        case 'team_limit_reached': return '🚫';
        case 'team_pending_warning': return '⚠️';
        case 'weekend': return '🏖️';
        case 'outside_scope': return '📅';
        case 'user_approved': return '✓';
        case 'user_pending': return '⏳';
        default: return 'ℹ️';
      }
    };

    const getStatusText = (type) => {
      const { approved, pending, max } = status.counts || {};
      switch (type) {
        case 'eligible': return 'Available for WFH';
        case 'holiday': return `${status.label}`;
        case 'mon_fri_restricted': return 'Mandatory Office Day';
        case 'team_limit_reached': return 'Team Limit Reached';
        case 'team_pending_warning':
          if (approved > 0 && pending > 0) {
            return `${approved} approved, ${pending} pending for your team (${user.position})`;
          }
          else if (approved >= max) {
            return `Position at capacity (${approved} approved) for your team (${user.position})`;
          }
          else if (pending > 0) {
            return `${pending} pending for your team (${user.position})`;
          }
          return 'Team pending';
        case 'max_position_quota':
          if (approved >= max) {
            return `Position at capacity (${approved} approved) for your team (${user.position})`;
          }
          return 'Team Limit Reached';
        case 'user_approved': return 'Your WFH request is ✓ approved';
        case 'user_pending': return 'Your WFH request is ⏳ pending approval';
        case 'weekend': return 'Weekend';
        case 'outside_scope': return 'Outside Scope';
        default: return status.label || 'Unknown';
      }
    };

    const getStatusColor = (type) => {
      switch (type) {
        case 'eligible': return styles.statusEligible;
        case 'holiday': return styles.statusHoliday;
        case 'mon_fri_restricted': return styles.statusRestricted;
        case 'team_limit_reached': return styles.statusLimitReached;
        case 'team_pending_warning': return styles.statusPendingWarning;
        case 'max_position_quota': return styles.statusLimitReached;
        case 'user_approved': return styles.statusUserApproved;
        case 'user_pending': return styles.statusUserPending;
        case 'weekend': return styles.statusWeekend;
        case 'outside_scope': return styles.statusOutsideScope;
        default: return styles.statusDefault;
      }
    };

    if (detailed) {
      return (
        <>
          <div className={styles.infoPanelHeader}>
            <span className={styles.infoPanelIcon}>{getStatusIcon(status.type)}</span>
            <span className={styles.infoPanelDate}>{dateStr}</span>
          </div>
          <div className={`${styles.infoPanelDetails} ${getStatusColor(status.type)}`}>
            {getStatusText(status.type)}
          </div>
        </>
      );
    }

    return (
      <div className={styles.infoPanelBrief}>
        <span className={styles.infoPanelIcon}>{getStatusIcon(status.type)}</span>
        <span className={styles.infoPanelText}>{dateStr}: {getStatusText(status.type)}</span>
      </div>
    );
  };

  const isDateSelectable = useCallback((d) => evaluateDateStatus(d, weekScope).selectable, [weekScope, approved, pending, holidays, disallowedWeekdays, positionConcurrency, user]);

  const getDayClassName = useCallback((d) => {
    const status = evaluateDateStatus(d, weekScope);

    if (status.type === 'holiday') return 'wfh-day-holiday';
    if (status.type === 'mon_fri_restricted') return 'wfh-day-monfri';
    if (status.type === 'max_position_quota') return 'wfh-day-max-position';
    if (status.type === 'team_pending_warning') return 'wfh-day-team-pending-warning';
    if (status.type === 'eligible') return 'wfh-day-eligible';
    return 'wfh-day-outside-scope';
  }, [weekScope, approved, pending, holidays, disallowedWeekdays, positionConcurrency, user]);

  // Validation on date change
  useEffect(() => {
    if (type === 'wfh' && user && date) {
      const selected = new Date(date);
      const day = selected.getDay();

      const isHoliday = holidays.some((h) => h?.date === date);
      if (isHoliday) {
        setBlocked(true);
        return;
      }

      const { start: weekStart, end: weekEnd } = getWeekBounds(date);
      const holidaysInWeek = holidays.filter((h) => {
        if (!h?.date) return false;
        const hd = new Date(h.date);
        return hd >= weekStart && hd <= weekEnd;
      }).length;

      const baseMaxDays = user.wfhWeekly || 1;
      const effectiveMaxDays = Math.max(0, baseMaxDays - holidaysInWeek);
      if (effectiveMaxDays <= 0) {
        setBlocked(true);
        return;
      }

      if (disallowedWeekdays.includes(day)) {
        setBlocked(true);
        return;
      }

      const userId = user._id || user.id;
      const sameDay = (r) => {
        if (!r || !r.user) return false;
        const rid = r.user._id || r.user.id;
        if (rid !== userId) return false;
        const rd = new Date(r.date);
        const rdStr = new Date(
          rd.getTime() - rd.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 10);
        return rdStr === date && String(r.type).toLowerCase() === 'wfh';
      };

      const hasApprovedSameDay = approved.some(sameDay);
      const hasPendingSameDay = pending.some(sameDay);
      const limitBlocked = countsForWeek.all >= effectiveMaxDays;
      const dateBlocked = hasApprovedSameDay || hasPendingSameDay;

      setBlocked(limitBlocked || dateBlocked);

      // Keep success messages, clear others
      if (message && !message.includes('success') && !message.includes('submitted')) {
        setMessage(null);
      }
      else{
        setSubmitting(false);
        setBlocked(false);
      }
    } 
    else {
      setBlocked(false);
    }
  }, [type, user, date, approved, pending, holidays, disallowedWeekdays, countsForWeek]);

  // Custom day renderer for info panel integration
  const renderDayContents = useCallback((day, date) => {
    const status = evaluateDateStatus(date, weekScope);
    const className = status.type === 'holiday' ? 'wfh-day-holiday' :
                      status.type === 'mon_fri_restricted' ? 'wfh-day-monfri' :
                      status.type === 'max_position_quota' ? 'wfh-day-max-position' :
                      status.type === 'team_pending_warning' ? 'wfh-day-team-pending-warning' :
                      status.type === 'user_approved' ? 'wfh-day-user-approved' :
                      status.type === 'user_pending' ? 'wfh-day-user-pending' :
                      status.type === 'eligible' ? 'wfh-day-eligible' : 'wfh-day-outside-scope';

    return (
      <div
        className={className}
        onMouseEnter={() => handleDateHover(date)}
        onClick={(e) => {
          handleDateClick(date);
          setCalendarOpen(false);
          clearDateInfo(); // Clear info when date cell is clicked
        }}
        onMouseLeave={clearDateInfo}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {day}
      </div>
    );
  }, [handleDateHover, handleDateClick, clearDateInfo, weekScope, approved, pending, holidays, disallowedWeekdays, positionConcurrency, user]);

  const showAutoDismissMessage = (msg) => {
    setAutoDismissMessage(msg);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Set new timer
    timerRef.current = setTimeout(() => {
      setAutoDismissMessage(null);
      timerRef.current = null;
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    // Check if date is selected first
    if (!date) {
      setMessage('Please select a date');
      showAutoDismissMessage('Please select a date'); 
      setSubmitting(false);
      return;
    }
      
    // Client-side check for weekly WFH limit (server also enforces)
    if (type === 'wfh' && user && date) {
      const { start, end } = getWeekBounds(date);
      const userId = user._id || user.id;
      const maxDays = user.wfhWeekly || 1;
      const approvedAndPending = [...approved, ...pending].filter((r) => {
        if (!r || !r.user) return false;
        const rid = r.user._id || r.user.id;
        if (rid !== userId) return false;
        const rd = new Date(r.date);
        return rd >= start && rd <= end && String(r.type).toLowerCase() === 'wfh';
      }).length;
      if (approvedAndPending >= maxDays) {
        setMessage(`You have reached your weekly WFH limit (${maxDays}). Total this week: ${countsForWeek.all}.`);
        setSubmitting(false);
        return;
      }

      try {
        const [approvedRes, pendingRes] = await Promise.all([
          axios.get(approvedUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(pendingUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const latestApproved = approvedRes.data || [];
        const latestPending = pendingRes.data || [];
        const sameDay = (r) => {
          if (!r || !r.user) return false;
          const rid = r.user._id || r.user.id;
          if (rid !== userId) return false;
          const rd = new Date(r.date);
          const rdStr = new Date(rd.getTime() - rd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          return rdStr === date && String(r.type).toLowerCase() === 'wfh';
        };
        const hasApprovedSameDay = latestApproved.some(sameDay);
        const hasPendingSameDay = latestPending.some(sameDay);
        if (hasApprovedSameDay || hasPendingSameDay) {
          const status = hasApprovedSameDay ? 'approved' : 'pending';
          setMessage(`You already have a ${status} WFH request on this date.`);
          setSubmitting(false);
          return;
        }
      } catch (_) {
      }
    }
    try {
      const payload =
        type === 'timeoff'
          ? { type, startDate, endDate }
          : { type, date };

      const res = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage(res.data.message);
      console.log("Message set to:", res.data.message);
      setSubmitting(false);

      // Refresh data after successful submission
      try {
        const [approvedRes, pendingRes] = await Promise.all([
          axios.get(approvedUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(pendingUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setApproved(approvedRes.data || []);
        setPending(pendingRes.data || []);
      } catch (e) {
        // Data refresh failed, but submission succeeded
      }

      if (typeof onSubmitted === 'function') onSubmitted();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error submitting request.');
      console.log("Setting error message:", err.response?.data?.message);
      setSubmitting(false);
    }
  };

  // Custom Input for Click-to-Open
  const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        setCalendarOpen((prev) => {
          if (prev) clearDateInfo(); // Clear when toggling closed
          return !prev;
        });
        if (onClick) onClick(e);
      }}
      className={styles.datePickerInput}
    >
      <span className={styles.datePickerLabel}>
        {date
          ? format(parseISO(date), 'EEE, d MMM yyyy')
          : 'Select WFH date for next week...'}
      </span>
      <span className={styles.datePickerIcon}>📅 ▼</span>
    </button>
  ));

  // Datepicker Renderer
  const datePickerBasedOnRequestType = () => {
    if (type === 'wfh') {
      const selectedDateObj = date ? parseISO(date) : null;
      return (
        <div className={styles.datePickerWrapper}>
          <DatePicker
            selected={selectedDateObj}
            onChange={
              (d) => {
                setDate(d ? format(d, 'yyyy-MM-dd') : '')
              }
            }
            filterDate={isDateSelectable}
            dayClassName={getDayClassName}
            open={calendarOpen}
            onClickOutside={() => {
              setCalendarOpen(false);
              clearDateInfo();
            }}
            onInputClick={() => setCalendarOpen(true)}
            minDate={minStartDate}
            maxDate={minSunday}
            dateFormat="yyyy-MM-dd"
            customInput={<CustomDateInput />}
            renderDayContents={renderDayContents}
            fixedHeight
            popperPlacement="bottom-start"
            popperProps={{
              strategy: 'fixed',
              modifiers: [
                { name: 'preventOverflow', options: { padding: 16 } },
                { name: 'flip', options: { fallbackPlacements: ['top-start', 'top-end', 'bottom-end'] } },
              ],
            }}
            showPopperArrow={false}
          >
            <div className={styles.datePickerFooter}>
              {/* Info Panel */}
              {selectedDateInfo && (
                <div className={styles.dateInfoPanel}>
                  {/* {console.log('SELECTED:', selectedDateInfo)} */}
                  {getInfoPanelContent(selectedDateInfo)}
                </div>
              )}
              
              <div className={styles.datePickerLegend}>
                <div className={styles.datePickerLegendItem}>
                  <span className={`${styles.datePickerLegendDot} ${styles.available}`} />
                  <span>Available</span>
                </div>
                <div className={styles.datePickerLegendItem}>
                  <span className={`${styles.datePickerLegendDot} ${styles.team_limit_reached}`} />
                  <span>Team Limit Reached</span>
                </div>
                <div className={styles.datePickerLegendItem}>
                  <span className={`${styles.datePickerLegendDot} ${styles.user_requests}`} />
                  <span>Your Requests</span>
                </div>
                <div className={styles.datePickerLegendItem}>
                  <span className={`${styles.datePickerLegendDot} ${styles.team_max_pending}`} />
                  <span>Team Limit Warning</span>
                </div>
                <div className={styles.datePickerLegendItem}>
                  <span className={`${styles.datePickerLegendDot} ${styles.holiday}`} />
                  <span>Holiday</span>
                </div>
                <div className={styles.datePickerLegendItem}>
                  <span className={`${styles.datePickerLegendDot} ${styles.restricted}`} />
                  <span>Restricted Day</span>
                </div>
              </div>
            </div>
          </DatePicker>
        </div>
      );
    } else if (type === 'sick') {
      return (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      );
    } else {
      return (
        <>
          <span>from</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </>
      );
    }
  };

  return (
    <SectionWrap type="request">
      {/* show weekly quota */}
      <div className={styles.quotaDisplay}>
        <span className={styles.quotaLabel}>Weekly quota:</span>
        <span className={styles.quotaValue}>{Number(user?.wfhWeekly) || 0} day(s) / week</span>
      </div>

      {/* wfh request form */}
      <form className={styles.wfhRequestForm} onSubmit={handleSubmit} >

        <select value={type} onChange={(e) => setType(e.target.value)} >
          <option value="wfh">Work From Home</option>
          {/*<option value="sick">Sick Leave</option>
          <option value="timeoff">Time Off</option> */}
        </select>

        {datePickerBasedOnRequestType()}

        {holidayAdjustmentData?.usableDays > 0 ? (
          <button type="submit" disabled={blocked || submitting} className={styles.submitButton}>
            Submit Request
          </button>
        ) : (
          <button type="button" disabled className={styles.submitButton}>
            No Available Days
          </button>
        )}

        <div className={styles.holidayAdjustment}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
            
            {holidayAdjustmentData && (
              <span>
                <strong className={styles.holidayAdjustmentLabel}>WFH Adjustment: </strong>
                {(() => {
                  const { holidaysInWeek, weekLabel, baseMaxDays, effectiveMaxDays, annualCapDays, usableDays, usedDays } = holidayAdjustmentData;

                  // Case 1: Both holiday and annual cap
                  if (holidaysInWeek > 0 && annualCapDays < effectiveMaxDays) {
                    return (
                      <>
                        There {holidaysInWeek === 1 ? 'is' : 'are'} {holidaysInWeek} public
                        holiday{holidaysInWeek === 1 ? '' : 's'} for the week
                        <span className={styles.holidayAway}>({weekLabel})</span>.
                        Your weekly quota is reduced from {baseMaxDays} to {effectiveMaxDays} day{effectiveMaxDays === 1 ? '' : '(s)'} due to holidays,
                        and further capped to {annualCapDays} day{annualCapDays === 1 ? '' : '(s)'} by your annual balance.
                        {usedDays > 0 && ` You have used ${usedDays} day${usedDays === 1 ? '' : '(s)'} (${usableDays} remaining).`}
                      </>
                    );
                  }
                  // Case 2: Holiday adjustment only
                  if (holidaysInWeek > 0) {
                    return (
                      <>
                        There {holidaysInWeek === 1 ? 'is' : 'are'} {holidaysInWeek} public
                        holiday{holidaysInWeek === 1 ? '' : 's'} for the week
                        <span className={styles.holidayAway}>({weekLabel})</span>, automatically adjusting your
                        WFH allowance from {baseMaxDays} to {effectiveMaxDays} day{effectiveMaxDays === 1 ? '' : '(s)'}.
                        {usedDays > 0 && ` You have used ${usedDays} day${usedDays === 1 ? '' : '(s)'} (${usableDays} remaining).`}
                      </>
                    );
                  }
                  // Case 3: Annual cap only
                  if (holidaysInWeek === 0 && annualCapDays < baseMaxDays) {
                    return (
                      <>
                        Your weekly quota is {baseMaxDays} day{baseMaxDays === 1 ? '' : '(s)'} for the week
                        <span className={styles.holidayAway}>({weekLabel})</span>,
                        but capped to {annualCapDays} day{annualCapDays === 1 ? '' : '(s)'} by your annual balance.
                        {usedDays > 0 && ` You have used ${usedDays} day${usedDays === 1 ? '' : '(s)'} (${usableDays} remaining).`}
                      </>
                    );
                  }
                  // Case 4: No adjustment
                  return (
                    <>
                      No public holidays for the week
                      <span className={styles.holidayAway}>({weekLabel})</span>.
                      {usedDays > 0 ? ` You have used ${usedDays} day${usedDays === 1 ? '' : '(s)'} (${usableDays} remaining).` : ' No adjustment needed.'}
                    </>
                  );
                })()}
              </span>
            )}
        
        </div>

        {autoDismissMessage && (
          <div className={`${styles.messageCard} ${styles[`message${messageType.charAt(0).toUpperCase() + messageType.slice(1)}`]}`}>
            <div className={styles.messageIcon}>
              {messageType === 'success' && '✅'}
              {messageType === 'error' && '❌'}
              {messageType === 'info' && 'ℹ️'}
            </div>
            <span className={styles.messageText}>{autoDismissMessage}</span>
          </div>
        )}
      </form>
    </SectionWrap>
  );
};

export default WfhRequestForm;