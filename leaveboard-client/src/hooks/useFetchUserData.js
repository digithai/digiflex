import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshToken } from '../utils/auth';
import { logout, updateToken } from '../features/auth/authSlice'; 

const useFetchUserData = () => {
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const url = `${import.meta.env.VITE_BASE_URL}/api/dashboard`;

  useEffect(() => {
    const fetchWithToken = async (tokenToUse) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });

      if (res.ok) {
        const result = await res.json();
        setData(result);
        return true;
      }

      return res.status; // pass status code to handle below
    };

    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const status = await fetchWithToken(token);

        if (status === 401) {
          // Try to refresh the token
          const newToken = await refreshToken();
          if (newToken) {
            dispatch(updateToken(newToken));
            const retryStatus = await fetchWithToken(newToken);
            if (retryStatus !== true) {
              throw new Error('Retry after refresh failed');
            }
          } else {
            dispatch(logout());
          }
        } else if (status !== true) {
          throw new Error('Fetch failed');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, dispatch]);

  return { data, loading, error };
};

export default useFetchUserData;
