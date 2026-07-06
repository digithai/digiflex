import styles from '../styles/ApprovalCard.module.css';

const ApprovalCard = ({ request, onApprove, onReject, loading }) => { 
  if (!request) return null;
  const { _id, user, type, date, status } = request;

  return (
    <li className={styles.card}>
      <div>
        <h3 className={styles.name}>{user.name}</h3>
        <p><strong>Date:</strong> {new Date(date).toLocaleDateString()}</p>
      </div>
      <div>
        <button 
          className={styles.approve} 
          onClick={() => onApprove(_id)}
          disabled={loading}
          style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button 
          className={styles.reject} 
          onClick={() => onReject(_id)}
          disabled={loading}
          style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Processing...' : 'Reject'}
        </button>
      </div>
    </li>
  );
}

export default ApprovalCard;