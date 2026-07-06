// Email validation regex
export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};

// Password validation: at least 8 chars, letters, numbers, at least one symbol
export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }

  const errors = [];
  if (password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('letters');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('numbers');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('symbols');
  }

  if (errors.length > 0) {
    return `Password must contain ${errors.join(', ')}`;
  }

  return null;
};
