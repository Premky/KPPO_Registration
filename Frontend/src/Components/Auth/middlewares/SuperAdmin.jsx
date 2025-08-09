import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../Context/AuthContext";

const SuperAdmin = () => {
    const { state } = useAuth();
    
    // console.log("Auth State:", state); // Debugging

    // Ensure user exists before checking role
    const userRole = state.user?.role || state.role || state.usertype; 

    // Redirect if not authenticated
    if (!state.valid) return <Navigate to="/login" replace />;

    // Redirect if user is not Superuser
    if (userRole !== "सुपरयुजर") return <Navigate to="/login" replace />;

    return <Outlet />;
};

export default SuperAdmin;
