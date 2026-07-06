import styles from '../styles/RejectedCard.module.css';

const RejectedCard = ({ request }) => {
  return (
    <div className={styles.rejectedCard}>
      <div>
        <strong>{request.user?.name || request.userName}</strong>
        <div>{new Date(request.date).toLocaleDateString()}</div>
      </div>

      <div className={styles.rejectionReason}>
        <strong>Reason:</strong> {request.rejectionReason || 'No reason provided'}
      </div>
    </div>
  );
};

export default RejectedCard;
