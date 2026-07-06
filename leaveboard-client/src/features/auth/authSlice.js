import { createSlice } from '@reduxjs/toolkit';

const storedUser = JSON.parse(localStorage.getItem('user'));
const storedTenant = JSON.parse(localStorage.getItem('tenant'));

const initialState = {
  user: storedUser || null,
  token: localStorage.getItem('token') || null,
  tenant: storedTenant || storedUser?.tenant || null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
        const user = action.payload.user;
        const tenant = action.payload.tenant || user?.tenant || null;

        state.user = user;
        state.token = action.payload.token;
        state.tenant = tenant;
        state.loading = false;
        state.error = null;

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('tenant', JSON.stringify(tenant));
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    logout: (state) => {
        state.user = null;
        state.token = null;
        state.tenant = null;
        state.loading = false;
        state.error = null; 
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('tenant');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateToken } = authSlice.actions;
export default authSlice.reducer;
