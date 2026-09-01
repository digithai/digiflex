import { useState, useEffect, useCallback } from 'react';

export const useWfhSettings = (refreshKey = 0) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('token');

    const fetchSettings = useCallback(async () =>{
        setLoading(true);
        setError(null);

        try{
            const settingsUrl = `${import.meta.env.VITE_BASE_URL}/api/settings/wfh`;
            const response = await fetch(settingsUrl, {
                headers: {Authorization: `Bearer ${token}`}
            })

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
            else {
                setSettings(null);
                setError('Failed to fetch WFH settings');
            }
        }
        catch(error) {
            setSettings(null);
            setError('Failed to fetch WFH settings');
        }
        finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchSettings();
        }
    }, [fetchSettings, refreshKey]);

    return { settings, loading, error, refetch: fetchSettings };
};