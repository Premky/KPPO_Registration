// hooks/useInternalAdmins.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const usePosts = () => {
    const BASE_URL = useBaseURL();
    const [posts, setPosts] = useState( [] );
    const [optPosts, setOptPosts] = useState( [] );
    const [postsloading, setPostsloading] = useState( true );

    const [level, setLevel] = useState( [] );
    const [optLevel, setOptLevel] = useState( [] );
    const [Levelloading, setLevelLoading] = useState( true );

    const [serviceGroups, setServiceGroups] = useState( [] );
    const [optServiceGroups, setOptServiceGroups] = useState( [] );
    const [serviceGroupsloading, setServiceGroupsLoading] = useState( true );

    const fetchPosts = async () => {
        try {
            const response = await axios.get( `${ BASE_URL }/emp/get_posts`, { withCredentials: true } );
            // console.log( response );
            const { Status, Result, Error } = response.data;
            if ( Status ) {
                if ( Status && Result && typeof Result === 'object' ) {
                    const resultArray = Object.values( Result );

                    const formatted = resultArray.map( ( opt, index ) => ( {
                        label: opt.post_name_np,
                        value: opt.id  // fallback for value if id is missing
                    } ) );

                    setOptPosts( formatted );
                    setPosts( resultArray );
                } else {
                    console.log( 'No records found' );
                }
            } else {
                // console.log(Error || 'Faile to fetch records')
            }
        } catch ( error ) {
            console.error( "Failed to fetch ranks:", error );
        } finally {
            setPostsloading( false );
        }
    };
    // return { posts, optPosts, postsloading };

    const fetchLeveRanks = async () => {
        try {
            const response = await axios.get( `${ BASE_URL }/emp/get_level`, {
                withCredentials: true,
            } );

            const { Status, Result, Error } = response.data;

            if ( Status && Result && typeof Result === 'object' ) {
                const resultArray = Object.values( Result );

                const formatted = resultArray.map( ( opt ) => {
                    const { level_name_np, emp_rank_np, id } = opt;
                    let customLevel;

                    if ( level_name_np=='-' || level_name_np==null || level_name_np=='' ) {
                        customLevel = emp_rank_np;
                    } else {
                        customLevel = `${ level_name_np }/${ emp_rank_np }`;
                    }

                    return {
                        label: customLevel,
                        value: id,
                    };
                } );

                setOptLevel( formatted );
                setLevel( resultArray );
            } else {
                console.log( 'No records found' );
            }
        } catch ( error ) {
            console.error( 'Failed to fetch ranks:', error );
        } finally {
            setLevelLoading( false );
        }
    };

    const fetchServiceGroups = async () => {
        try {
            const response = await axios.get( `${ BASE_URL }/emp/get_service_groups`, {
                withCredentials: true,
            } );

            const { Status, Result, Error } = response.data;

            if ( Status && Result && typeof Result === 'object' ) {
                const resultArray = Object.values( Result );

                const formatted = resultArray.map( ( opt ) => {
                    const { service_name_np, group_name_np, id } = opt;                      
                    let customLevel;

                    if ( group_name_np=='-' || group_name_np==null || group_name_np=='' ) {
                        customLevel = service_name_np;
                    } else {
                        customLevel = `${ service_name_np }/${ group_name_np }`;
                    }                  
                    return {
                        label: customLevel,
                        value: id,
                    };
                } );

                setOptServiceGroups( formatted );
                setServiceGroups( resultArray );
            } else {
                console.log( 'No records found' );
            }
        } catch ( error ) {
            console.error( 'Failed to fetch ranks:', error );
        } finally {
            setLevelLoading( false );
        }
    };


    useEffect( () => {
        fetchPosts();
        fetchLeveRanks();
        fetchServiceGroups();
    }, [BASE_URL] );


    return { level, optLevel, Levelloading, posts, optPosts, postsloading, serviceGroups, optServiceGroups, serviceGroupsloading };
};

export default usePosts;
