import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/Logo_no_text.png';
import styles from '../styles/LoginPage.module.css';
import { validateEmail } from '../utils/validation'; 

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const url = `${import.meta.env.VITE_BASE_URL}/api/auth/recover`;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setStatus(emailError);
      setIsSuccess(false);
      return;
    }

    setStatus('Sending...');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus('Password reset link sent to your email');
      setIsSuccess(true);
    } 
    else if (data.message?.toLowerCase().includes('tenant')) {
      setStatus(`${data.message}`);
      setIsSuccess(false);
    } 
    else {
      setStatus(`${data.message || 'Unable to send recovery request.'}`);
      setIsSuccess(false);
    }
  };

  return (

    <div className={styles.container}>
      <img className={styles.logo} src={logo} alt="Logo" width={100} />
      <h2 >Recover Password</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />
        <button type="submit" className={styles.button}>
          Send Recovery Request
        </button>
        <div style={{textAlign: 'center', marginTop: '8px'}}>
          <Link 
            to="/login" 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--blue)',
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              padding: 0
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            Back to login
          </Link>
        </div>
      </form>
      {status && <p className={isSuccess ? styles.status : styles.error}>{status}</p>}
    </div>
  );
};

export default ForgotPassword;
