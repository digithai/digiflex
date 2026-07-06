import WfhRequestForm from '../components/WfhRequestForm';
import styles from '../styles/MainPage.module.css';
import ApprovedWfhList from '../components/ApprovedWfhList';

const AdminPage = () => {
  return (
    <div className={styles.MainPage}>
      <h1>Admin Panel</h1>
      <WfhRequestForm />
      <ApprovedWfhList showApprovedList={false} />
    </div>
  );
};

export default AdminPage;
