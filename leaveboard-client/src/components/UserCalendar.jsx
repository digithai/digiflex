import { useEffect, useState } from 'react';
import styles from '../styles/UserCalendar.module.css';

const UserCalendar = ({ refreshKey = 0 }) => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [disallowedWeekdays, setDisallowedWeekdays] = useState([1, 5, 0, 6]); // default: Mon, Fri, weekend
  const token = localStorage.getItem('token');

  // Compute 31 days in advance
  const getDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If today is Sunday, skip to tomorrow
  const startDate = today.getDay() === 0 ? new Date(today.setDate(today.getDate() + 1)) : new Date(today);

  const dates = [];
  let currentDate = new Date(startDate);

  // Generate 31 days
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
          fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(holidaysUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(settingsUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
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
          const serverDisallowed =
            (settingsData && settingsData.disallowedWeekdays && settingsData.disallowedWeekdays.length)
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

  // Sort users alphabetically by name
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  const getCell = (userId, date) => {

    const dayStr = formatDate(date);
    const key = `${userId}-${dayStr}`;

    const holiday = holidays.find((h) => h?.date === dayStr);

    if (holiday) {
      return <td key={key} className={styles.holiday}>{holiday.name || 'Holiday'}</td>;
    }

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const isDisallowedWeekday = disallowedWeekdays.includes(dayOfWeek) && !isWeekend;

    if (isWeekend) {
      return <td key={key} className={styles.weekend}></td>;
    }

    if (isDisallowedWeekday) {
      return <td key={key} className={styles.disallowedWeekday}></td>;
    }

    const req = requests.find(
      (r) => r?.user?._id === userId && formatDate(new Date(r.date)) === dayStr
    );
    if (!req) return <td key={key}></td>;

    const type = String(req.type).toLowerCase();
    const label = String(req.type).toUpperCase();

    // Highlight pending WFH in yellow
    if (req.status === 'pending' && type === 'wfh') {
      return <td key={key} className={styles.pending}>{label}</td>;
    }

    return <td key={key} className={styles[type]}>{label}</td>;
  }


  return (
    <div className={styles.container}>
      <h2 >Team WFH Calendar</h2>
      <table >
        <thead>
          <tr >
            <th >Name</th>
            {dates.map((date) => (
              <th key={date} >
                {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => (
            <tr key={user._id} >
              <td >{user.name}</td>
              {dates.map((date) => getCell(user._id, date))}
            </tr>
          ))}
        </tbody>
      </table>
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
          <span>Weekend/Holiday</span>
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
