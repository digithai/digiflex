import styles from '../styles/SectionWrap.module.css'; 
const SectionWrap = ({ children, type }) => {
  return (
    <div className={styles[type]}>
      {children}
    </div>
  );
}

export default SectionWrap;