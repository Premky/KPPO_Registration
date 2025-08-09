// hooks/useInternalAdmins.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const useAllEmployes = ( ) => {
    const BASE_URL = useBaseURL();
    const [records, setRecords] = useState( [] );
    const [optrecords, setOptRecords] = useState( [] );
    const [loading, setLoading] = useState( true );

    useEffect( () => {
        const fetchRecords = async () => {
            try {                
                const response = await axios.get( `${ BASE_URL }/emp/get_employees`, { withCredentials: true } );
                // console.log( response );
                const { Status, Result, Error } = response.data;
                if ( Status ) {
                    if ( Status && Result && typeof Result === 'object' ) {
                        const resultArray = Object.values( Result );

                        const formatted = resultArray.map( ( opt, index ) => ( {
                            label: `${opt.sanket_no} ${opt.name}`,
                            value: opt.sanket_no  // fallback for value if id is missing
                        } ) );

                        setOptRecords( formatted );
                        setRecords( resultArray );
                    } else {
                        console.log( 'No records found' );
                    }
                } else {
                    // console.log(Error || 'Faile to fetch records')
                }
            } catch ( error ) {
                console.error( "Failed to fetch ranks:", error );
            } finally {
                setLoading( false );
            }
        };

        fetchRecords();
    }, [BASE_URL] );

    return { records, optrecords, loading };
};

export default useAllEmployes;
