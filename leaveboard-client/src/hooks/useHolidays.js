import { useState, useEffect, useCallback } from 'react';

export const useHolidays = (refreshKey = 0) => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('token');

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        setError(null);

        try{
            const holidaysUrl = `${import.meta.env.VITE_BASE_URL}/api/holidays`;
            const response = await fetch(holidaysUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHolidays(Array.isArray(data) ? data : []);
            }
            else{
                setHolidays([]);
                setError('Failed to fetch holidays');
            }
            
        }
        catch(err) {
            setHolidays([]);
            setError('Failed to fetch holidays');
        }
        finally {
            setLoading(false);
        }
        
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchHolidays();
        }
    }, [fetchHolidays, refreshKey]);

    return {
        holidays,
        loading,
        error,
        refetch: fetchHolidays
    };
};
