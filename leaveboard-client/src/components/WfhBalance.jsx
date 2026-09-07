import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHolidays } from '../hooks/useHolidays';
import { useWfhSettings } from '../hooks/useWfhSettings';
import { getTargetWeek, getWeekLabel } from '../utils/dateUtils';
import styles from '../styles/MainPage.module.css';
import DonutChart from './DonutChart';
import WfhHistoryDrawer from './WfhHistoryDrawer';

export default function WfhBalance({ refreshKey }) {
  const { holidays } = useHolidays();
  const { settings } = useWfhSettings();
  const { token, user } = useSelector(state => state.auth);
  const userId = user._id || user.id;
  
  const weeklyQuota = Number(user?.wfhWeekly) || 0;
  const totalQuota = Number(user?.wfhAnnualQuota) || 0;
  const wfhAnnualBalance = Number(user?.wfhAnnualBalance) || 0;

  // Use shared utility functions
  const { start: weekStart, end: weekEnd } = getTargetWeek(settings);
  const weekLabel = getWeekLabel(weekStart);

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

  // pre calculate normalized dates for filtering
  const normalizedStart = new Date(weekStart);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(weekEnd);
  normalizedEnd.setHours(23, 59, 59, 999);

  // filter approved wfh requests for current user in current week
  const weeklyApproved = approvedWFH.filter(request => {
    if (!request.user) return false;
    const requestId = request.user._id || request.user.id; 
    if (requestId !== userId) return false; // Filter by current user
    
    const reqDate = new Date(request.date);
    const normalizedReqDate = new Date(reqDate);
    normalizedReqDate.setHours(0, 0, 0, 0);

    return (
      normalizedReqDate >= normalizedStart && 
      normalizedReqDate <= normalizedEnd && 
      request.type === 'wfh' && 
      request.status === 'approved'
    );
  }).length;

  // filter pending wfh requests for current user in current week
  const weeklyPending = pendingWFH.filter(request => {
    if (!request.user) return false;
    const requestId = request.user._id || request.user.id; 
    if (requestId !== userId) return false; // Filter by current user
    
    const reqDate = new Date(request.date);
    const normalizedReqDate = new Date(reqDate);
    normalizedReqDate.setHours(0, 0, 0, 0);

    return (
      normalizedReqDate >= normalizedStart && 
      normalizedReqDate <= normalizedEnd && 
      request.type === 'wfh' && 
      request.status === 'pending'
    );
  }).length;

  const weeklyUsed = weeklyApproved + weeklyPending;

  // calculate holidays in the current week
  const holidaysInWeek = holidays.filter(h => {
    const holidayDate = new Date(h.date);
    holidayDate.setHours(0, 0, 0, 0);
    return holidayDate >= new Date(weekStart) && holidayDate <= new Date(weekEnd);
  }).length;
  
  const weeklyRemaining = Math.max(
    0, 
    Math.min(wfhAnnualBalance, weeklyQuota - weeklyUsed - holidaysInWeek)
  );

  // effective weekly total after capped with annual balance
  const effectiveWeeklyTotal = weeklyUsed + weeklyRemaining;

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
        <DonutChart 
          total={effectiveWeeklyTotal} 
          remaining={weeklyRemaining} 
          label={
            <span>
              Weekly Balance 
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
                ({weekLabel})
              </span>
            </span>
          }
        />
        <DonutChart 
          total={totalQuota} 
          remaining={wfhAnnualBalance} 
          label={
            <span>
              Annual Balance 
              <button
                className={styles.viewHistoryButton}
                onClick={() => setIsHistoryOpen(true)}
              >
                <span style={{ fontSize: '11px' }}>
                  (View History)
                </span>
              </button>
            </span>
          }
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

