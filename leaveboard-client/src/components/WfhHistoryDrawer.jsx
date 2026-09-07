import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { History, X, Filter, FileText, Calendar, CheckCircle2, Clock } from 'lucide-react';
import axios from 'axios';
import styles from '../styles/WfhHistoryDrawer.module.css';

export default function WfhDrawer({ isOpen, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const { token, user } = useSelector((state) => state.auth);

  const selectedYear = new Date().getFullYear(); 
  const userName = user?.name || "";
  const userPosition = user?.position || "";
  const annualAllowance = user?.wfhAnnualQuota || 30;
  const annualBalance = user?.wfhAnnualBalance || 0;

  const historyUrl = `${import.meta.env.VITE_BASE_URL}/api/wfh/user/history`;

  // Fetch WFH history for the selected year
  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
            `${import.meta.env.VITE_BASE_URL}/api/wfh/user/history?year=${selectedYear}`,
            { headers: { Authorization: `Bearer ${token}` } }
            );
            setRequests(res.data.requests || []);
        } catch (error) {
            console.error("Failed to fetch WFH history:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchHistory();
  }, [isOpen, token]);

  // Filter requests by status (all, approved, pending, rejected)
  const userFilteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((req) => req.status === statusFilter);
  }, [requests, statusFilter]);

  // Count approved requests
  const approvedCount = useMemo(() => {
    return requests.filter((req) => req.status === 'approved').length;
  }, [requests]);

  // Group requests by month
  const groupedByMonth = useMemo(() => {
    return userFilteredRequests.reduce((acc, item) => {
      const monthKey = format(parseISO(item.date), 'MMMM yyyy');
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(item);
      return acc;
    }, {});
  }, [userFilteredRequests]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div onClick={onClose} className={styles.backdrop} />

      <div className={styles.drawer}>
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <History className={styles.historyIcon}/>
            </div>
            <div>
              <div className={styles.historyTitleGroup}>
                <h3 className={styles.headerTitle}>WFH History</h3>
                <span className={styles.badge}>{selectedYear}</span>
              </div>
              <p className={styles.headerSubtitle}>
                {userName} {userPosition && `• ${userPosition}`}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X className={styles.closeIcon} />
          </button>
        </div>

        {/* WFH balance & quota group */}
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Approved WFH</div>
            <div className={styles.kpiValue}>
              {approvedCount} <span className={styles.kpiUnit}>days</span>
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiCardSuccess}`}>
            <div className={styles.wfhBalanceLabel}>Annual Balance</div>
            <div className={styles.wfhBalanceValue}>
              {annualBalance} <span className={styles.kpiUnit}>days</span>
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiCardPrimary}`}>
            <div className={styles.wfhQuotaLabel}>Annual Quota</div>
            <div className={styles.wfhQuotaValue}>
              {annualAllowance} <span className={styles.kpiUnit}>days</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <Filter className={styles.filterIcon}/>
            <span className={styles.filterText}>Filter:</span>
            {['all', 'approved', 'pending', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`${styles.filterBtn} ${
                  statusFilter === st ? styles.filterBtnActive : ''
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className={styles.totalCount}>
            Total: <strong>{userFilteredRequests.length}</strong>
          </div>
        </div>

        {/* List Content */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loading}>
              Loading history...
            </div>
          ) : Object.keys(groupedByMonth).length === 0 ? (
            <div className={styles.emptyState}>
              <FileText className={styles.fileIcon}/>
              <h4 className={styles.headerNoRequest}>No requests found</h4>
              <p className={styles.paraNoRequest}>
                No matching WFH requests for this selection.
              </p>
            </div>
          ) : (
            Object.entries(groupedByMonth).map(([month, items]) => (
              <div key={month} className={styles.monthGroup}>
                <div className={styles.monthHeader}>
                  <div className={styles.monthDiv}>
                    <Calendar className={styles.calendarIcon} />
                    <span>{month}</span>
                  </div>
                  <span className={styles.monthSpanRecord}>
                    {items.length} {items.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                <div>
                  {items.map((item) => {
                    const reqDate = parseISO(item.date);
                    const isApproved = item.status === 'approved';
                    const isPending = item.status === 'pending';

                    return (
                      <div key={item._id} className={styles.cardItem}>
                        <div className={styles.cardCalendar}>
                          <div
                            className={styles.dateBox}
                            style={{
                              backgroundColor: isApproved ? '#ecfdf5' : isPending ? '#fffbeb' : '#fef2f2',
                              color: isApproved ? '#065f46' : isPending ? '#92400e' : '#991b1b',
                            }}
                          >
                            <span className={styles.calendarDate}>
                              {format(reqDate, 'dd')}
                            </span>
                            <span className={styles.calendarWeek}>
                              {format(reqDate, 'EEE')}
                            </span>
                          </div>

                          <div>
                            <div className={styles.dateInfo}>
                              <span className={styles.weekDay}>
                                {format(reqDate, 'EEEE')}
                              </span>
                            </div>
                            <p className={styles.wfhReason}>
                              {item.status === 'rejected' && item.rejectionReason
                                ? `Reason: ${item.rejectionReason}`
                                : item.approvedByName
                                ? `Approved by ${item.approvedByName}`
                                : 'Work from home request'}
                            </p>
                          </div>
                        </div>

                        <div className={styles.wfhStatusContainer}>
                          <span
                            className={`${styles.statusTag} ${
                              isApproved
                                ? styles.statusApproved
                                : isPending
                                ? styles.statusPending
                                : styles.statusRejected
                            }`}
                          >
                            {isApproved ? (
                              <CheckCircle2 className={styles.approvedIcon} />
                            ) : (
                              <Clock className={styles.pendingIcon} />
                            )}
                            <span style={{ textTransform: 'capitalize' }}>{item.status}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerSpan}>
            Showing <strong>{userFilteredRequests.length}</strong> logged {userFilteredRequests.length <= 1 ? 'entry' : 'entries'}
          </span>
          <button type="button" onClick={onClose} className={styles.closeFooterBtn}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}