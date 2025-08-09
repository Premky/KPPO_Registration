import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
  Box, Toolbar, List, CssBaseline, Typography, Divider,
  IconButton, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Avatar, Tooltip, AppBar as MuiAppBar, Drawer as MuiDrawer
} from '@mui/material';
import {
  Menu as MenuIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  Home as HomeIcon, Logout as LogoutIcon
} from '@mui/icons-material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import DriverMenu from './DriverMenu';
import axios from 'axios';
// import VehicleAccidentMenu from './Menues/VehicleAccidentMenu';
import { useBaseURL } from '../../Context/BaseURLProvider'; // Import the custom hook for base URL
import SuperUserMenu from './Menues/SuperUserMenu';

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

export default function CombinedNavBar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { dispatch, state, fetchSession } = useAuth();

  
  const [open, setOpen] = React.useState(false);
  const [anchorElUser, setAnchorElUser] = React.useState(null);

  // const BASE_URL = localStorage.getItem('BASE_URL') || '';
  const BASE_URL = useBaseURL();

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true });
      if (response.data.success) {
        dispatch({ type: 'LOGOUT' });
        navigate('/login');
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  React.useEffect(()=>{
    fetchSession();
  },[])

  const location = useLocation();
  const appCurrType = React.useMemo(() => {
    if (location.pathname.includes('/admin/driver')) return 'dv';
    if (location.pathname.includes('/av')) return 'av';
    if (location.pathname.includes('/va')) return 'va';
    if (location.pathname.includes('/su')) return 'su';
    return '';
  }, [location.pathname]);
  const [appType, setAppType] = React.useState(appCurrType);

  const changeAppOptions = (val) => {
    setAppType(val);
    if (val === 'dv') {
      navigate('/admin/driver');
    } else if (val === 'av') {
      navigate('/av');
    } else if (val === 'su') {
      navigate('/su');
    } else {
      navigate('/');
    }
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => setOpen(!open);

  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);

  const handleCloseUserMenu = () => setAnchorElUser(null);

  const renderSideMenu = () => {
    const type = appType?.toLowerCase();
    if (type === 'dv') return <DriverMenu />;
    if (type === 'av') {
      return (
        <List>
          <ListItemButton onClick={() => navigate('/av')}>
            <ListItemIcon><HomeIcon /></ListItemIcon>
            <ListItemText primary="AV Dashboard" />
          </ListItemButton>
        </List>
      );
    }
    if (type === 'va') return <VehicleAccidentMenu />;
    if (type === 'su') return <SuperUserMenu/>;
    return null;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center">
            <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              {state?.office_np}, {state?.branch_np}
            </Typography>
          </Box>

          <Box>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }} aria-label="user avatar">
                <Avatar alt="User Avatar" src="/icons/male_icon-1.png" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem disabled>
                {state?.user} ({state?.role})
              </MenuItem>

              {state?.allowed_apps?.map((app) => (
                <MenuItem key={app.app_id} onClick={() => changeAppOptions(app.app_short_name)}>
                  {app.app_name_np}, {app.app_short_name}
                </MenuItem>
              ))}

              <MenuItem onClick={handleLogout}>
                Logout &nbsp;<LogoutIcon fontSize="small" />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerToggle}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        {renderSideMenu()}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, paddingLeft: 2 }}>
        <DrawerHeader />
        <Outlet />
      </Box>
    </Box>
  );
}
