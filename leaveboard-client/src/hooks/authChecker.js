import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import { logout } from '../features/auth/authSlice';

const AuthChecker = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        // Token expired, clear user
        localStorage.removeItem('token');
        dispatch(logout());
        console.warn('Token expired, logging out');
      }
    } catch (err) {
      console.error('Invalid token format');
      localStorage.removeItem('token');
      dispatch(logout());
    }
  }, [dispatch]);

  return null;
};

export default AuthChecker;