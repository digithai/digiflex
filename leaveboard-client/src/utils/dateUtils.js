export const getWeekBounds = (date) => {
  const dt = new Date(date);
  const day = dt.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(dt);
  start.setDate(dt.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Monday to Friday workweek
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const formatDate = (date) => date.toLocaleDateString('en-GB', { 
  month: 'short', day: 'numeric' 
});

export const getWeekLabel = (date) => {
  const { start, end } = getWeekBounds(date);
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export const getTargetWeek = (settings) => {
  if (!settings) return getWeekBounds(new Date());
  
  if (settings.allowedDateScopes?.thisWeek) {
    return getWeekBounds(new Date());
  } 
  else if (settings.allowedDateScopes?.nextWeek) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return getWeekBounds(nextWeek);
  }
  return getWeekBounds(new Date());
};

export const getWfhWeekBalance = ({ user, requests = [], holidays = [], weekStart, weekEnd }) => {
  const baseMaxDays = Number(user?.wfhWeekly) || 1;
  const wfhAnnualBalance = Number(user?.wfhAnnualBalance) || 0;
  const userId = user?._id || user?.id;

  const holidaysInWeek = (holidays || []).filter((h) => {
    if (!h?.date) return false;
    const hd = new Date(h.date);
    return hd >= weekStart && hd <= weekEnd;
  }).length;

  const effectiveMaxDays = Math.max(0, baseMaxDays - holidaysInWeek);
  const annualCapDays = Math.min(effectiveMaxDays, wfhAnnualBalance);

  const usedDays = (requests || []).filter((r) => {
    if (!r || !r.user) return false;
    const rid = r.user._id || r.user.id;
    if (rid !== userId) return false;
    const rd = new Date(r.date);
    if (rd < weekStart || rd > weekEnd) return false;
    if (String(r.type).toLowerCase() !== 'wfh') return false;
    const status = String(r.status).toLowerCase();
    if (status === 'rejected') return false;
    return true;
  }).length;

  const usableDays = Math.max(0, annualCapDays - usedDays);

  return {
    baseMaxDays,
    holidaysInWeek,
    effectiveMaxDays,
    annualCapDays,
    usedDays,
    usableDays,
    weekLabel: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
  };
};
