import Wrapper from "../components/Wrapper";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPendingRequests,
  fetchApprovedRequests,
  fetchRejectedRequests,
  approveRequest,
  rejectRequest
} from '../app/approvalsSlice';
import SectionWrap from "../components/SectionWrap";
import ApprovalCard from "../components/ApprovalCard";
import ApprovedCard from "../components/ApprovedCard";
import RejectedCard from "../components/RejectedCard";
import styles from '../styles/MainPage.module.css';
import { TiWarningOutline } from "react-icons/ti";
import axios from 'axios';

const API = `${import.meta.env.VITE_BASE_URL}/api/wfh`;

const Approvals = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const { requests, loading, error } = useSelector((state) => state.approvals);
  const { approvedRequests, rejectedRequests } = useSelector((state) => state.approvals);
  const [list, setList] = useState([]);
  const [positionConflicts, setPositionConflicts] = useState({});
  const [approvedList, setApprovedList] = useState([]);
  const [rejectedList, setRejectedList] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    dispatch(fetchPendingRequests());
    dispatch(fetchApprovedRequests());
    dispatch(fetchRejectedRequests());
  }, [dispatch]);

  useEffect(() => {
    setList(requests);
  }, [requests]);

  useEffect(() => {
    setApprovedList(approvedRequests);
  }, [approvedRequests]);

  useEffect(() => {
    setRejectedList(rejectedRequests);
  }, [rejectedRequests]);

  // Track positions where 2 or more users have requested WFH on the same day
  useEffect(() => {
    const conflicts = {};

    // Filter out requests from same-role users (as in rendering logic)
    const visible = (list || []).filter((r) => r?.user && r.user.role !== user.role);

    // Map: position -> { dateStr -> count }
    const byPosDate = {};

    visible.forEach((r) => {
      const pos = r.user.position || 'No position';
      const d = new Date(r.date);
      const dateStr = d.toISOString().slice(0, 10);
      if (!byPosDate[pos]) byPosDate[pos] = {};
      if (!byPosDate[pos][dateStr]) byPosDate[pos][dateStr] = 0;
      byPosDate[pos][dateStr] += 1;
    });

    Object.entries(byPosDate).forEach(([pos, dates]) => {
      const hasConflict = Object.values(dates).some((count) => count >= 2);
      if (hasConflict) {
        conflicts[pos] = true;
      }
    });

    setPositionConflicts(conflicts);
  }, [list, user]);

  const handleApprove = (id) => {
    if (window.confirm('Approve this request?')) {
      setProcessingId(id);
      dispatch(approveRequest(id))
        .unwrap()
        .finally(() => {
          setProcessingId(null);
        })
        .catch((err) => {
          console.error(err);
          // Restore by refetching if server fails
          dispatch(fetchPendingRequests());
        });
    }
  };

  const handleReject = (id) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason !== null) {
      setProcessingId(id);
      dispatch(rejectRequest({ id, reason }))
        .unwrap()
        .finally(() => {
          setProcessingId(null);
        })
        .catch((err) => {
          console.error(err);
          // Restore by refetching if server fails
          dispatch(fetchPendingRequests());
        });
    }
  };

  // Handle delete for approved requests
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/approved/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovedList(approvedList.filter((r) => r._id !== id));
      dispatch(fetchApprovedRequests());
    } catch (err) {
      console.error('Error deleting request:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to delete request.');
    }
  };

  // Handle date change for approved requests
  const handleDateChanged = (updatedRequest) => {
    setApprovedList(approvedList.filter((r) => r._id !== updatedRequest._id));
    dispatch(fetchApprovedRequests());
  };

  // Group requests by user.position, excluding same-role requests
  const groupedByPosition = list.reduce((acc, r) => {
    if (!r?.user) return acc;
    if (r.user.role === user.role) return acc;
    const pos = r.user.position || 'No position';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(r);
    return acc;
  }, {});

  // Sort requests within each position by date (newest first)
  Object.keys(groupedByPosition).forEach(pos => {
    groupedByPosition[pos].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  const positionKeys = Object.keys(groupedByPosition).sort();

  const formatDateLocal = (date) => {
    const d = new Date(date);
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  };

  const today = formatDateLocal(new Date());

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to export requests');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wfh_requests.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting requests:', err);
      alert('Failed to export requests');
    }
  };

  // Group approved requests by position for consistency
  const groupApprovedByPosition = approvedList.reduce((acc, r) => {
    if (!r?.user) return acc;
    const pos = r.user.position || 'No position';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(r);
    return acc;
  }, {});

  // Sort approved requests within each position by date (newest first)
  Object.keys(groupApprovedByPosition).forEach(pos => {
    groupApprovedByPosition[pos].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  const approvedPositionKeys = Object.keys(groupApprovedByPosition).sort();

  // Group rejected requests by position for consistency
  const groupRejectedByPosition = rejectedList.reduce((acc, r) => {
    if (!r?.user) return acc;
    const pos = r.user.position || 'No position';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(r);
    return acc;
  }, {});

  // Sort rejected requests within each position by date (newest first)
  Object.keys(groupRejectedByPosition).forEach(pos => {
    groupRejectedByPosition[pos].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  const rejectedPositionKeys = Object.keys(groupRejectedByPosition).sort();

  return (
    <Wrapper>
      <div className={styles.MainPage}>
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '520px' }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>Pending WFH Requests</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Review and approve or reject pending work from home requests
            </p>
          </div>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--blue)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--button-radius)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1e40af'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Export WFH Requests
          </button>
        </div>
        
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        {!loading && positionKeys.length === 0 && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'left', 
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--surface-border)'
          }}>
            No pending requests to review
          </div>
        )}

        {!loading && positionKeys.length > 0 && (
          positionKeys.map((pos) => (
            <div key={pos} style={{ marginBottom: 32 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '16px',
                justifyContent: 'flex-start'
              }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--blue)', textAlign: 'left' }}>{pos}</h2>
                {positionConflicts[pos] && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    padding: '4px 8px',
                    background: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    <TiWarningOutline />
                    Conflict detected
                  </span>
                )}
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {groupedByPosition[pos].map((r) => (
                  <SectionWrap type="approval" key={r._id}>
                    <ApprovalCard
                      request={r}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      loading={processingId === r._id}
                    />
                  </SectionWrap>
                ))}
              </ul>
            </div>
          ))
        )}

        <div style={{ 
          marginTop: 48, 
          marginBottom: 32,
          paddingTop: 32,
          borderTop: '2px solid var(--surface-border)'
        }}>
          <h1 style={{ marginBottom: 8 }}>Approved WFH Requests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage approved work from home requests
          </p>
        </div>
        
        {approvedList.length === 0 && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'left', 
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--surface-border)'
          }}>
            No approved requests found
          </div>
        )}
        
        {approvedPositionKeys.length > 0 && (
          approvedPositionKeys.map((pos) => (
            <div key={pos} style={{ marginBottom: 32 }}>
              <h2 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                color: 'var(--blue)',
                textAlign: 'left'
              }}>{pos}</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {groupApprovedByPosition[pos].map((r) => {
                  if(formatDateLocal(r.date) > today) {
                    return (
                      <SectionWrap type="approval" key={r._id}>
                        <ApprovedCard
                          request={r}
                          onDeleted={handleDelete}
                          onDateChanged={handleDateChanged}
                        />
                      </SectionWrap>
                    );
                  }
                  return null;
                })}
              </ul>
            </div>
          ))
        )}

        <div style={{ 
          marginTop: 48, 
          marginBottom: 32,
          paddingTop: 32,
          borderTop: '2px solid var(--surface-border)'
        }}>
          <h1 style={{ marginBottom: 8 }}>Rejected WFH Requests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            View rejected work from home requests and their reasons
          </p>
        </div>
        
        {rejectedList.length === 0 && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'left', 
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--surface-border)'
          }}>
            No rejected requests found
          </div>
        )}
        
        {rejectedPositionKeys.length > 0 && (
          rejectedPositionKeys.map((pos) => (
            <div key={pos} style={{ marginBottom: 32 }}>
              <h2 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                color: 'var(--blue)',
                textAlign: 'left'
              }}>{pos}</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {groupRejectedByPosition[pos].map((r) => (
                  <SectionWrap type="approval" key={r._id}>
                    <RejectedCard request={r} />
                  </SectionWrap>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Wrapper>
  );
};


export default Approvals;
