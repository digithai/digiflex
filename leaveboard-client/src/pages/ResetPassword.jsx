import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import logo from "../assets/Logo_no_text.png";
import styles from "../styles/LoginPage.module.css";
import { validatePassword } from "../utils/validation";

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTokenValid, setIsTokenValid] = useState(true);
    const [isValidating, setIsValidating] = useState(true);

    const url = `${import.meta.env.VITE_BASE_URL}/api/auth/reset-password`;
    const validateUrl = `${import.meta.env.VITE_BASE_URL}/api/auth/validate-reset-token`;

    useEffect(() => {
        const validateToken = async () => {
            if (!token || token.trim() === "") {
                setStatus("Invalid reset link. Please request a new password reset.");
                setIsSuccess(false);
                setIsTokenValid(false);
                setIsValidating(false);
                return;
            }

            try{
                const res = await fetch(validateUrl, {
                    method: 'POST',
                    headers: {'content-type': 'application/json'},
                    body: JSON.stringify({ token })
                });

                const data = await res.json();

                if (res.ok) {
                    setIsTokenValid(true);
                } else {
                    setStatus(data.message || "Invalid or expired reset link.");
                    setIsSuccess(false);
                    setIsTokenValid(false);
                }
            }
            catch(error){
                setStatus("An unexpected error occurred while validating the reset link.");
                setIsSuccess(false);
                setIsTokenValid(false);
            }
            finally {
                setIsValidating(false);
            }
        };
        validateToken();
    }, [token, validateUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setStatus(passwordError);
            setIsSuccess(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus("Passwords do not match");
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setStatus("");

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("Password reset successfully. Redirecting to login...");
                setIsSuccess(true);
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            }
            else {
                setStatus(data.message || "Failed to reset password");
                setIsSuccess(false);
            }
        }
        catch (error) {
            setStatus("An unexpected error occurred. Please try again.");
            setIsSuccess(false);
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <img className={styles.logo} src={logo} alt="Logo" width={100} />
            <h2>Reset Password</h2>

            {isValidating ? (
                <p>Validating reset link...</p>
            ) : !isTokenValid ? (
                <>
                    {status && <div className={styles.error}>{status}</div>}
                    <div style={{textAlign: 'center', marginTop: '8px'}}>
                        <button 
                            type="button" 
                            onClick={() => navigate('/forgot-password')}
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
                            Request new password reset
                        </button>
                    </div>
                </>
            ) : (
                <form className={styles.form} onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        required
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        required
                    />
                    
                    {status && (
                        <div className={isSuccess ? styles.status : styles.error}>
                            {status}
                        </div>
                    )}
                    
                    <button className={styles.button} type="submit">
                        Reset Password
                    </button>
                    <div style={{textAlign: 'center', marginTop: '8px'}}>
                        <button 
                            type="button" 
                            onClick={() => navigate('/login')}
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
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default ResetPassword;