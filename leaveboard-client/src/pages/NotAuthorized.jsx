import { Link } from 'react-router-dom';
import styles from '../styles/NotAuthorized.module.css';

const NotAuthorized = () => (
  <div className={styles.notAuthorizedContainer}>
    <h1>🚫 Not Authorized</h1>
    <p>You do not have permission to view this page.</p>
    <Link to="/">Go back</Link>
  </div>
);

export default NotAuthorized;
