// hooks/useInternalAdmins.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";


const useBranches = ( bandi_id ) => {
    const BASE_URL = useBaseURL();
    const [records, setRecords] = useState( [] );
    const [optrecords, setOptRecords] = useState( [] );
    const [loading, setLoading] = useState( true );

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const response = await axios.get( `${ BASE_URL }/admin/get_branch_name`,
                { withCredentials: true } );
                const { Status, Result, Error } = response.data;
                // console.log( Result );
            if ( Status ) {
                if ( Status && Result && typeof Result === 'object' ) {
                    const resultArray = Object.values( Result );

                    const formatted = resultArray.map( ( opt, index ) => ( {
                        label: opt.branch_np,
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
        fetchBranches();
    }, [BASE_URL, bandi_id] );

    return { records, optrecords, loading, refetch:fetchBranches };
};

export default useBranches;
