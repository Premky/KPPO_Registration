// hooks/useInternalAdmins.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";


const useRoles = ( bandi_id ) => {
    const BASE_URL = useBaseURL();
    const [records, setRecords] = useState( [] );
    const [optrecords, setOptRecords] = useState( [] );
    const [loading, setLoading] = useState( true );

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await axios.get( `${ BASE_URL }/admin/get_roles`,
                { withCredentials: true } );
                const { Status, Result, Error } = response.data;
                console.log( Result );
            if ( Status ) {
                if ( Status && Result && typeof Result === 'object' ) {
                    const resultArray = Object.values( Result );

                    const formatted = resultArray.map( ( opt, index ) => ( {
                        label: opt.role_name ,
                        value: opt.id || index  // fallback for value if id is missing
                    } ) );

                    setOptRecords( formatted );
                    setRecords( resultArray );
                    // console.log(records)
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

    useEffect( () => {        
        fetchRecords();
    }, [BASE_URL, bandi_id] );

    return { records, optrecords, loading, refetch:fetchRecords };
};

export default useRoles;
