import WfhRequestForm from '../components/WfhRequestForm';
import { WfhBalance } from '../pages/UserPage';
import styles from '../styles/MainPage.module.css';
import ApprovedWfhList from '../components/ApprovedWfhList';
import { useWfhSettings } from '../hooks/useWfhSettings';
import { getTargetWeek, getWeekLabel } from '../utils/dateUtils';

const AdminPage = () => {
  const { settings } = useWfhSettings();
  const targetWeek = getTargetWeek(settings);
  const currentWeekLabel = getWeekLabel(targetWeek.start);
  
  return (
    <div className={styles.MainPage}>
      <h1>Admin Panel</h1>
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>Request WFH</h2>
          <span className={styles.cardSubheading}>Submit a request for approval</span>
          <div className={styles.cardContent}>
            <WfhRequestForm targetWeek={targetWeek} />
          </div>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>WFH Balance</h2>
          <span className={styles.cardSubheading}>Quota and upcoming holidays</span>
          <div className={styles.cardContent}>
            <WfhBalance />
          </div>
        </div>
      </div>
      <ApprovedWfhList showApprovedList={false} />
    </div>
  );
};

export default AdminPage;
