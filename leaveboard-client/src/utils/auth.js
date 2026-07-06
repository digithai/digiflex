export const refreshToken = async () => {

  const url = `${import.meta.env.VITE_BASE_URL}/api/auth/refresh`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include', // include cookie in request
    });

    if (!res.ok) throw new Error('Refresh failed');

    const data = await res.json();
    return data.token; // new access token
  } catch (error) {
    console.error('Token refresh error:', error.message);
    return null;
  }
};
