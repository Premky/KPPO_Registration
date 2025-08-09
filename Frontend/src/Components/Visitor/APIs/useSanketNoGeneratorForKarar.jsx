import { useEffect, useState } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const useSanketNoGeneratorForKarar = ( empType ) => {
    const BASE_URL = useBaseURL();
    const [sanketNo, setSanketNo] = useState( "" );
    const [loading, setLoading] = useState( false );
    const [error, setError] = useState( null );

    useEffect( () => {
        const fetchSanketNo = async () => {
            setLoading( true );
            try {
                const response = await axios.get( `${ BASE_URL }/visitor/get_next_sanket_no`, {
                    withCredentials: true,
                } );

                const { Status, sanket_no } = response.data;
                if ( Status ) {
                    setSanketNo( sanket_no );
                    console.log(sanketNo)
                } else {
                    setError( "Failed to generate sanket_no" );
                }
            } catch ( err ) {
                console.error( "❌ Failed to fetch sanket no:", err );
                setError( err.message || "Unknown error" );
            } finally {
                setLoading( false );
            }
        };

        fetchSanketNo();

    }, [empType, BASE_URL] );
    return { sanketNo, loading, error };
};

export default useSanketNoGeneratorForKarar;
