import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import axios from 'axios';
import { useBaseURL } from './BaseURLProvider';

const AuthContext = createContext();

// Initial state for authentication context
const initialState = {
    user: null,
    office_np: null,
    branch_np: null,
    office_id: null,
    is_online: null,
    role_name: null,
    branch_name: null,
    valid: false,
};

// Reducer function to handle authentication actions
const authReducer = ( state, action ) => {
    switch ( action.type ) {
        case "LOGIN":
            return { ...state, ...action.payload, justLoggedIn: true };
        case "CLEAR_JUST_LOGGED_IN":
            return { ...state, justLoggedIn: false };
        case "LOGOUT":
            return initialState;
        default:
            return state;
    }
};

// AuthProvider component that provides authentication context to the app
export const AuthProvider = ( { children } ) => {
    const BASE_URL = useBaseURL();
    const [state, dispatch] = useReducer( authReducer, initialState );
    const [loading, setLoading] = useState( true );

    const fetchSession = async () => {
        try {
            const response = await axios.get( `${ BASE_URL }/auth/session`, { withCredentials: true } );
            if ( response.data.loggedIn ) {
                // console.log(response.data)
                const authData = {
                    user: response.data.user.username,
                    office_np: response.data.user.office_np,
                    office_id: response.data.user.office_id,
                    usertype_en: response.data.user.usertype_en,
                    usertype_np: response.data.user.usertype_np,
                    is_online: response.data.user.is_online,
                    role_name: response.data.user.role_name,
                    role_id: response.data.user.role_id,
                    branch_np: response.data.user.branch_name,
                    valid: true,
                    justLoggedIn: true,
                };
                // console.log(authData)
                dispatch( { type: "LOGIN", payload:authData } );
            } else {
                dispatch( { type: "LOGOUT" } );
            }
        } catch ( error ) {
            dispatch( { type: "LOGOUT" } );
        } finally {
            setLoading( false );
        }
    };

    useEffect( () => {
        fetchSession(); // always run once on mount
    }, [] );


    useEffect( () => {
        if ( state.justLoggedIn ) {
            dispatch( { type: "CLEAR_JUST_LOGGED_IN" } );
        }
    }, [state.justLoggedIn] );


    useEffect( () => {
        if ( !state.valid ) return; // don't run inactivity timer if not logged in 

        let timeout;
        let warningTimeout;

        const logoutUser = ()=>{
            dispatch({type:'LOGOUT'});
            axios.post(`${BASE_URL}/auth/logout`,{}, {withCredentials: true});
        };

        const showInactivityWarning = ()=>{
            const extend = window.confirm(`तपाई लामो समय सम्म निष्क्रिय हुनु भयो। 
                सत्रलाई निरन्तर राख्न चाहनुहुन्छ?`);
            if(extend){
                resetTimer();
            }else{
                logoutUser();
            }
        };

        const resetTimer = () => {
            clearTimeout( timeout );
            clearInterval(warningTimeout);
            warningTimeout=setTimeout(showInactivityWarning, 25*60*1000);
            timeout=setTimeout(logoutUser, 30*60*1000);
        };        

        //List of events that reset the timer
        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach( event => window.addEventListener( event, resetTimer ) );
        resetTimer();
        return () => {
            clearTimeout( timeout );
            clearTimeout(warningTimeout);            
            events.forEach( event => window.removeEventListener( event, resetTimer ) );
        };
    }, [state.valid, BASE_URL] );

    //For Logout Mark
    useEffect( () => {
        const interval = setInterval( () => {
            axios.post( `${ BASE_URL }/auth/login_ping`, {}, { withCredentials: true } );
        }, 60 * 1000 );
        return () => clearInterval( interval );
    }, [state.valid, BASE_URL] );


    return (
        <AuthContext.Provider value={{ state, dispatch, fetchSession, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to access authentication context in other components
export const useAuth = () => useContext( AuthContext );
