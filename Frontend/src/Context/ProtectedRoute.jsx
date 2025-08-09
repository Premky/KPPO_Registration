import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = () => {
    const { state, loading } = useAuth();  // Assuming `loading` is a part of the context
    // console.log(state)
    if (loading) {
        return <div>Loading...</div>;  // Show loading state until the context is ready
    }

    return state.valid ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
