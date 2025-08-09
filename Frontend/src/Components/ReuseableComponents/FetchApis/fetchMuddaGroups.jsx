// hooks/useInternalAdmins.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const fetchMuddaGroups = ( bandi_id ) => {
    const BASE_URL = useBaseURL();
    const [records, setRecords] = useState( [] );
    const [optrecords, setOptRecords] = useState( [] );
    const [loading, setLoading] = useState( true );

    useEffect( () => {
        const fetchRecords = async () => {
            try {
                const response = await axios.get( `${ BASE_URL }/public/muddas_groups`, { withCredentials: true } );
                // console.log( response );
                const { Status, Result, Error } = response.data;
                if ( Status ) {
                    if ( Status && Result && typeof Result === 'object' ) {
                        const resultArray = Object.values( Result );

                        const formatted = resultArray.map( ( opt, index ) => ( {
                            label: opt.mudda_group_name,
                            value: opt.id || index  // fallback for value if id is missing
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
    }, [BASE_URL, bandi_id] );

    return { records, optrecords, loading };
};

export default fetchMuddaGroups;
