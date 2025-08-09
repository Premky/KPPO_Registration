import { Suspense, lazy } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import axios from 'axios';

axios.interceptors.response.use(
  res => res,
  error => {
    if ( error.response?.status === 401 ) {
      // localStorage.clear();
      sessionStorage.clear();
      if ( window.location.pathname !== '/login' ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject( error );
  }
);

import { Outlet } from 'react-router-dom';
const OutletLayout = () => <Outlet />;
// Lazy-loaded components
const Login = lazy( () => import( './Components/Auth/Login' ) );
const CombinedNav = lazy( () => import( './Components/Nav/CombinedNav' ) );
const CreateUser = lazy( () => import( './Components/AdminPanel/User/CreateUser' ) );
const OfficeBranchPage = lazy( () => import( './Components/AdminPanel/Office/OfficeBranchPage' ) );
const Office = lazy( () => import( './Components/AdminPanel/Office/OfficeForm' ) );

const AdminCheck = lazy( () => import( './Components/Auth/middlewares/AdminCheck' ) );
const LoggedIn = lazy( () => import( './Components/Auth/middlewares/LoggedIn' ) );

const VisitorForm = lazy(()=>import ('./Components/Visitor/Forms/VisitorForm'));
import EmployeeForm from './Components/Employee/Forms/EmployeeForm';
import AllEmpTable from './Components/Employee/Tables/AllEmpTable';
import AllVisitorTable from './Components/Visitor/Tables/AllVisitorTable';
import OfficeWiseVisitorCount from './Components/Visitor/Tables/OfficeWiseVisitorCount';


// Layout component to wrap protected routes with navigation
const ProtectedLayout = () => <CombinedNav />;
// Layout component that just renders child routes

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <BrowserRouter>
          <Routes>

            {/* Routes wrapped with LoggedIn middleware */}
            <Route path="/" element={<Login />} />            
            <Route path="/login" element={<Login />} />
            <Route element={<LoggedIn />}>

              <Route element={<ProtectedLayout />}>
                <Route element={<AdminCheck />}>
                  <Route path="admin">
                    <Route path="create_user" element={<CreateUser />} />
                    <Route path="branch" element={<OfficeBranchPage />} />
                    <Route path="office" element={<Office />} />
                  </Route>
                </Route>
                {/* Bandis Routes */}
                
                {/* Payrole Routes */}
                <Route path="visitor" element={<OutletLayout />}>                  
                  <Route path="new_visitor" element={<VisitorForm />} />
                  <Route path="view_visitors" element={<AllVisitorTable />} />
                  <Route path="view_office_visitors" element={<OfficeWiseVisitorCount />} />
                </Route>
                <Route path="emp" element={<OutletLayout />}>                  
                  <Route path="create_employee" element={<EmployeeForm />} />
                  <Route path="view_employee" element={<AllEmpTable />} />
                </Route>

              </Route>

              {/* Catch all for unknown routes */}
              <Route path="*" element={<h2>Page not found</h2>} />
            </Route>

          </Routes>
        </BrowserRouter>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
