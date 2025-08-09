import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../Context/AuthContext";

const SuperAdmin = () => {
    const { state, loading } = useAuth();

    if (loading) return <div>Loading...</div>; // Don't check anything until loading is done

    if (!state.valid) return <Navigate to="/login" replace />;

    const userRole = state.role_name;

    // console.log("Auth State:", state);
    // console.log("User Role:", userRole);

    // Check for Superadmin role
    if (userRole === "superadmin" || userRole === "office_superadmin" || userRole==="branch_superadmin") {
        return <Outlet />;
    }

    return <Navigate to="/login" replace />;
};

export default SuperAdmin;
