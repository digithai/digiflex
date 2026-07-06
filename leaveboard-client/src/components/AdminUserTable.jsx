// client/components/AdminUserTable.jsx
import { useState } from 'react';
import styles from '../styles/AdminUserTable.module.css';
import { useSelector } from 'react-redux';
import EditWfhModal from './EditWfhModal.jsx';
import { getRoleLabel } from '../utils/roleLabels.js';

const AdminUserTable = ({ users, refreshUsers }) => {
  const { user } = useSelector(state => state.auth);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const token = localStorage.getItem('token');

  const url = import.meta.env.VITE_BASE_URL;

  const handleDelete = async (id, e) => {
     if (e) e.preventDefault();

    const confirmed = window.confirm('Are you sure you want to delete this user?');
    if (!confirmed) return;

    await fetch(`${url}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    refreshUsers();
  };

  const handlePasswordChange = (id, value) => {
    setPasswords((prev) => ({ ...prev, [id]: value }));
  };

  const updatePassword = async (id) => {
    const password = passwords[id];
    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const res = await fetch(`${url}/api/admin/users/${id}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (res.ok) {
      alert('Password updated');
      setPasswords((prev) => ({ ...prev, [id]: '' }));
    } else {
      alert(data.message || 'Error updating password');
    }
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className={styles.TableContainer}>
      <h2>User Management</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{getRoleLabel(u.role)}</td>
              <td>
                 <button
                   onClick={() => openEdit(u)}
                   className={styles.updatePassword}
                 >
                   Edit
                 </button>
                 {user._id !== u._id && (
                   <button
                     onClick={() => handleDelete(u._id)}
                     className={styles.deleteButton}
                   >
                     Delete
                   </button>
                 )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <EditWfhModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        user={selectedUser}
        token={token}
        onUpdated={refreshUsers}
      />
    </div>
  );
};

export default AdminUserTable;
