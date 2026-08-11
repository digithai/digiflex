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
        {/* <div className={styles.cardEmpty}> */}
          {/* WFH Balance - to be implemented later */}
        {/* </div> */}
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

export default UserPage;