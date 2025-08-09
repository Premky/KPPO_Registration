import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import RoomPreferencesIcon from '@mui/icons-material/RoomPreferences';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import CarCrashIcon from '@mui/icons-material/CarCrash';

import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../../Context/AuthContext';
import { useBaseURL } from '../../Context/BaseURLProvider'; // Import the custom hook for base URL
const DriverMenu = () => {
    const BASE_URL = useBaseURL();
    const { state } = useAuth();
    const currentRole = state.role;
    const navigate = useNavigate();

    return (
        <div>
            {currentRole === "Superuser" && (
                <>
                    <List>
                        <ListItem disablePadding sx={{ display: 'block' }} onClick={() => { navigate(`/sadmin/users`) }}>
                            <ListItemButton sx={{ minHeight: 48, px: 2.5, justifyContent: open ? 'initial' : 'center' }}>
                                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: open ? 3 : 'auto' }}>
                                    <PeopleIcon />
                                </ListItemIcon>
                                <ListItemText primary="Users" sx={{ opacity: open ? 1 : 0 }} />
                            </ListItemButton>
                        </ListItem>

                        <ListItem disablePadding sx={{ display: 'block' }} onClick={() => { navigate(`/sadmin/office`) }}>
                            <ListItemButton sx={{ minHeight: 48, px: 2.5, justifyContent: open ? 'initial' : 'center' }}>
                                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: open ? 3 : 'auto' }}>
                                    <BusinessIcon />
                                </ListItemIcon>
                                <ListItemText primary="Office" sx={{ opacity: open ? 1 : 0 }} />
                            </ListItemButton>
                        </ListItem>

                        <ListItem disablePadding sx={{ display: 'block' }} onClick={() => { navigate(`/sadmin/branch`) }}>
                            <ListItemButton sx={{ minHeight: 48, px: 2.5, justifyContent: open ? 'initial' : 'center' }}>
                                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: open ? 3 : 'auto' }}>
                                    <RoomPreferencesIcon />
                                </ListItemIcon>
                                <ListItemText primary="Branch" sx={{ opacity: open ? 1 : 0 }} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </>
            )}
            <Divider />
            {currentRole === "Admin" || currentRole === "Superuser" && (
                <>
                    <List>
                        <ListItem disablePadding sx={{ display: 'block' }} onClick={() => { navigate(`/admin/driver`) }}>
                            <ListItemButton sx={{ minHeight: 48, px: 2.5, justifyContent: open ? 'initial' : 'center' }}>
                                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: open ? 3 : 'auto' }}>
                                    <CarCrashIcon />
                                </ListItemIcon>
                                <ListItemText primary="Vehicle & Driver" sx={{ opacity: open ? 1 : 0 }} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                    <List>
                        <ListItem disablePadding sx={{ display: 'block' }} onClick={() => { navigate(`/admin`) }}>
                            <ListItemButton sx={{ minHeight: 48, px: 2.5, justifyContent: open ? 'initial' : 'center' }}>
                                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: open ? 3 : 'auto' }}>
                                    <AirportShuttleIcon />
                                </ListItemIcon>
                                <ListItemText primary="Vehicle & Driver" sx={{ opacity: open ? 1 : 0 }} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </>
            )}
            <Divider />
            {currentRole === "User" || currentRole === "Admin" || currentRole === "Superuser" && (
                <List>
                    <ListItem disablePadding sx={{ display: 'block' }} onClick={() => { navigate(`/userpage`) }}>
                        <ListItemButton sx={{ minHeight: 48, px: 2.5, justifyContent: open ? 'initial' : 'center' }}>
                            <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', mr: open ? 3 : 'auto' }}>
                                <HomeIcon />
                            </ListItemIcon>
                            <ListItemText primary="Home" sx={{ opacity: open ? 1 : 0 }} />
                        </ListItemButton>
                    </ListItem>
                </List>
            )}
        </div>
    )
}

export default DriverMenu
