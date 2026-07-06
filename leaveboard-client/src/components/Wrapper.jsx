import SideBar from "./SideBar";
import { useLocation } from "react-router-dom";
import styles from '../styles/Dashboard.module.css'; 
import {isMobile } from 'react-device-detect';

const Wrapper = ({ children }) => {

const isInLoginPage = useLocation().pathname === '/login';
const isInForgotPage = useLocation().pathname === '/forgot-password';
const hideShell = isInLoginPage || isInForgotPage;

if(isMobile) {
  return (
    <main className={isMobile ? styles.dashboardMobile : styles.dashboard}>
    {!hideShell && <SideBar className={isMobile ? styles.sideBarMobile : styles.sideBar} />}
    <div className={isMobile ? styles.mainContentMobile : styles.mainContent}>
        {children}
    </div>
    </main>
  );
} else {
  return(
  <main className={isMobile ? styles.dashboardMobile : styles.dashboard}>
    {!hideShell && <SideBar className={isMobile ? styles.sideBarMobile : styles.sideBar} />}
    <div className={isMobile ? styles.mainContentMobile : styles.mainContent}>
        {children}
    </div>
    </main>
  )
}
} 

export default Wrapper;