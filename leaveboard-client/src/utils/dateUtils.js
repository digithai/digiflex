export const getWeekBounds = (date) => {
  const dt = new Date(date);
  const day = dt.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(dt);
  start.setDate(dt.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
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