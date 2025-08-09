import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Logout from '../Auth/Logout';
import LogoutIcon from '@mui/icons-material/Logout';
import { useBaseURL } from '../../Context/BaseURLProvider'; // Import the custom hook for base URL
// const pages = ['Products', 'Pricing', 'Blog'];

function Navbar() {
  const { dispatch } = useAuth();
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const navigate = useNavigate();

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  // const BASE_URL = localStorage.getItem('BASE_URL');
  const BASE_URL = useBaseURL();

  const handleLogout = async () => {
    console.log("Logged out");

    try {
      const response = await axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true });
      console.log(response);
      if (response.data.success) {
        dispatch({ type: 'LOGOUT' });
      }
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  const changeappoptions = async (data) => {
    localStorage.setItem('app', data);
    
  }
  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'block' } }}>
            <Typography
              variant="h5"
              component="a"
              sx={{
                mr: 2,
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {localStorage.getItem('office_np')}, {localStorage.getItem('branch')}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt="User Avatar" src="/icons/male_icon-1.png" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={handleCloseUserMenu}>
                {sessionStorage.getItem('user')}
              </MenuItem>

              <MenuItem onClick={() => changeappoptions('driver')}>
                Driver & Vehicle
              </MenuItem>

              <MenuItem onClick={() => changeappoptions('av')}>
                Arrested Vehicle
              </MenuItem>

              <MenuItem onClick={handleCloseUserMenu}>
                <Logout /> &nbsp; <LogoutIcon />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;
