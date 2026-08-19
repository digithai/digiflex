import { useEffect, useRef, useState } from 'react';
import WfhRequestForm from '../components/WfhRequestForm';
import UserCalendar from '../components/UserCalendar';
import WFHRules from '../components/WFHRules';
import styles from '../styles/MainPage.module.css';
import { useHolidays } from '../hooks/useHolidays';
import { useWfhSettings } from '../hooks/useWfhSettings';
import { useSelector } from 'react-redux';
import { getTargetWeek, getWeekLabel } from '../utils/dateUtils';
import Chart from 'chart.js/auto';

const UserPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const rulesContentRef = useRef(null);
  const handleSubmitted = () => setRefreshKey((k) => k + 1);
  const { settings } = useWfhSettings();
  
  const targetWeek = getTargetWeek(settings);
  const currentWeekLabel = getWeekLabel(targetWeek.start);

  const checkScrollHint = () => {
    const el = rulesContentRef.current;
    if (!el) return;
    const isScrollable = el.scrollHeight > el.clientHeight;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    setShowScrollHint(isScrollable && !isAtBottom);
  };

  useEffect(() => {
    checkScrollHint();
    const el = rulesContentRef.current;
    if (!el) return;

    const handleScroll = () => checkScrollHint();
    el.addEventListener('scroll', handleScroll);

    const mutationObserver = new MutationObserver(checkScrollHint);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', handleScroll);
      mutationObserver.disconnect();
    };
  }, []);


  return (
    <div className={styles.MainPage}>
      <h1 >User Panel</h1>
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>Request WFH</h2>
          <span className={styles.cardSubheading}>Submit a request for approval</span>
          <div className={styles.cardContent}>
            <WfhRequestForm 
              onSubmitted={handleSubmitted} 
              targetWeek={targetWeek} 
            />
          </div>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>WFH Balance</h2>
          <span className={styles.cardSubheading}>Quota and upcoming holidays</span>
          <div className={styles.cardContent}>
            <WfhBalance />
          </div>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>Work From Home Policy</h2>
          <span className={styles.cardSubheading}>Company compliance guidelines</span>
          <div
            ref={rulesContentRef}
            className={`${styles.cardContent} ${styles.scrollHint} ${showScrollHint ? styles.showHint : ''}`}
          >
            <WFHRules />
          </div>
        </div>
      </div>
      <UserCalendar refreshKey={refreshKey} />
      </div>
  );
};

const DonutChart = ({ total, remaining, label }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  const percentage = total > 0 ? (remaining / total) * 100 : 0;
  const used = total - remaining;

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const blueColor = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#3b82f6';
 

      // Create new chart
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Remaining', 'Used'],
          datasets: [{
            data: [remaining, used],
            backgroundColor: [
              blueColor,
              '#e2e8f0'
            ],
            borderWidth: 0,
            cutout: '70%' // This creates the donut hole
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: false
            }
          },
          animation: {
            animateRotate: true,
            animateScale: false
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [remaining, total]);

  return (
    <div className={styles.donutWrapper}>
      <div className={styles.donutChartContainer}>
        <canvas ref={chartRef} />
        <div className={styles.donutCenterText}>
          <div className={styles.donutValue}>{remaining}</div>
          <div className={styles.donutUnit}>days left</div>
        </div>
      </div>
      <div className={styles.donutLabel}>{label}</div>
      {used < total ? (
        <div className={styles.donutMeta}>{used} / {total} used</div>
      ) : (
        <div className={styles.donutMeta}>{total} / {total} used</div>
      )}
    </div>
  );
};

export const WfhBalance = () => {
  const { holidays } = useHolidays();
  const { settings } = useWfhSettings();
  const { token, user } = useSelector(state => state.auth);
  
  const weeklyQuota = user.wfhWeekly || 2;
  const totalQuota = user.wfhAnnualQuota || 30;
  const wfhAnnualBalance = user.wfhAnnualBalance || 30;

  // Use shared utility functions
  const { start: weekStart, end: weekEnd } = getTargetWeek(settings);
  const weekLabel = getWeekLabel(weekStart);

  // get weekly wfh used from API
  const [approvedWFH, setApprovedWFH] = useState([]);
  useEffect(() => {
    const fetchApprovedRequests = async() => {
      try{
        const approvedUrl = `${import.meta.env.VITE_BASE_URL}/api/wfh/approved`;
        const response = await fetch(approvedUrl, {
          headers: { Authorization: `Bearer ${token}`}
        });

        if (response.ok) {
          const data = await response.json();
          setApprovedWFH(data || []);
        }
      } 
      catch (error) {
        setApprovedWFH([]);
      }
    };

    if (token) {
      fetchApprovedRequests();
    }
  }, [token]);
  const weeklyUsed = approvedWFH.filter(request => {
    if (!request.user) return false;

    const userId = user._id || user.id;
    const requestId = request.user._id || request.user.id; 

    if (requestId !== userId) return false; // Filter by current user
    
    const reqDate = new Date(request.date);
    const normalizedReqDate = new Date(reqDate);
    normalizedReqDate.setHours(0, 0, 0, 0);

    const normalizedStart = new Date(weekStart);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = new Date(weekEnd);
    normalizedEnd.setHours(23, 59, 59, 999);

    return normalizedReqDate >= normalizedStart && normalizedReqDate <= normalizedEnd && 
         request.type === 'wfh' && request.status === 'approved';
  }).length;

  // Calculate holidays in the current week
  const holidaysInWeek = holidays.filter(h => {
    const holidayDate = new Date(h.date);
    holidayDate.setHours(0, 0, 0, 0);
    return holidayDate >= new Date(weekStart) && holidayDate <= new Date(weekEnd);
  }).length;
  
  const weeklyRemaining = Math.max(0, weeklyQuota - weeklyUsed - holidaysInWeek);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= today)
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
      <div className={styles.donutGrid}>
        <DonutChart 
          total={weeklyQuota} 
          remaining={weeklyRemaining} 
          label={
            <span>
              Weekly Balance 
              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>
                ({weekLabel})
              </span>
            </span>
          }
        />
        <DonutChart 
          total={totalQuota} 
          remaining={wfhAnnualBalance} 
          label="Annual Balance" 
        />
      </div>

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
    </div>
  );
};

export default UserPage;