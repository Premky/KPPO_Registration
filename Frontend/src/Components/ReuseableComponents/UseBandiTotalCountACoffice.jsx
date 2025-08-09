// hooks/useBandiRanks.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useBaseURL } from "../../Context/BaseURLProvider";

const UseBandiTotalCountACoffice = (filters={}) => {
  const BASE_URL = useBaseURL();
  const [count, setCount] = useState([]);
  const [countLoading, setCountLoading] = useState(true);
  // console.log(filters?.searchStartDate)

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/bandi/get_office_wise_count`, {
          params: {
            office_id: filters?.searchKaragarOffice || '',
            startDate: filters?.searchStartDate || '',
            endDate: filters?.searchEndDate || '',
            _t: Date.now(),
          },
          withCredentials: true
        });
        setCount(response.data?.Result || []);
      } catch (error) {
        console.error("Failed to fetch count:", error);
      } finally {
        setCountLoading(false);
      }
    };

    if (filters) {
      fetchRecords();
    }
  }, [BASE_URL, filters?.searchKaragarOffice, filters?.searchStartDate, filters?.searchEndDate]);

  const totals = count.reduce((acc, curr) => {
    Object.keys(curr).forEach((key) => {
      if (typeof curr[key] === 'number') {
        acc[key] = (acc[key] || 0) + curr[key];
      }
    });
    return acc;
  }, {});

  return { count, countLoading, totals };
};

export default UseBandiTotalCountACoffice;
