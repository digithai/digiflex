import { useState } from 'react';
import { FaBars } from 'react-icons/fa';
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation } from 'react-router-dom';
import styles from '../styles/Sidebar.module.css';
import { isMobile } from 'react-device-detect';
import { logout } from '../features/auth/authSlice';


const SideBar = () => {
  const { user, tenant } = useSelector((state) => state.auth);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();


  const handleLogout = () => {
      dispatch(logout());
    };

  const toggleSidebar = () => setIsOpen(prev => !prev);

  const closeSidebar = () => {
    if (isMobile) setIsOpen(false);
  };

  const isTenantAdmin = ['tenant_admin'].includes(user?.role);
  const isApprover = user?.role === 'approver';
  const isSuperAdmin = ['superadmin'].includes(user?.role);
  const onApprovalsPage = location.pathname === '/approvals';
  const onHistorySection = onApprovalsPage && location.hash === '#history';
  const onPendingSection = onApprovalsPage && location.hash !== '#history';

  return (
    <>
    {isMobile && (
        <button onClick={toggleSidebar} className={styles.hamburger}>
          <FaBars />
        </button>
      )}

      <div className={isMobile ? `${styles.sidebarMobile} ${isOpen ? styles.open : styles.closed}` : `${styles.sidebar}`}>
        <div className={styles.brandBlock}>
          <div className={styles.appName}>DigiFlex</div>
          <div className={styles.welcome}>Welcome, {user?.name || 'User'}</div>
          {!isSuperAdmin && (
            <div className={styles.tenantName}>{tenant?.name || 'Tenant'}</div>
          )}
        </div>

        {isSuperAdmin && (
          <ul className={styles.sidebarList}>
            <li><Link to="/tenants" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/tenants' ? styles.active : ''}`}>Tenants</Link></li>
            <li><a className={styles.logout} onClick={handleLogout} >Logout</a></li>
          </ul>
        )}

        {isTenantAdmin && (
          <ul className={styles.sidebarList}>
            <li><Link to="/" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}>Dashboard</Link></li>
            <li><Link to="/approvals" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/approvals' ? styles.active : ''}`}>Approvals</Link></li>
            <li><Link to="/team" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/team' ? styles.active : ''}`}>Team</Link></li>
            <li><Link to="/settings" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/settings' ? styles.active : ''}`}>Settings</Link></li>
            <li><a className={styles.logout} onClick={handleLogout} >Logout</a></li>
          </ul>
        )}

        {isApprover && (
          <ul className={styles.sidebarList}>
            <li><Link to="/" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}>Dashboard</Link></li>
            <li><Link to="/approvals" onClick={closeSidebar} className={`${styles.link} ${onPendingSection ? styles.active : ''}`}>Pending Requests</Link></li>
            <li><Link to="/approvals#history" onClick={closeSidebar} className={`${styles.link} ${onHistorySection ? styles.active : ''}`}>Approvals History</Link></li>
            <li><a className={styles.logout} onClick={handleLogout} >Logout</a></li>
          </ul>
        )}

        {user.role === 'user' && (
          <ul className={styles.sidebarList}>
            <li><Link to="/" onClick={closeSidebar} className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}>Dashboard</Link></li>
             <li><a className={styles.logout} onClick={handleLogout} >Logout</a></li>
          </ul>
        )}
      </div>
    </>
  );
};

export default SideBar;
