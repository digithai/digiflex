import { useEffect, useState } from 'react';
import styles from '../styles/UserCalendar.module.css';

const truncateText = (text, maxLength) => {
  if (!text) return 'Holiday';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const UserCalendar = ({ refreshKey = 0 }) => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [disallowedWeekdays, setDisallowedWeekdays] = useState([1, 5, 0, 6]);
  const token = localStorage.getItem('token');

  const getDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = today.getDay() === 0 ? new Date(today.setDate(today.getDate() + 1)) : new Date(today);
    const dates = [];
    let currentDate = new Date(startDate);
    for (let i = 0; i < 31; i++) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const dates = getDates();
  const url = `${import.meta.env.VITE_BASE_URL}/api/calendar`;
  const holidaysUrl = `${import.meta.env.VITE_BASE_URL}/api/holidays`;
  const settingsUrl = `${import.meta.env.VITE_BASE_URL}/api/settings/wfh`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [calRes, holRes, settingsRes] = await Promise.all([
          fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(holidaysUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(settingsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const calData = await calRes.json();
        setUsers(calData.users || []);
        setRequests(calData.requests || []);

        if (holRes.ok) {
          const holData = await holRes.json();
          setHolidays(Array.isArray(holData) ? holData : []);
        } else {
          setHolidays([]);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const serverDisallowed = (settingsData?.disallowedWeekdays?.length) 
            ? settingsData.disallowedWeekdays 
            : [1, 5, 0, 6];
          setDisallowedWeekdays(serverDisallowed.map((n) => Number(n)));
        } else {
          setDisallowedWeekdays([1, 5, 0, 6]);
        }
      } catch (e) {
        setUsers([]);
        setRequests([]);
        setHolidays([]);
        setDisallowedWeekdays([1, 5, 0, 6]);
      }
    };
    if (token) {
      fetchData();
    }
  }, [url, holidaysUrl, token, refreshKey]);

  const formatDate = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  const getCellContent = (user, date) => {
    const dayStr = formatDate(date);
    const holiday = holidays.find((h) => h?.date === dayStr);

    if (holiday) {
      const displayName = truncateText(holiday.name || 'Holiday', 7);
      return <div className={styles.holiday} title={holiday.name || 'Holiday'}>{displayName}</div>;
    }

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isDisallowedWeekday = disallowedWeekdays.includes(dayOfWeek) && !isWeekend;

    if (isWeekend) {
      return <div className={styles.weekend}></div>;
    }

    if (isDisallowedWeekday) {
      return <div className={styles.disallowedWeekday}></div>;
    }

    const req = requests.find(
      (r) => r?.user?._id === user._id && formatDate(new Date(r.date)) === dayStr
    );
    if (!req) return <div></div>;

    const type = String(req.type).toLowerCase();
    const label = String(req.type).toUpperCase();

    if (req.status === 'pending' && type === 'wfh') {
      return <span className={styles.pending}>{label}</span>;
    }

    if (type === 'wfh') {
      return <span className={styles.wfh}>{label}</span>;
    }

    return <div className={styles[type]}>{label}</div>
  };

  return (
    <div className={styles.container}>
      <h2>Team WFH Calendar</h2>
      <div className={styles.calendarWrapper}>
        <div className={styles.namesColumn}>
          <div className={styles.columnHeader}>Name</div>
          {sortedUsers.map((user) => (
            <div key={user._id} className={styles.nameCell}>{user.name}</div>
          ))}
        </div>
        <div className={styles.dataGrid}>
          <div className={styles.dateHeaders}>
            {dates.map((date) => {
              const isToday = formatDate(date) === today;
              return (
                <div key={date} className={`${styles.dateHeader} ${isToday ? styles.todayHeader : ''}`}>
                  <div className={styles.weekday}>{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className={styles.dateText}>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                </div>
              );
            })}
          </div>
          {sortedUsers.map((user) => (
            <div key={user._id} className={styles.userRow}>
              {dates.map((date) => (
                <div key={`${user._id}-${formatDate(date)}`} className={styles.cell}>
                  {getCellContent(user, date)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'linear-gradient(135deg, var(--green) 0%, #16a34a 100%)' }}></span>
          <span>WFH</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'linear-gradient(135deg, var(--yellow) 0%, #ca8a04 100%)' }}></span>
          <span>Pending</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'linear-gradient(135deg, var(--grey-dark) 0%, #374151 100%)' }}></span>
          <span>Weekend</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)' }}></span>
          <span>Holiday</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#fff', border: '1px solid #e5e7eb', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #9ca3af 2px, #9ca3af 4px, transparent 4px, transparent 6px)', opacity: 0.5 }}></span>
          </span>
          <span>Restricted Day</span>
        </div>
      </div>
    </div>
  );
};

export default UserCalendar;