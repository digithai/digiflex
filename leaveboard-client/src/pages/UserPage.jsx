import { useEffect, useRef, useState } from 'react';
import WfhRequestForm from '../components/WfhRequestForm';
import UserCalendar from '../components/UserCalendar';
import WFHRules from '../components/WFHRules';
import styles from '../styles/MainPage.module.css';

const UserPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const rulesContentRef = useRef(null);
  const handleSubmitted = () => setRefreshKey((k) => k + 1);

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
            <WfhRequestForm onSubmitted={handleSubmitted} />
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

const DonutChart = ({ total, used, label }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const usedDash = total > 0 ? (used / total) * circumference : 0;
  const remaining = total - used;

  return (
    <div className={styles.donutWrapper}>
      <svg 
        className={styles.donutSvg} 
        viewBox="0 0 100 100"
        shapeRendering="geometricPrecision"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle 
          className={styles.donutTrack} 
          cx="50" 
          cy="50" 
          r={radius} 
          shapeRendering="geometricPrecision"
        />
        <circle
          className={styles.donutFill}
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={`${usedDash} ${circumference}`}
          shapeRendering="geometricPrecision"
        />
        <text 
          x="50" 
          y="48" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          className={styles.donutValue}
          shapeRendering="optimizeLegibility"
        >
          {remaining}
        </text>
        <text 
          x="50" 
          y="65" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          className={styles.donutUnit}
          shapeRendering="optimizeLegibility"
        >
          days left
        </text>
      </svg>
      <div className={styles.donutLabel}>{label}</div>
      <div className={styles.donutMeta}>{used} / {total} used</div>
    </div>
  );
};

export const WfhBalance = () => {
  const weeklyQuota = 2;
  const weeklyUsed = 1;
  const totalQuota = 20;
  const totalUsed = 8;
  const upcomingHolidays = [
    { name: 'Independence Day', date: '2026-08-20', daysAway: 9 },
    { name: 'National Day', date: '2026-08-25', daysAway: 14 },
  ];

  return (
    <div className={styles.wfhBalance}>
      <div className={styles.donutGrid}>
        <DonutChart total={weeklyQuota} used={weeklyUsed} label="Weekly Balance" />
        <DonutChart total={totalQuota} used={totalUsed} label="Total Balance" />
      </div>

      <div className={styles.holidaySection}>
        <div className={styles.holidayHeading}>Upcoming public holidays</div>
        <div className={styles.holidayGrid}>
          {upcomingHolidays.map((h) => (
            <div className={styles.holidayCard} key={h.date}>
              <div className={styles.holidayHeader}>
                <span className={styles.holidayName}>{h.name}</span>
              </div>
              <div className={styles.holidayInfo}>
                <span className={styles.holidayDate}>{h.date}</span>
                <span className={styles.holidayAway}>{h.daysAway} days away</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserPage;