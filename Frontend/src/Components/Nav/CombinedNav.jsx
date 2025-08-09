import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../../Context/AuthContext';
import Swal from 'sweetalert2';
import axios from 'axios';
import { useBaseURL } from '../../Context/BaseURLProvider';
import { menuAccess } from './Menues/menuAccess';
import ResetPasswordDialog from '../Auth/ResetPasswordDialog';

const CombinedNav = ( { user } ) => {
  const BASE_URL = useBaseURL();
  const { dispatch, state:authState } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const filterSubmenuByRole = ( menuKey, submenu ) => {
    const role = authState.role_name;
    console.log(authState.role_name)
    const access = menuAccess[menuKey]?.[role];
    if ( !access ) return [];
    if ( access === 'all' ) return submenu;
    return submenu.filter( sub => access.includes( sub.path ) );
  };

  const [sidebarMenu, setSidebarMenu] = useState( '' );

  const topMenu = [
    {
      name: 'Home',
      defaultPath: '/',
      submenu: [
        // { name: 'Dashboard', path: '/dashboard' },
        // { name: 'Stats', path: '/stats' }
      ]
    },
    
    {
      name: 'आगन्तुक',
      defaultPath: '/visitor/view_office_visitors',
      submenu: [                
        { name: 'नयाँ थप', path: '/visitor/new_visitor' },
        { name: 'आगन्तुक विवरण', path: '/visitor/view_visitors' },        
        { name: 'कार्यालयगत संख्या', path: '/visitor/view_office_visitors' },        
      ]
    },
    // {
    //   name: 'कर्मचारी',
    //   defaultPath: '/emp',
    //   submenu: [
    //     // { name: 'कामदारी सुविधा ड्यासबोर्ड', path: '/bandi_transfer/create_aantarik_prashasan' },
    //     { name: 'नयाँ थप', path: '/emp/create_employee' },
    //     { name: 'नयाँ थप', path: '/visitor/new_visitor' },
    //     { name: 'कर्मचारी विवरण', path: '/emp/view_employee' },
    //     // { name: 'स्थानान्तरण', path: '/emp/aantarik_prashasan_table' },
    //     // { name: 'कामदारी सुविधा विवरण', path: '/kaamdari_subidha/kaamdari_subidha_form' }
    //   ]
    // }
  ];
  const [resetPasswordOpen, setResetPasswordOpen] = useState( false );
  // console.log(authState)
  const handleTopNavClick = ( menu ) => {
    setSidebarMenu( menu.name );
    navigate( menu.defaultPath );
  };

  const handleSubmenuClick = ( path ) => {
    navigate( path );
  };

  useEffect( () => {
    const activeMenu = topMenu.find( menu =>
      menu.submenu.some( sub => location.pathname.startsWith( sub.path ) )
    );
    if ( activeMenu ) {
      setSidebarMenu( activeMenu.name );
    }
  }, [location.pathname] );

  const selectedMenu = topMenu.find( menu => menu.name === sidebarMenu );

  const handleLogout = async () => {

    try {
      await axios.post( `${ BASE_URL }/auth/logout`, {}, { withCredentials: true } );
      // Clear authentication state
      dispatch( { type: 'LOGOUT' } );
      localStorage.removeItem( 'token' );
      navigate( '/login' );
      Swal.fire( {
        title: 'Logged Out',
        text: 'You have been successfully logged out!',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false,
      } );
    } catch ( error ) {
      console.log( "Logout error:", error?.response?.data || error.message || error );
      Swal.fire( {
        title: 'Logout Failed',
        text: error?.response?.data?.message || error.message || 'There was an issue logging out!',
        icon: 'error',
      } );
    }

  };

  const changePassword=()=>{
    setResetPasswordOpen(true);
  }

  const handlePasswordChange = async ( formData ) => {
    try {
      const res = await axios.put( `${ BASE_URL }/auth/reset_password`, formData, { withCredentials: true } );
      Swal.fire( { title: "Password Changed", icon: "success" } );
      setResetPasswordOpen( false );
      // navigate( '/bandi' );
      handleLogout();
    } catch ( err ) {
      Swal.fire( {
        title: "Password Change Failed",
        text: err.response?.data?.message || "Something went wrong",
        icon: "error",
      } );
    }
  };
  return (
    <div>
      <ResetPasswordDialog
        editingData={{
          user_id: authState?.id || '',
        }}
        open={resetPasswordOpen}
        onClose={() => {
          setResetPasswordOpen( false );
          navigate( '/bandi' );
        }}
        onSave={handlePasswordChange}
      />
      {/* Top Navigation */}
      <div className="topnav">
        {topMenu.map( menu => (
          <a
            key={menu.name}
            href="#"
            className={sidebarMenu === menu.name ? 'active' : ''}
            onClick={() => handleTopNavClick( menu )}
          >
            {menu.name}
          </a>
        ) )}
        <a className="icon"><i className="fa fa-bars"></i></a>
      </div>

      {/* Sidebar */}
      <div className="sidenav">
        <div>
          <div className='nepal_gov_logo'>
            <img src='np_police_logo.png' alt='nepal_gov_logo' height='80' />
          </div>
          <div className="office-info">{authState.office_np}</div>
          <div className="user-info">({authState.username})</div>
          <div className="user-info">{authState.username}</div>
          {/* <div className="user-info">({authState})</div> */}
          <hr />
        </div>

        {/* {selectedMenu?.submenu.map( sub => (
          <a key={sub.path} onClick={() => handleSubmenuClick( sub.path )}>
            {sub.name}
          </a>
        ) )} */}

        {filterSubmenuByRole( selectedMenu?.defaultPath?.replace( '/', '' ), selectedMenu?.submenu || [] ).map( sub => (
          <a key={sub.path} onClick={() => handleSubmenuClick( sub.path )}>
            {sub.name}
          </a>
        ) )}


        <a onClick={handleLogout} style={{ color: 'red' }}>🔒 Logout</a>
        <a onClick={changePassword} style={{ color: 'red' }}>🔒 Change Password</a>
      </div>
      {/* Main content rendered here */}
      <div style={{ marginLeft: '180px', padding: '1rem', paddingTop: '60px' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default CombinedNav;
