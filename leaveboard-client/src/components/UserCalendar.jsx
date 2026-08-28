import { useEffect, useState, useMemo, useCallback } from 'react';
import { truncateText } from '../utils/textUtils';
import { useHolidays } from '../hooks/useHolidays';
import styles from '../styles/UserCalendar.module.css';

const UserCalendar = ({ refreshKey = 0 }) => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [disallowedWeekdays, setDisallowedWeekdays] = useState([1, 5, 0, 6]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const { holidays, loading: holidaysLoading } = useHolidays(refreshKey);
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'position'

  // Generate 31 rolling dates starting from today
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
  const dates = useMemo(() => getDates(), [refreshKey]);

  const url = `${import.meta.env.VITE_BASE_URL}/api/calendar`;
  const settingsUrl = `${import.meta.env.VITE_BASE_URL}/api/settings/wfh`;
  const fetchData = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const [calRes, settingsRes] = await Promise.all([
          fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(settingsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const calData = await calRes.json();
        setUsers(calData.users || []);
        setRequests(calData.requests || []);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const serverDisallowed = (settingsData?.disallowedWeekdays?.length)
            ? settingsData.disallowedWeekdays
            : [1, 5, 0, 6];
          setDisallowedWeekdays(serverDisallowed.map((n) => Number(n)));
        } else {
          setDisallowedWeekdays([1, 5, 0, 6]);
        }
      }
      catch (e) {
        setError('Failed to load calendar data');
        setUsers([]);
        setRequests([]);
        setDisallowedWeekdays([1, 5, 0, 6]);
      }
      finally {
        setLoading(false);
      }
  }, [url, token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, refreshKey]);

  const formatDate = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  // sort users by name or position
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aValue = sortBy === 'name' ? a.name : (a.position || 'N/A');
      const bValue = sortBy === 'name' ? b.name : (b.position || 'N/A');
      
      const comparison = aValue.localeCompare(bValue);
      return comparison;
    });
  }, [users, sortBy]);

  const today = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }), []);

  // get cell content for each user and date
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

    switch(type){
      case 'wfh': 
        return <span className={styles.wfh}>{label}</span>;
      case 'sick': 
        return <span className={styles.sick}>{label}</span>;
      case 'timeoff': 
        return <span className={styles.timeoff}>{label}</span>;
      default: 
        return <div>{label}</div>
    }
  };

  const handleRetry = () => {
    fetchData();
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.calendarTitle}>Team Work From Home Calendar</h2>
      <span className={styles.calendarSubtitle}>31-day rolling schedule of team attendance, holidays, and pending requests</span>
      
      {(loading || holidaysLoading) && (
        <div className={styles.stateMessage}>
          <div className={styles.stateContent}>
            <div className={styles.loadingIcon}>⟳</div>
            <p>Loading Calendar...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className={styles.stateMessage}>
          <div className={styles.stateContent}>
            <div className={styles.errorIcon}>⚠</div>
            <p>{error}</p>
            <button onClick={handleRetry}>Reload</button>
          </div>
        </div>
      )}
      
      {!loading && !error && (
        <>
          <div className={styles.calendarWrapper}>
            <div className={styles.namesColumn}>
              <div 
                className={styles.columnHeader} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  userSelect: 'none',
                  fontSize: '13px'
                }}
              >
                {/* Option 1: Click to sort by Name (Default) */}
                <span 
                  onClick={() => setSortBy('name')}
                  style={{ 
                    cursor: 'pointer',
                    fontWeight: sortBy === 'name' ? 'bold' : 'normal',
                    textDecoration: sortBy === 'name' ? 'underline' : 'none',
                    opacity: sortBy === 'name' ? 1 : 0.6
                  }}
                >
                  Name
                </span>

                <span style={{ opacity: 0.4 }}>/</span>

                {/* Option 2: Click to sort by Team */}
                <span 
                  onClick={() => setSortBy('position')}
                  style={{ 
                    cursor: 'pointer',
                    fontWeight: sortBy === 'position' ? 'bold' : 'normal',
                    textDecoration: sortBy === 'position' ? 'underline' : 'none',
                    opacity: sortBy === 'position' ? 1 : 0.6
                  }}
                >
                  Team
                </span>
              </div>

              {sortedUsers.map((user) => (
                <div key={user._id} className={styles.nameCell}>
                  <div className={styles.userName}>
                    {sortBy === 'name' ? user.name : user.position || "N/A"}
                  </div>
                  <div className={styles.userPosition} title={user.position || "N/A"}>
                    {sortBy === 'name' ? user.position || "N/A" : user.name}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.dataGrid}>
              <div className={styles.dateHeaders}>
                {dates.map((date) => {
                  const isToday = formatDate(date) === today;
                  return (
                    <div key={formatDate(date)} className={`${styles.dateHeader} ${isToday ? styles.todayHeader : ''}`}>
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
              <span className={styles.legendColor} style={{ background: 'linear-gradient(135deg, var(--grey-dark) 0%, #374151 100%)', opacity: 0.35 }}></span>
              <span>Weekend</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#fff', border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #9ca3af 2px, #9ca3af 4px, transparent 4px, transparent 6px)', opacity: 0.25 }}></span>
              </span>
              <span>Restricted Day</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.25)' }}></span>
              <span>Holiday</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserCalendar;