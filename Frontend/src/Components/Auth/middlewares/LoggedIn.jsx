import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../Context/AuthContext";

const LoggedIn = () => {
  const { state, loading } = useAuth();

  // Wait until loading finishes before deciding
  if (loading) {
    return <div>Loading...</div>;  // or spinner
  }

  const isValidUser = !!state?.valid;

  // console.log(isValidUser)

  // If logged in, allow access; else redirect to login
  return isValidUser ? <Outlet /> : <Navigate to="/login" replace />;
};

export default LoggedIn;
