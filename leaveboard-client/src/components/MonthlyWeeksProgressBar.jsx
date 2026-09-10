import { useMemo } from 'react';
import {
  addDays,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { getWfhWeekBalance } from '../utils/dateUtils';
import styles from '../styles/MonthlyWeeksProgressBar.module.css';

const formatShortDate = (date) => format(date, 'd MMM');

const getMonthWorkWeeks = (currentDate) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const firstMonday = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weeks = [];
  let currentMonday = firstMonday;

  while (currentMonday <= monthEnd) {
    const weekStart = new Date(currentMonday);
    const weekEnd = addDays(weekStart, 4); // Monday to Friday
    weekEnd.setHours(23, 59, 59, 999);

    const overlapsMonth =
      weekStart <= monthEnd && weekEnd >= monthStart;

    if (overlapsMonth) {
      weeks.push({ start: weekStart, end: weekEnd });
    }

    currentMonday = addDays(currentMonday, 7);
  }

  return weeks;
};

const MonthlyWeeksProgressBar = ({
  requests = [],
  currentDate = new Date(),
  user = null,
  holidays = [],
}) => {
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  const weeks = useMemo(() => getMonthWorkWeeks(current), [current]);

  const weekData = useMemo(() => {
    return weeks.map((week) => {
      const balance = user
        ? getWfhWeekBalance({
            user,
            requests,
            holidays,
            weekStart: week.start,
            weekEnd: week.end,
          })
        : null;

      const effectiveQuota = balance ? balance.baseMaxDays : 0;
      const used = balance ? Math.max(0, effectiveQuota - balance.usableDays) : 0;
      const isCurrent = isWithinInterval(current, {
        start: week.start,
        end: week.end,
      });
      const isPast = week.end < current;
      const percentage =
        effectiveQuota > 0
          ? Math.min(100, (balance.usableDays / effectiveQuota) * 100)
          : 0;

      return {
        ...week,
        used,
        effectiveQuota,
        isCurrent,
        isPast,
        percentage,
      };
    });
  }, [weeks, requests, current, user, holidays]);

  const currentMonthYear = format(current, 'MMMM yyyy');

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.title}>Weekly Balance</div>
        </div>
        <div className={styles.totalBadge}>
          {currentMonthYear}
        </div>
      </div>

      <div className={styles.weeksList}>
        {weekData.map((week, index) => {
          const rowClass = [
            styles.weekRow,
            week.isCurrent ? styles.weekRowCurrent : '',
            week.isPast ? styles.weekRowPast : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={index} className={rowClass}>
              <div
                className={[
                  styles.labelCol,
                  week.isCurrent ? styles.labelColCurrent : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {formatShortDate(week.start)} - {formatShortDate(week.end)}
                {week.isCurrent && <span className={styles.nowBadge}>Now</span>}
              </div>

              <div className={styles.barCol}>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: `${week.percentage}%` }}
                  />
                </div>
              </div>

              <div className={styles.valueCol}>
                {week.used} / {week.effectiveQuota} used
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>* Includes weekly, holiday and annual balance caps</div>
    </div>
  );
};

export default MonthlyWeeksProgressBar;
