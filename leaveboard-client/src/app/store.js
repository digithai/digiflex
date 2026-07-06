import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import approvalsReducer from './approvalsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    approvals: approvalsReducer,
  },
  
});
