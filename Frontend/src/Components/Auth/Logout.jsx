import axios from 'axios';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useBaseURL } from '../../Context/BaseURLProvider'; // Import the custom hook for base URL

const Logout = () => {
    const { dispatch } = useAuth();
    const navigate = useNavigate();
    // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // const BASE_URL = localStorage.getItem('BASE_URL');
    const BASE_URL = useBaseURL();

    const handleLogout = async () => {
        try {
            await axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true });

            // Clear authentication state
            dispatch({ type: 'LOGOUT' });

            Swal.fire({
                title: 'Logged Out',
                text: 'You have been successfully logged out!',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false,
            });

            navigate('/login');
        } catch (error) {
            Swal.fire({
                title: 'Logout Failed',
                text: 'There was an issue logging out!',
                icon: 'error',
            });
        }
    };

    return <div onClick={handleLogout}>Logout</div>;
};

export default Logout;
