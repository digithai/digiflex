import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Wrapper from '../components/Wrapper';
import styles from '../styles/MainPage.module.css';
import { validateEmail, validatePassword } from '../utils/validation';

const initialCreateTenantForm = {
  name: '',
  slug: '',
};

const initialTenantAdminForm = {
  name: '',
  email: '',
  password: '',
};

const sanitizeTenantForm = (tenant) => ({
  _id: tenant._id,
  name: tenant.name || '',
  slug: tenant.slug || '',
  isActive: !!tenant.isActive,
});

const TenantPortal = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [createTenantForm, setCreateTenantForm] = useState(initialCreateTenantForm);
  const [viewMode, setViewMode] = useState('list');
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  const [editTenantForm, setEditTenantForm] = useState(null);
  const [adminForm, setAdminForm] = useState(initialTenantAdminForm);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const baseUrl = `${import.meta.env.VITE_BASE_URL}/api/tenants`;
  const token = localStorage.getItem('token');

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant._id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = Array.isArray(res.data) ? res.data : [];
      setTenants(payload);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTenants();
    }
  }, [token]);

  const handleOpenList = () => {
    setViewMode('list');
    setSelectedTenantId(null);
    setEditTenantForm(null);
    setAdminForm(initialTenantAdminForm);
    setError('');
  };

  const handleOpenEdit = (tenant) => {
    setSelectedTenantId(tenant._id);
    setEditTenantForm(sanitizeTenantForm(tenant));
    setViewMode('edit');
    setError('');
    setMessage('');
  };

  const handleOpenManageAdmins = (tenant) => {
    setSelectedTenantId(tenant._id);
    setAdminForm(initialTenantAdminForm);
    setViewMode('admins');
    setError('');
    setMessage('');
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await axios.post(
        baseUrl,
        {
          name: createTenantForm.name,
          slug: createTenantForm.slug,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCreateTenantForm(initialCreateTenantForm);
      setMessage('Tenant created successfully.');
      fetchTenants();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create tenant');
    }
  };

  const handleSaveTenant = async () => {
    if (!editTenantForm) return;
    setMessage('');
    setError('');

    try {
      await axios.put(
        `${baseUrl}/${editTenantForm._id}`,
        {
          name: editTenantForm.name,
          slug: editTenantForm.slug,
          isActive: editTenantForm.isActive,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage('Tenant updated successfully.');
      await fetchTenants();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update tenant');
    }
  };

  const handleDeactivateTenant = async (tenant) => {
    if (!window.confirm(`Deactivate tenant "${tenant.name}"?`)) return;
    setMessage('');
    setError('');

    try {
      await axios.delete(`${baseUrl}/${tenant._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(`Tenant "${tenant.name}" deactivated.`);
      fetchTenants();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to deactivate tenant');
    }
  };

  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Are you sure you want to permanently delete tenant "${tenant.name}"? This will delete all associated users, holidays, WFH requests, and settings. This action cannot be undone.`)) return;
    setMessage('');
    setError('');

    try {
      await axios.delete(`${baseUrl}/${tenant._id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(`Tenant "${tenant.name}" deleted permanently.`);
      fetchTenants();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete tenant');
    }
  };

  const handleCreateTenantAdmin = async () => {
    if (!selectedTenantId) return;

    if (!adminForm.name) {
      setError('Tenant admin name is required.');
      return;
    }

    const emailError = validateEmail(adminForm.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(adminForm.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setAdminSubmitting(true);
      setError('');
      setMessage('');

      await axios.post(
        `${baseUrl}/${selectedTenantId}/admins`,
        adminForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAdminForm(initialTenantAdminForm);
      setMessage('Tenant admin created successfully.');
      fetchTenants();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create tenant admin');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleRemoveTenantAdmin = async (tenantId, adminId) => {
    if (!window.confirm('Remove this tenant admin?')) return;

    try {
      setError('');
      setMessage('');
      await axios.delete(`${baseUrl}/${tenantId}/admins/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('Tenant admin removed successfully.');
      fetchTenants();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to remove tenant admin');
    }
  };

  const renderTenantList = () => (
    <section style={{ width: '100%', maxWidth: 860 }}>
      <h2 style={{ marginBottom: 12 }}>Tenants</h2>
      {tenants.length === 0 && <p>No tenants found.</p>}
      {tenants.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>Name</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>Slug</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant._id}>
                <td style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>{tenant.name}</td>
                <td style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>{tenant.slug}</td>
                <td style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => handleOpenEdit(tenant)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleOpenManageAdmins(tenant)}>
                    Manage admins
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTenant(tenant)}
                    style={{
                      backgroundColor: 'var(--red)',
                      color: 'var(--white)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  const renderEditView = () => {
    if (!editTenantForm || !selectedTenant) {
      return <p>Tenant not found.</p>;
    }

    return (
      <section style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 8 }}>
        <h2>Edit Tenant</h2>
        <p style={{ marginTop: 0 }}>Editing <strong>{selectedTenant.name}</strong></p>
        <input
          placeholder="Tenant name"
          value={editTenantForm.name}
          onChange={(e) => setEditTenantForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input
          placeholder="Tenant slug"
          value={editTenantForm.slug}
          onChange={(e) => setEditTenantForm((prev) => ({ ...prev, slug: e.target.value }))}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={editTenantForm.isActive}
            onChange={(e) => setEditTenantForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Active
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={handleSaveTenant}>Save</button>
          {selectedTenant.isActive && (
            <button type="button" onClick={() => handleDeactivateTenant(selectedTenant)}>Deactivate</button>
          )}
          <button type="button" onClick={handleOpenList}>Back</button>
        </div>
      </section>
    );
  };

  const renderManageAdminsView = () => {
    if (!selectedTenant) {
      return <p>Tenant not found.</p>;
    }

    return (
      <section style={{ width: '100%', maxWidth: 680, display: 'grid', gap: 12 }}>
        <h2>Manage Tenant Admins</h2>
        <p style={{ marginTop: 0 }}>
          Tenant: <strong>{selectedTenant.name}</strong> ({selectedTenant.slug})
        </p>

        <div>
          <h3 style={{ marginBottom: 8 }}>Existing tenant admins</h3>
          {selectedTenant.tenantAdmins?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {selectedTenant.tenantAdmins.map((admin) => (
                <li key={admin._id} style={{ marginBottom: 8 }}>
                  {admin.name} ({admin.email})
                  <button
                    type="button"
                    style={{ marginLeft: 8 }}
                    onClick={() => handleRemoveTenantAdmin(selectedTenant._id, admin._id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No tenant admins yet.</p>
          )}
        </div>

        <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <h3 style={{ marginBottom: 0 }}>Add tenant admin</h3>
          <input
            placeholder="Name"
            value={adminForm.name}
            onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            placeholder="Email"
            type="email"
            value={adminForm.email}
            onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            placeholder="Password"
            type="password"
            value={adminForm.password}
            onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0' }}>
            Password must be at least 8 characters with letters, numbers, and symbols.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleCreateTenantAdmin} disabled={adminSubmitting}>
              {adminSubmitting ? 'Creating...' : 'Create tenant admin'}
            </button>
            <button type="button" onClick={handleOpenList}>Back</button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <Wrapper>
      <div className={styles.MainPage}>
        <h1>Tenant Portal</h1>
        <p>Superadmins can create tenants and manage each tenant in dedicated views.</p>

        {viewMode === 'list' && (
          <section style={{ width: '100%', maxWidth: 520, marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Create Tenant</h2>
            <form onSubmit={handleCreateTenant} style={{ display: 'grid', gap: 8 }}>
              <input
                placeholder="Tenant name"
                value={createTenantForm.name}
                onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <input
                placeholder="Tenant slug"
                value={createTenantForm.slug}
                onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, slug: e.target.value }))}
                required
              />
              <button
                type="submit"
                style={{
                  width: 'fit-content',
                  padding: '8px 14px',
                  backgroundColor: 'var(--green)',
                  color: 'var(--white)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Create tenant
              </button>
            </form>
          </section>
        )}

        {message && <p style={{ color: 'var(--green)' }}>{message}</p>}
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        {loading && <p>Loading tenants...</p>}

        {!loading && viewMode === 'list' && renderTenantList()}
        {!loading && viewMode === 'edit' && renderEditView()}
        {!loading && viewMode === 'admins' && renderManageAdminsView()}
      </div>
    </Wrapper>
  );
};

export default TenantPortal;
