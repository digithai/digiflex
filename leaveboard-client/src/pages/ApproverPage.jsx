import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import WfhRequestForm from '../components/WfhRequestForm';
import WfhBalance from '../components/WfhBalance';
import styles from '../styles/MainPage.module.css';
import ApprovedWfhList from '../components/ApprovedWfhList';
import { useWfhSettings } from '../hooks/useWfhSettings';
import { getTargetWeek, getWeekLabel } from '../utils/dateUtils';
import { updateUser } from '../features/auth/authSlice';

const ApproverPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleSubmitted = () => setRefreshKey((k) => k + 1);
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { settings } = useWfhSettings();
  const targetWeek = getTargetWeek(settings);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        dispatch(updateUser(data));
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    if (token) fetchUser();
  }, [token, refreshKey, dispatch]);
  
  return (
    <div className={styles.MainPage}>
      <h1 >Approver Panel</h1>
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>Request WFH</h2>
          <span className={styles.cardSubheading}>Submit a request for approval</span>
          <div className={styles.cardContent}>
            <WfhRequestForm targetWeek={targetWeek} onSubmitted={handleSubmitted} />
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
      <ApprovedWfhList showApprovedList={false} externalRefreshKey={refreshKey} />
    </div>
  );
};

export default ApproverPage;
