import { useEffect, useState } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const useSanketNoGeneratorForKarar = (empType) => {
    const BASE_URL = useBaseURL();
    const [sanketNo, setSanketNo] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (empType === "करार") {
            const fetchSanketNo = async () => {
                setLoading(true);
                try {
                    const response = await axios.get(`${BASE_URL}/emp/next_sanket_no_for_karar`, {
                        withCredentials: true,
                    });

                    const { Status, sanket_no } = response.data;
                    if (Status) {
                        setSanketNo(sanket_no);
                    } else {
                        setError("Failed to generate sanket_no");
                    }
                } catch (err) {
                    console.error("❌ Failed to fetch sanket no:", err);
                    setError(err.message || "Unknown error");
                } finally {
                    setLoading(false);
                }
            };

            fetchSanketNo();
        } else {
            // Reset when not "करार"
            setSanketNo("");
            setError(null);
        }
    }, [empType, BASE_URL]);

    return { sanketNo, loading, error };
};

export default useSanketNoGeneratorForKarar;
