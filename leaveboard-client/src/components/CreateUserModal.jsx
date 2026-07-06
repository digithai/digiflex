import { useState } from "react";
import axios from "axios";
import styles from '../styles/CreateUserModal.module.css';
import { useSelector } from 'react-redux';
import { validateEmail, validatePassword } from '../utils/validation';
import { getRoleLabel, getAvailableRoles } from '../utils/roleLabels.js';

const CreateUserModal = ({ isOpen, onClose, onUserCreated, token }) => {

    const authUser = useSelector((state) => state.auth.user);
    const roles = getAvailableRoles(authUser?.role);
    const positions = ['Dev', 'CEO', 'COO', 'CTO', 'HR', 'QA', 'PO', 'Sales'];

    const [formData, setFormData] = useState({
        name: '',
    email: '',
    password: '',
    role: '',
    position: '',
    wfhWeekly: '',
    leaveCounts: {
      sickLeave: '',
      timeOff: ''
    },
    team: '',
    office: '',
    country: ''
  });

  const [error, setError] = useState('');

  const validateForm = () => {
    const { name, email, password, role } = formData;
    if (!name || !role) {
      return 'All required fields must be filled.';
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return emailError;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return passwordError;
    }

    return null;
  };

    const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const url = `${import.meta.env.VITE_BASE_URL}/api/auth/register`;

        try {
            await axios.post(url, formData, { 
                headers: {Authorization: `Bearer ${token}` }
            });
            onUserCreated(); // Notify parent component
            onClose(); // Close modal
            setFormData({
                name: '',
                email: '',
                password: '',
                role: '',
                position: '',
                wfhWeekly: '',
                leaveCounts: {
                    sickLeave: '',
                    timeOff: ''
                },
                team: '',
                office: '',
                country: ''
            });
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Failed to create user. Please try again.');
        }
    };

    if(!isOpen) {
        return null; // Don't render anything if modal is closed
    }

    return (
      <div className={styles.backdrop}>
        <div className={styles.modal}>
          <h3>Create New User</h3>
          <form onSubmit={handleSubmit}>
            <input
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0' }}>
              Password must be at least 8 characters with letters, numbers, and symbols.
            </p>

            {/* Role Dropdown */}
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {['superadmin'].includes(authUser?.role) && (
              <p style={{ marginTop: 4, marginBottom: 4, height: 'auto', color: '#6b7280' }}>
                Superadmins can assign tenant admin from the tenant portal.
              </p>
            )}

            {/* Position Dropdown */}
            <select name="position" value={formData.position} onChange={handleChange}>
              <option value="">Select Position</option>
              {positions.map(position => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>

            {/* Numeric Inputs */}
            <input
              type="number"
              name="wfhWeekly"
              placeholder="Weekly Work From Home day user can take"
              value={formData.wfhWeekly}
              onChange={handleChange}
            />

            {/* Optional Inputs */}
            <input
              name="team"
              placeholder="Team"
              value={formData.team}
              onChange={handleChange}
            />
            <input
              name="office"
              placeholder="Office"
              value={formData.office}
              onChange={handleChange}
            />
            <input
              name="country"
              placeholder="Country"
              value={formData.country}
              onChange={handleChange}
            />

            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button className={styles.create} type="submit">Create</button>
            <button className={styles.cancel} type="button" onClick={onClose}>Cancel</button>
          </form>
        </div>
      </div>
    )
}

export default CreateUserModal;