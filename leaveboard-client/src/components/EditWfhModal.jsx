import { useState, useEffect } from "react";
import axios from "axios";
import styles from '../styles/CreateUserModal.module.css';
import { useSelector } from 'react-redux';
import { getRoleLabel, getAvailableRoles } from '../utils/roleLabels.js';
import { validatePassword } from '../utils/validation.js';

const EditWfhModal = ({ isOpen, onClose, user, token, onUpdated }) => {
  const { user: currentUser } = useSelector(state => state.auth);
  const [value, setValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableRoles = getAvailableRoles(currentUser?.role);
  const canChangeRole = currentUser?.role === 'tenant_admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    if (user) {
      setValue(user.wfhWeekly ?? '');
      setNewPassword('');
      setRole(user.role);
      setPosition(user.position || '');
      setError('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
      setError('wfhWeekly must be a non-negative number');
      return;
    }

    if (newPassword) {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setLoading(true);
    try {
      const base = `${import.meta.env.VITE_BASE_URL}/api/admin/users/${user._id}`;
      // Update wfhWeekly
      await axios.put(`${base}/wfhWeekly`, { wfhWeekly: num }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      // Optionally update password
      if (newPassword) {
        await axios.put(`${base}/password`, { password: newPassword }, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
      }
      // Update role if changed and user has permission
      if (canChangeRole && role !== user.role && currentUser._id !== user._id) {
        await axios.put(`${base}/role`, { role }, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
      }
      // Update position if changed and user has permission
      if (canChangeRole && position !== (user.position || '')) {
        await axios.put(`${base}/position`, { position }, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
      }
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error('Error updating user in modal:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to update. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h3>Edit User</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{user.email}</div>
          </div>
          <input
            type="number"
            name="wfhWeekly"
            placeholder="Weekly WFH days"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={0}
          />
          {canChangeRole && currentUser._id !== user._id && (
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          )}
          {canChangeRole && (
            <select
              name="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">No position</option>
              <option value="Dev">Dev</option>
              <option value="CEO">CEO</option>
              <option value="COO">COO</option>
              <option value="CTO">CTO</option>
              <option value="HR">HR</option>
              <option value="QA">QA</option>
              <option value="PO">PO</option>
              <option value="Sales">Sales</option>
            </select>
          )}
          <input
            type="password"
            name="newPassword"
            placeholder="New Password (optional)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0' }}>
            Password must be at least 8 characters with letters, numbers, and symbols.
          </p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button className={styles.create} type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button className={styles.cancel} type="button" onClick={onClose} disabled={loading}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default EditWfhModal;
