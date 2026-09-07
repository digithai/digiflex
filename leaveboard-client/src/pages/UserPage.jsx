import { useEffect, useRef, useState } from 'react';
import WfhRequestForm from '../components/WfhRequestForm';
import UserCalendar from '../components/UserCalendar';
import WFHRules from '../components/WFHRules';
import { FiInfo, FiX, FiFileText } from 'react-icons/fi';
import styles from '../styles/MainPage.module.css';
import { useHolidays } from '../hooks/useHolidays';
import { useWfhSettings } from '../hooks/useWfhSettings';
import { useSelector } from 'react-redux';
import { getTargetWeek } from '../utils/dateUtils';
import Chart from 'chart.js/auto';
import { useDispatch } from 'react-redux';
import { updateUser } from '../features/auth/authSlice';
import DonutChart from '../components/DonutChart';
import WfhBalance from '../components/WfhBalance';


const UserPage = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const rulesContentRef = useRef(null);
  const handleSubmitted = () => setRefreshKey((k) => k + 1);
  const { settings } = useWfhSettings();
  const targetWeek = getTargetWeek(settings);

  const checkScrollHint = () => {
    const el = rulesContentRef.current;
    if (!el) return;
    const isScrollable = el.scrollHeight > el.clientHeight;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    setShowScrollHint(isScrollable && !isAtBottom);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await res.json();
        dispatch(updateUser(data));
      }
      catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    if (token) {
      fetchUser();
    }
  }, [token, refreshKey, dispatch]);

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
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>User Panel</h1>
        <button
          type="button"
          className={styles.policyButtonRight}
          onClick={() => setShowPolicy(true)}
          title="Work From Home Rules"
        >
          <FiInfo className={styles.policyButtonIcon} />
          <span>See WFH Rules</span>
        </button>
      </div>

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
            <WfhBalance refreshKey={refreshKey} />
          </div>
        </div>
      </div>

      {showPolicy && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPolicy(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.policyModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.policyModalTop} />
            <div className={styles.policyModalHeader}>
              <div className={styles.policyModalTitleGroup}>
                <FiFileText className={styles.policyModalTitleIcon} />
                <h2 className={styles.policyModalTitle}>Work From Home Rules</h2>
              </div>

              <button
                type="button"
                className={styles.policyModalClose}
                onClick={() => setShowPolicy(false)}
                aria-label="Close policy"
              >
                <FiX />
              </button>
            </div>
            <div className={styles.policyModalContent}>
              <WFHRules />
            </div>
            <div className={styles.policyModalFooter}>
              <button
                type="button"
                className={styles.policyModalFooterButton}
                onClick={() => setShowPolicy(false)}
              >
                Got it, thanks
              </button>
            </div>
          </div>
        </div>
      )}

      <UserCalendar refreshKey={refreshKey} />
    </div>
  );
};

export default UserPage;