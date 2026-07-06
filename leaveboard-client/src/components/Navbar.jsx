import { useSelector } from 'react-redux';
import styles from '../styles/Navbar.module.css';
import {isMobile } from 'react-device-detect';


const Navbar = () => {
  const { user, tenant } = useSelector((state) => state.auth);


  return (
    <nav className={isMobile ? styles.navbarMobile : styles.navbar}>
        <div className={styles.identity}>
          <h2 className={styles.name}>Welcome, {user.name}</h2>
          <p className={styles.tenantLabel}>
            {tenant?.name || 'Tenant'}
          </p>
        </div>
    </nav>
  );
};

export default Navbar;