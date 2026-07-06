import WfhRequestForm from '../components/WfhRequestForm';
import styles from '../styles/MainPage.module.css';
import ApprovedWfhList from '../components/ApprovedWfhList';

const ApproverPage = () => {

  
  return (
    <div className={styles.MainPage}>
      <h1 >Approver Panel</h1>
      <WfhRequestForm />
      <ApprovedWfhList showApprovedList={false} />
    </div>
  );
};

export default ApproverPage;
