import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchApprovedRequests } from '../app/approvalsSlice';
import ApprovedCard from './ApprovedCard';
import axios from 'axios';
import UserCalendar from './UserCalendar';
import styles from '../styles/ApprovedWfhList.module.css';
import { getRoleLabel } from '../utils/roleLabels.js';

const API = `${import.meta.env.VITE_BASE_URL}/api/wfh`;

// Example values
const formatDateLocal = (date) => {
  const d = new Date(date);
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
};

const ApprovedWfhList = ({ showApprovedList = true }) => {
  const dispatch = useDispatch();
  const { approvedRequests, loading, error } = useSelector((state) => state.approvals);

  const user = useSelector((state) => state.auth.user);
  const canManageWfh = ['tenant_admin', 'approver'].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    dispatch(fetchApprovedRequests());
  }, [dispatch]);

  useEffect(() => {
    setRequests(approvedRequests);
  }, [approvedRequests]);

  // Fetch users when opening the modal (admins/approvers only)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isModalOpen || !canManageWfh) return;
      try {
        setLoadingUsers(true);
        const token = localStorage.getItem('token');
        const base = import.meta.env.VITE_BASE_URL;
        const res = await fetch(`${base}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAllUsers(Array.isArray(data) ? data.sort((a, b) => a.name.localeCompare(b.name)) : []);
      } catch (_) {
        setAllUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [isModalOpen, user, canManageWfh]);

  // Unified handleDelete for approved requests
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/approved/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(requests.filter((r) => r._id !== id));
      // Optionally refresh redux list as source of truth
      dispatch(fetchApprovedRequests());
    } catch (err) {
      console.error('Error deleting request:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to delete request.');
    }
  };

  // Handle date change
  const handleDateChanged = (updatedRequest) => {
    // Remove from local list so the card disappears immediately
    setRequests(requests.filter((r) => r._id !== updatedRequest._id));
    // Optionally re-fetch list for consistency
    dispatch(fetchApprovedRequests());
  };

const today = formatDateLocal(new Date());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <UserCalendar key={refreshKey} />
      </div>
      {showApprovedList && <h2>Approved WFH Requests</h2>}

      {canManageWfh && (
          <button
            onClick={() => {
              setIsModalOpen(true);
            }}
            className={styles.createWfhButton}
          >
            Create WFH
          </button>
        )}
      {showApprovedList && (
        <>
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && approvedRequests.length === 0 && <p>No approved requests found.</p>}
          
          <ul className={styles.approvedWfhList}>
            {requests.map((r, i) => {
              if(formatDateLocal(requests[i].date) > today) {
                return (
                  <ApprovedCard
                    key={r._id}
                    request={r}
                    onDeleted={handleDelete}
                    onDateChanged={handleDateChanged}
                    onCalendarRefresh={() => setRefreshKey((k) => k + 1)}
                  />
                );
              } else {
                return null;
              }
            })}
          </ul>
        </>
      )}

      {isModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{ background: '#fff', padding: 20, borderRadius: 8, minWidth: 320, maxWidth: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, color: 'var(--blue)' }}>Create WFH</h3>
            {loadingUsers ? (
              <p>Loading users...</p>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: 6 }}>User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className={styles.modalInput}
                >
                  <option value="">Select a user</option>
                  {allUsers
                    .filter((u) => u._id !== user?._id)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({getRoleLabel(u.role)})
                      </option>
                    ))}
                </select>

                <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={styles.modalInput}
                />

                <div className={styles.modalActions}>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className={`${styles.modalButton} ${styles.modalCancelButton}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedUserId || !selectedDate) return alert('Select user and date');
                      try {
                        setSubmitting(true);
                        const token = localStorage.getItem('token');
                        await axios.post(
                          `${API}/request`,
                          { type: 'wfh', date: selectedDate, userId: selectedUserId, allowAnyDate: true, status: 'approved' },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        alert('WFH request created and approved successfully.');
                        setIsModalOpen(false);
                        setSelectedUserId('');
                        setSelectedDate('');
                        setRefreshKey((k) => k + 1);
                        dispatch(fetchApprovedRequests());
                      } catch (err) {
                        alert(err.response?.data?.message || 'Failed to create request');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className={`${styles.modalButton} ${styles.modalSubmitButton}`}
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedWfhList;
