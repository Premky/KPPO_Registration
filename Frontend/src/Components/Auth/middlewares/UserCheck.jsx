import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../Context/AuthContext";

const UserCheck = () => {
    const { state } = useAuth();
    
    console.log("Auth State:", state); // Debugging

    // Ensure user exists before checking role
    const userRole = state.user?.role || state.role || state.usertype; 

    // Redirect if not authenticated
    if (!state.valid) return <Navigate to="/login" replace />;

    // Redirect if user is not Superuser
    if (userRole == "Admin" || userRole == "Superuser" || userRole == "User") return <Outlet /> ;

    return <Navigate to="/login" replace />;
};

export default UserCheck;
