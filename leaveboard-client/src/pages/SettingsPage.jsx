import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import Wrapper from '../components/Wrapper';
import styles from '../styles/MainPage.module.css';
import modalStyles from '../styles/CreateUserModal.module.css';

const SettingsPage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // WFH rules settings state
  const [wfhSettings, setWfhSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [calendarSettingsLoading, setCalendarSettingsLoading] = useState(false);
  const [calendarCredentialsDirty, setCalendarCredentialsDirty] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const isTenantAdmin = ['tenant_admin'].includes(user?.role);
  const canManageSettings = isTenantAdmin;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');

  const baseUrl = `${import.meta.env.VITE_BASE_URL}/api/holidays`;
  const wfhSettingsUrl = `${import.meta.env.VITE_BASE_URL}/api/settings/wfh`;

  const maskPrivateKeyInCredentials = (rawCredentials) => {
    const raw = String(rawCredentials || '').trim();
    if (!raw) return '';

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.private_key) {
        return JSON.stringify({ ...parsed, private_key: '**********' }, null, 2);
      }
    } catch {
      // Keep raw value if it is not valid JSON
    }

    return raw;
  };

  const sanitizeSettingsForUi = (settingsData) => {
    if (!settingsData) return null;
    const next = { ...settingsData };

    if (next.googleCalendar) {
      next.googleCalendar = {
        ...next.googleCalendar,
        serviceAccountCredentialsFile: maskPrivateKeyInCredentials(next.googleCalendar.serviceAccountCredentialsFile),
      };
    }

    return next;
  };

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHolidays(res.data || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load holidays';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCalendarToggle = () => {
    setWfhSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        googleCalendar: {
          ...(prev.googleCalendar || {}),
          enabled: !prev.googleCalendar?.enabled,
        },
      };
    });
  };

  const handleGoogleCalendarFieldChange = (key, value) => {
    if (key === 'serviceAccountCredentialsFile') {
      setCalendarCredentialsDirty(true);
    }

    setWfhSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        googleCalendar: {
          ...(prev.googleCalendar || {}),
          [key]: value,
        },
      };
    });
  };

  const fetchWfhSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError('');
      const res = await axios.get(wfhSettingsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWfhSettings(sanitizeSettingsForUi(res.data || null));
      setCalendarCredentialsDirty(false);
    } catch (err) {
      console.error('Error fetching WFH settings:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load WFH settings';
      setSettingsError(msg);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (token && canManageSettings) {
      // Holidays are visible to both admins and approvers
      fetchHolidays();

      // Only admins can configure WFH rules
      if (isTenantAdmin) {
        fetchWfhSettings();
      }
    } else {
      // If user is not allowed or token missing, stop loading to avoid infinite spinner
      setLoading(false);
    }
  }, [token, user, canManageSettings, isTenantAdmin]);

  const handleScopeToggle = (key) => {
    setWfhSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        allowedDateScopes: {
          ...prev.allowedDateScopes,
          [key]: !prev.allowedDateScopes?.[key],
        },
      };
    });
  };

  const handleWeekdayToggle = (weekday) => {
    // Always keep weekend (0,6) disallowed for safety; allow toggling Mon–Fri only
    const baseLocked = [0, 6];
    setWfhSettings((prev) => {
      if (!prev) return prev;
      const current = prev.disallowedWeekdays || baseLocked;
      let next;
      if (current.includes(weekday)) {
        next = current.filter((d) => d !== weekday);
      } else {
        next = [...current, weekday];
      }
      baseLocked.forEach((d) => {
        if (!next.includes(d)) next.push(d);
      });
      return { ...prev, disallowedWeekdays: next };
    });
  };

  const positions = ['Dev', 'CEO', 'COO', 'CTO', 'HR', 'QA', 'PO', 'Sales'];

  const handleConcurrencyChange = (position, value) => {
    const num = value === '' ? '' : Number(value);
    if (num !== '' && (Number.isNaN(num) || num < 0)) return;
    setWfhSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        positionConcurrency: {
          ...(prev.positionConcurrency || {}),
          [position]: num,
        },
      };
    });
  };

  const handleSaveWfhSettings = async (e) => {
    e.preventDefault();
    if (!wfhSettings) return;

    try {
      setSettingsLoading(true);
      setSettingsError('');

      const payload = {
        allowedDateScopes: wfhSettings.allowedDateScopes || {},
        disallowedWeekdays: (wfhSettings.disallowedWeekdays || []).map((n) => Number(n)),
        positionConcurrency: wfhSettings.positionConcurrency || {},
      };

      await axios.put(wfhSettingsUrl, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error saving WFH settings:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save WFH settings';
      setSettingsError(msg);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveGoogleCalendarSettings = async (e) => {
    e.preventDefault();
    if (!wfhSettings) return;

    try {
      setCalendarSettingsLoading(true);
      setSettingsError('');

      const payload = {
        googleCalendar: {
          enabled: !!wfhSettings.googleCalendar?.enabled,
          calendarId: wfhSettings.googleCalendar?.calendarId || '',
          calendarUser: wfhSettings.googleCalendar?.calendarUser || '',
        },
      };

      const nextCredentials = String(wfhSettings.googleCalendar?.serviceAccountCredentialsFile || '').trim();
      if (calendarCredentialsDirty && nextCredentials) {
        payload.googleCalendar.serviceAccountCredentialsFile = nextCredentials;
      }

      const res = await axios.put(wfhSettingsUrl, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      setWfhSettings(sanitizeSettingsForUi(res.data || null));
      setCalendarCredentialsDirty(false);
    } catch (err) {
      console.error('Error saving Google Calendar settings:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save Google Calendar settings';
      setSettingsError(msg);
    } finally {
      setCalendarSettingsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingHoliday(null);
    setFormName('');
    setFormDate('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setEditingHoliday(holiday);
    setFormName(holiday.name || '');
    setFormDate(holiday.date || '');
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formDate) {
      setError('Name and date are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = { name: formName, date: formDate };
      if (editingHoliday) {
        await axios.put(`${baseUrl}/${editingHoliday._id}`, payload, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(baseUrl, payload, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      }
      await fetchHolidays();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving holiday:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save holiday';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (holiday) => {
    if (!window.confirm(`Delete holiday "${holiday.name}" on ${holiday.date}?`)) return;
    try {
      setLoading(true);
      setError('');
      await axios.delete(`${baseUrl}/${holiday._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchHolidays();
    } catch (err) {
      console.error('Error deleting holiday:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete holiday';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <div className={styles.MainPage}>
        <h1>Settings</h1>
        {!canManageSettings && (
          <p>You do not have permission to manage settings.</p>
        )}

        {canManageSettings && (
          <>
            {/* WFH Rules Settings (Admin only) */}
            {isTenantAdmin && (
              <section style={{ width: '100%', marginBottom: 32 }}>
                <h2>WFH Rules</h2>
                {settingsError && <p style={{ color: 'red' }}>{settingsError}</p>}
                {settingsLoading && <p>Loading WFH settings...</p>}
                {!settingsLoading && wfhSettings && (
                  <form onSubmit={handleSaveWfhSettings} style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h3>Date range where WFH requests are allowed</h3>
                      <label style={{ marginRight: 12 }}>
                        <input
                          type="checkbox"
                          checked={!!wfhSettings.allowedDateScopes?.thisWeek}
                          onChange={() => handleScopeToggle('thisWeek')}
                          style={{
                            accentColor: 'var(--green)'
                          }}
                        />{' '}
                        This week
                      </label>
                      <label style={{ marginRight: 12 }}>
                        <input
                          type="checkbox"
                          checked={!!wfhSettings.allowedDateScopes?.nextWeek}
                          onChange={() => handleScopeToggle('nextWeek')}
                          style={{
                            accentColor: 'var(--green)'
                          }}
                        />{' '}
                        Next week
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!wfhSettings.allowedDateScopes?.withinMonth}
                          onChange={() => handleScopeToggle('withinMonth')}
                          style={{
                            accentColor: 'var(--green)'
                          }}
                        />{' '}
                        Within current month
                      </label>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <h3>Weekdays where WFH is not allowed</h3>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, idx) => {
                        const weekday = idx + 1; // 1-5
                        const disallowed = wfhSettings.disallowedWeekdays || [];
                        return (
                          <label key={label} style={{ marginRight: 12 }}>
                            <input
                              type="checkbox"
                              checked={disallowed.includes(weekday)}
                              onChange={() => handleWeekdayToggle(weekday)}
                              style={{
                                accentColor: 'var(--green)'
                              }}
                            />{' '}
                            {label}
                          </label>
                        );
                      })}
                      <p style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
                        Weekend (Saturday and Sunday) is always disallowed.
                      </p>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <h3>Max users with same position WFH on same day</h3>
                      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '4px 8px' }}>Position</th>
                            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '4px 8px' }}>Max concurrent WFH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((pos) => {
                            const concurrency =
                              (wfhSettings.positionConcurrency && wfhSettings.positionConcurrency[pos]) ?? 1;
                            return (
                              <tr key={pos}>
                                <td style={{ borderBottom: '1px solid #eee', padding: '4px 8px' }}>{pos}</td>
                                <td style={{ borderBottom: '1px solid #eee', padding: '4px 8px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    style={{ width: 80 }}
                                    value={concurrency}
                                    onChange={(e) => handleConcurrencyChange(pos, e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
                        Set 0 to disallow WFH for that position on any given day.
                      </p>
                    </div>

                    <button
                      type="submit"
                      style={{
                        marginTop: 8,
                        padding: '8px 12px',
                        borderRadius: 4,
                        border: 'none',
                        backgroundColor: 'var(--green)',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                      disabled={settingsLoading}
                    >
                      {settingsLoading ? 'Saving WFH rules...' : 'Save WFH rules'}
                    </button>
                  </form>
                )}
              </section>
            )}

            {/* Holidays Management */}
            

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {loading && <p>Loading...</p>}

            {!loading && holidays.length === 0 && !error && (
              <p>No holidays configured.</p>
            )}

            {!loading && holidays.length > 0 && (
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '4px 8px' }}>Name</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '4px 8px' }}>Date</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '4px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h._id}>
                      <td style={{ borderBottom: '1px solid #eee', padding: '4px 8px' }}>{h.name}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '4px 8px' }}>{h.date}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '4px 8px' }}>
                        <button
                          style={{
                            marginRight: 8,
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 4,
                            border: 'none',
                            backgroundColor: 'var(--blue)',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                          onClick={() => openEditModal(h)}
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 4,
                            border: 'none',
                            backgroundColor: 'var(--red)',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleDelete(h)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              style={{
                marginBottom: 16,
                padding: '8px 12px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: 'var(--blue)',
                color: 'white',
                cursor: 'pointer',
                margin: '16px 0'
              }}
              onClick={openCreateModal}
              disabled={loading}
            >
              + Add Public Holiday
            </button>
          </>
        )}

        {/* Google Calendar Settings (Admin only) */}
        {isTenantAdmin && (
          <section style={{ width: '100%', marginBottom: 32 }}>
            <h2>Google Calendar Sync</h2>
            {settingsError && <p style={{ color: 'red' }}>{settingsError}</p>}
            {!settingsLoading && wfhSettings && (
              <form onSubmit={handleSaveGoogleCalendarSettings} style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={!!wfhSettings.googleCalendar?.enabled}
                      onChange={handleGoogleCalendarToggle}
                      style={{ accentColor: 'var(--green)' }}
                    />
                    Enable Google Calendar sync
                  </label>

                  {wfhSettings.googleCalendar?.enabled && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <label htmlFor="service-account-credentials-file" style={{ display: 'block', marginBottom: 6 }}>
                          Service account credentials 
                        </label>
                        {wfhSettings.googleCalendar?.hasServiceAccountCredentials && (
                          <p style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                            Credentials are already saved. Paste new credentials only if you want to replace them.
                          </p>
                        )}
                        <textarea
                          id="service-account-credentials-file"
                          value={wfhSettings.googleCalendar?.serviceAccountCredentialsFile || ''}
                          onChange={(e) => handleGoogleCalendarFieldChange('serviceAccountCredentialsFile', e.target.value)}
                          rows={8}
                          placeholder="Paste the JSON credentials content from your Google service account file"
                          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label htmlFor="google-calendar-id" style={{ display: 'block', marginBottom: 6 }}>
                          Calendar ID
                        </label>
                        <input
                          id="google-calendar-id"
                          type="text"
                          value={wfhSettings.googleCalendar?.calendarId || ''}
                          onChange={(e) => handleGoogleCalendarFieldChange('calendarId', e.target.value)}
                          placeholder="example@group.calendar.google.com"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <label htmlFor="google-calendar-user" style={{ display: 'block', marginBottom: 6 }}>
                          Calendar user
                        </label>
                        <input
                          id="google-calendar-user"
                          type="text"
                          value={wfhSettings.googleCalendar?.calendarUser || ''}
                          onChange={(e) => handleGoogleCalendarFieldChange('calendarUser', e.target.value)}
                          placeholder="user@example.com"
                          style={{ width: '100%' }}
                        />
                        <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                          The account used to create the event. It needs to be a real Google Workspace user or have event editing permissions on the calendar.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: 'var(--green)',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                  disabled={calendarSettingsLoading}
                >
                  {calendarSettingsLoading ? 'Saving Google Calendar settings...' : 'Save Google Calendar settings'}
                </button>
              </form>
            )}
          </section>
        )}

        {isModalOpen && (
          <div className={modalStyles.backdrop}>
            <div className={modalStyles.modal}>
              <h3>{editingHoliday ? 'Edit Public Holiday' : 'Create Public Holiday'}</h3>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Holiday name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button
                  className={modalStyles.create}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Confirm'}
                </button>
                <button
                  className={modalStyles.cancel}
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default SettingsPage;
