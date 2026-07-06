import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import styles from '../styles/MainPage.module.css';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WFHRules = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError('');
        const url = `${import.meta.env.VITE_BASE_URL}/api/settings/wfh`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSettings(res.data || null);
      } catch (err) {
        console.error('Error loading WFH rules:', err);
        const msg = err?.response?.data?.message || err?.message || 'Failed to load WFH rules';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  const renderDateScopeRule = () => {
    if (!settings || !settings.allowedDateScopes) {
      return 'WFH requests are primarily allowed for next week.';
    }
    const scopes = settings.allowedDateScopes;
    const enabled = [];
    if (scopes.thisWeek) enabled.push('this week');
    if (scopes.nextWeek) enabled.push('next week');
    if (scopes.withinMonth) enabled.push('within the current month');

    if (enabled.length === 0) {
      return 'WFH date range uses the default rule: next week only.';
    }

    return `WFH requests are allowed for: ${enabled.join(', ')}.`;
  };

  const renderWeekdayRule = () => {
    const raw = (settings && settings.disallowedWeekdays) || [1, 5, 0, 6];
    // Only show Monday–Friday in the text; weekends stay blocked but are not listed
    const weekdaysOnly = raw.filter((d) => d >= 1 && d <= 5);
    if (!weekdaysOnly.length) {
      return 'WFH weekday restrictions are not currently configured.';
    }
    const humanList = weekdaysOnly
      .sort()
      .map((d) => weekdayNames[d])
      .join(', ');
    return `WFH requests are not allowed on: ${humanList}.`;
  };

  const renderConcurrencyRule = () => {
    const map = (settings && settings.positionConcurrency) || {};
    const entries = Object.entries(map);

    const position = user && user.position ? user.position : null;
    const rawAllowed = position && Object.prototype.hasOwnProperty.call(map, position)
      ? Number(map[position])
      : 1;
    const allowed = Number.isNaN(rawAllowed) ? 1 : rawAllowed;

    if (!position) {
      if (!entries.length) {
        return 'By default, only one user per position can work from home on the same day.';
      }
      return 'Maximum users per position who can work from home on the same day:';
    }

    if (allowed <= 1) {
      return `Your team (${position}) does not allow to have members WFH on the same day.`;
    }

    return `Your team (${position}) allows to have ${allowed} member${allowed === 1 ? '' : 's'} ` +
      'WFH on the same day.';
  };

  const userPosition = user && user.position ? user.position : null;
  const concurrencyEntries = settings && settings.positionConcurrency
    ? Object.entries(settings.positionConcurrency).filter(([position]) =>
        userPosition ? position === userPosition : true
      )
    : [];

  const renderAllowanceRule = () => {
    const allowance = user && typeof user.wfhWeekly === 'number' && !Number.isNaN(user.wfhWeekly)
      ? user.wfhWeekly
      : 1;
    return (
      <>
        Each user has a weekly WFH allowance (your current allowance is{' '}
        <strong>{allowance} day{allowance === 1 ? '' : 's'} per week</strong>). Public holidays in that week reduce the
        number of WFH days available.
      </>
    );
  };

  return (
    <section className={styles.rulesSection}>
      <h2>Work From Home Rules</h2>
      {loading && <p>Loading rules...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        <li>{renderDateScopeRule()}</li>
        <li>{renderWeekdayRule()}</li>
        <li>
          {renderAllowanceRule()}
        </li>
        <li>
          If your weekly WFH allowance for that week is fully used (after considering holidays), you cannot submit more
          WFH requests for that week.
        </li>
        <li>{renderConcurrencyRule()}</li>
        {concurrencyEntries.length > 0 && (
          <li>
            <ul>
              {concurrencyEntries.map(([position, value]) => (
                <li key={position}>
                  {position}: up to {value} user(s) WFH on the same day
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </section>
  );
};

export default WFHRules;
