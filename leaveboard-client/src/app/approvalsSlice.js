// src/redux/approvalsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = `${import.meta.env.VITE_BASE_URL}/api/wfh`; 

const fetchPendingRequests = createAsyncThunk(
  'approvals/fetchPending',
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

const fetchApprovedRequests = createAsyncThunk(
  'approvals/fetchApproved',
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err) {
      console.error('Error fetching approved requests:', err.response?.data || err.message);
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const fetchRejectedRequests = createAsyncThunk(
  'approvals/fetchRejected',
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/rejected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err) {
      console.error('Error fetching rejected requests:', err.response?.data || err.message);
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const approveRequest = createAsyncThunk(
  'approvals/approve',
  async (id, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.request;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

// ❌ REMOVE 'export' from here
const rejectRequest = createAsyncThunk(
  'approvals/reject',
  async ({ id, reason }, thunkAPI) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/approvals/${id}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.request;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

const approvalsSlice = createSlice({
  name: 'approvals',
  initialState: {
    requests: [],
    approvedRequests: [],
    rejectedRequests: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchPendingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch requests';
      })
      .addCase(approveRequest.fulfilled, (state, action) => {
        state.requests = state.requests.filter(r => r._id !== action.payload._id);
        state.approvedRequests.push(action.payload);
      })
      .addCase(rejectRequest.fulfilled, (state, action) => {
        state.requests = state.requests.filter(r => r._id !== action.payload._id);
        state.rejectedRequests.push(action.payload);
      })
      .addCase(fetchApprovedRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApprovedRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.approvedRequests = action.payload;
      })
      .addCase(fetchApprovedRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch approved requests';
      })
      .addCase(fetchRejectedRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRejectedRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.rejectedRequests = action.payload;
      })
      .addCase(fetchRejectedRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch rejected requests';
      });
  },
});

// ✅ Default export
export default approvalsSlice.reducer;

// ✅ Named exports
export {
  fetchPendingRequests,
  fetchApprovedRequests,
  fetchRejectedRequests,
  approveRequest,
  rejectRequest,  
};
