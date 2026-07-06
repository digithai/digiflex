import { useState } from 'react';
import axios from 'axios';
import styles from '../styles/ApprovedCard.module.css';

const API = `${import.meta.env.VITE_BASE_URL}/api/wfh`;

const ApprovedCard = ({ request, onDeleted, onDateChanged, onCalendarRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(request.date?.split('T')[0] || '');
  const [loading, setLoading] = useState(false);

  // DELETE WFH request
  const handleDelete = async () => {
    if (!request._id) return alert('Request ID missing!');
    if (!window.confirm('Are you sure you want to delete this request?')) return;

    try {
      setLoading(true);
      // Delegate the actual DELETE API call to the parent handler to avoid double-calling the endpoint
      await onDeleted(request._id);
      if (onCalendarRefresh) onCalendarRefresh();
    } catch (err) {
      console.error('Error deleting request:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to delete request.');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE WFH date
  const handleSaveDate = async () => {
    if (!request._id) return alert('Request ID missing!');
    if (!date) return alert('Please select a date.');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await axios.put(
        `${API}/approved/${request._id}/date`,
        { date },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onDateChanged(res.data); // Update parent state
      setShowModal(false);
      if (onCalendarRefresh) onCalendarRefresh();
    } catch (err) {
      console.error('Error updating date:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to update date.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.approvedCard}>
      <div>
        <strong>{request.user?.name || request.userName}</strong>
        <div>{new Date(request.date).toLocaleDateString()}</div>
      </div>

      <div className={styles.approvedCardButtons}>
        <button onClick={() => setShowModal(true)} disabled={loading} className={styles.changeButton}>
          Change Date
        </button>
        <button onClick={handleDelete} disabled={loading} className={styles.dangerButton}>
          Delete
        </button>
      </div>

      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Change Date</h3>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <div className={styles.modalActions}>
              <button onClick={handleSaveDate} disabled={loading} className={styles.saveButton}>
                Save
              </button>
              <button onClick={() => setShowModal(false)} disabled={loading} className={styles.dangerButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default ApprovedCard;
