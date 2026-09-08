import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHolidays } from '../hooks/useHolidays';
import { useWfhSettings } from '../hooks/useWfhSettings';
import styles from '../styles/MainPage.module.css';
import DonutChart from './DonutChart';
import MonthlyWeeksProgressBar from './MonthlyWeeksProgressBar';
import WfhHistoryDrawer from './WfhHistoryDrawer';

export default function WfhBalance({ refreshKey }) {
  const { holidays } = useHolidays();
  useWfhSettings();
  const { token, user } = useSelector(state => state.auth);
  const userId = user._id || user.id;
  
  const totalQuota = Number(user?.wfhAnnualQuota) || 0;
  const wfhAnnualBalance = Number(user?.wfhAnnualBalance) || 0;

  // get weekly wfh used from API
  const [approvedWFH, setApprovedWFH] = useState([]);
  const [pendingWFH, setPendingWFH] = useState([]);

  // wfh history
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // fetch WFH data (approved and pending)
  useEffect(() => {
    if(!token) return;

    const fetchWFHData = async() => {
      try{
        const headers = { Authorization: `Bearer ${token}`}
        const approvedUrl = `${import.meta.env.VITE_BASE_URL}/api/wfh/approved`;
        const approvalUrl = `${import.meta.env.VITE_BASE_URL}/api/wfh/approvals`;

        const [approvedRes, approvalRes] = await Promise.all([
          fetch(approvedUrl, {headers: headers}),
          fetch(approvalUrl, {headers: headers})
        ]);

        if (approvedRes.ok){
          const approvedData = await approvedRes.json();
          setApprovedWFH(approvedData || []);
        }

        if (approvalRes.ok){
          const approvalData = await approvalRes.json();
          setPendingWFH(approvalData || []);
        } 
      } 
      catch (error) {
        setApprovedWFH([]);
        setPendingWFH([]);
      }
    };

    fetchWFHData();
  }, [token, refreshKey]);

  const myRequests = useMemo(() => {
    return [...approvedWFH, ...pendingWFH].filter((r) => {
      if (!r || !r.user) return false;
      const rid = r.user._id || r.user.id;
      return rid === userId && String(r.type).toLowerCase() === 'wfh';
    });
  }, [approvedWFH, pendingWFH, userId]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // get upcoming public holidays
  const upcomingHolidays = holidays
    .filter((h) => {
      const hDate = new Date(h.date);
      hDate.setHours(0, 0, 0, 0);
      return hDate >= today;
    })
    .slice(0, 2) // Show next 2 holidays
    .map(h => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      const diffTime = holidayDate - today;
      const daysAway = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        name: h.name,
        date: h.date,
        daysAway
      };
    });

  return (
    <div className={styles.wfhBalance}>
      {/* WFH balance section */}
      <div className={styles.donutGrid}>
        <MonthlyWeeksProgressBar
          requests={myRequests}
          currentDate={today}
          user={user}
          holidays={holidays}
        />
        <DonutChart 
          total={totalQuota} 
          remaining={wfhAnnualBalance} 
          label="Annual Balance"
          onViewHistory={() => setIsHistoryOpen(true)}
        />
      </div>

      {/* Upcoming public holidays section */}
      <div className={styles.holidaySection}>
        <div className={styles.holidayHeading}>Upcoming public holidays</div>
        {upcomingHolidays.length > 0 ? (
        <div className={styles.holidayGrid}>
          {upcomingHolidays.map((h) => (
            <div className={styles.holidayCard} key={h.date}>
              <div className={styles.holidayHeader}>
                <span className={styles.holidayName}>{h.name}</span>
              </div>
              <div className={styles.holidayInfo}>
                <span className={styles.holidayDate}>{h.date}</span>
                <span className={styles.holidayAway}>{h.daysAway} day(s) away</span>
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div className={styles.noHolidays}>No upcoming holidays</div>
        )}
      </div>

      {/* WFH history drawer */}
      {isHistoryOpen && (
        <WfhHistoryDrawer 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
          pendingRequests={pendingWFH}
        />
      )}
    </div>
  );
};

