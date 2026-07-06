import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { loginStart, loginSuccess, loginFailure } from '../features/auth/authSlice';
import { Link, useNavigate } from 'react-router-dom';
import styles from "../styles/LoginPage.module.css";
import logo from '../assets/Logo_no_text.png';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { token, user, loading, error } = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const url = `${import.meta.env.VITE_BASE_URL}/api/auth/login`;

  useEffect(() => {
    if (token && user) { 
        navigate('/');
    }
  }, [token, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(loginStart());

    try {
      const res = await axios.post(url, { email, password });
      dispatch(loginSuccess(res.data));
    } catch (err) {
      const message = err.response?.data?.message;
      dispatch(loginFailure(message || 'Invalid credentials.'));
    }
  };

  return (
    <div className={styles.container}>
      <img className={styles.logo} src={logo} alt="Logo" width={100} />
      <h2>DIGIFLEX</h2>
      <form className={styles.form} onSubmit={handleLogin}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
        />
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className={styles.actions}>
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}

      </form>
    </div>
  );
};

export default LoginPage;
