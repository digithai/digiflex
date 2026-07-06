import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import logo from '../assets/Logo_no_text.png';
import styles from '../styles/LoginPage.module.css';
import { setTenantSlug } from '../features/auth/authSlice';

const RegisterTenant = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('');
  const [createdTenant, setCreatedTenant] = useState(null);
  const [loading, setLoading] = useState(false);

  const url = `${import.meta.env.VITE_BASE_URL}/api/auth/tenants/register`;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedSlug = slug.trim().toLowerCase();
    if (!name.trim() || !normalizedSlug) {
      setStatus('Tenant name and tenant slug are required.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const response = await axios.post(url, {
        name: name.trim(),
        slug: normalizedSlug,
      });

      const tenant = response.data?.tenant || response.data;
      setCreatedTenant(tenant);
      dispatch(setTenantSlug(tenant?.slug || normalizedSlug));
      setStatus('Tenant created successfully.');
    } catch (error) {
      const message = error.response?.data?.message?.toLowerCase();
      if (message?.includes('duplicate') || message?.includes('exists') || message?.includes('slug')) {
        setStatus('Duplicate tenant slug. Please choose another slug.');
      } else {
        setStatus(error.response?.data?.message || 'Unable to create tenant.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    const nextSlug = createdTenant?.slug || slug.trim().toLowerCase();
    dispatch(setTenantSlug(nextSlug));
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <img className={styles.logo} src={logo} alt="Logo" width={100} />
      <h2>Create Tenant</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Tenant name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digithai"
            required
          />
        </label>
        <label className={styles.field}>
          <span>Tenant slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="digithai"
            required
          />
        </label>
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Creating...' : 'Create tenant'}
        </button>
        <div className={styles.actions}>
          <Link to="/login" className={styles.link}>Back to login</Link>
          {createdTenant && (
            <button type="button" className={styles.secondaryButton} onClick={handleGoToLogin}>
              Continue to login
            </button>
          )}
        </div>
        {status && <p className={status.toLowerCase().includes('success') ? styles.status : styles.error}>{status}</p>}
        {createdTenant && (
          <p className={styles.status}>
            Tenant <strong>{createdTenant.name || name}</strong> is ready. Continue to login or go to user creation if your admin flow is available after sign-in.
          </p>
        )}
      </form>
    </div>
  );
};

export default RegisterTenant;
