import { useState, useEffect } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const useChkEmpSanket = ({ sanket_no }) => {
    const BASE_URL = useBaseURL();
    const [exists, setExists] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!sanket_no) return;

        const fetchSanketExistence = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${BASE_URL}/emp/get_emp_sanket_no`, {
                    params: { sanket_no },
                    withCredentials: true,
                });

                const { Status, Result } = response.data;
                setExists(Status && Result?.length > 0);
            } catch (err) {
                console.error("❌ Failed to check sanket_no:", err);
                setError(err);
                setExists(false);
            } finally {
                setLoading(false);
            }
        };

        fetchSanketExistence();
    }, [sanket_no, BASE_URL]);

    return { exists, loading, error };
};

export default useChkEmpSanket;
