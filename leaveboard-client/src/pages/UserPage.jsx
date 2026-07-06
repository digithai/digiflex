import { useState } from 'react';
import WfhRequestForm from '../components/WfhRequestForm';
import UserCalendar from '../components/UserCalendar';
import WFHRules from '../components/WFHRules';
import styles from '../styles/MainPage.module.css';

const UserPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleSubmitted = () => setRefreshKey((k) => k + 1);

  return (
    <div className={styles.MainPage}>
      <h1 >User Panel</h1>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' }}>
      <WfhRequestForm onSubmitted={handleSubmitted} />
      <WFHRules />
      </div>
      <UserCalendar refreshKey={refreshKey} />
      </div>
  );
};

export default UserPage;
