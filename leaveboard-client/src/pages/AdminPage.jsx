import WfhRequestForm from '../components/WfhRequestForm';
import styles from '../styles/MainPage.module.css';
import ApprovedWfhList from '../components/ApprovedWfhList';

const AdminPage = () => {
  return (
    <div className={styles.MainPage}>
      <h1>Admin Panel</h1>
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <h2 className={styles.cardHeading}>Request WFH</h2>
          <span className={styles.cardSubheading}>Submit a request for approval</span>
          <div className={styles.cardContent}>
            <WfhRequestForm />
          </div>
        </div>
        {/* <div className={styles.cardEmpty}> */}
          {/* WFH Balance - admin specific */}
        {/* </div> */}
      </div>
      <ApprovedWfhList showApprovedList={false} />
    </div>
  );
};

export default AdminPage;
