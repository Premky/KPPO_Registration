import { useState, useEffect } from 'react';
import { getAvailableBaseUrl } from './getBaseUrl';

const useApiBaseUrl = () => {
    const [baseUrl, setBaseUrl] = useState(null);

    useEffect(() => {
        const fetchBaseUrl = async () => {
            const url = await getAvailableBaseUrl();
            setBaseUrl(url);
        };
        fetchBaseUrl();
    }, []);

    return baseUrl;
};

export default useApiBaseUrl;
