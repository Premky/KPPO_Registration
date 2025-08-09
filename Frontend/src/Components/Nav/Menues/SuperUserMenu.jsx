import React from 'react';
import { List, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../Context/AuthContext';

import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import DifferenceIcon from '@mui/icons-material/Difference';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';

HomeWorkIcon
const SuperUserMenu = () => {
  const { state } = useAuth();
  const navigate = useNavigate();

  // You can use role-based conditions if needed in future
  const currentRole = state.role;

  return (
    <List>
      <ListItemButton onClick={() => navigate('/su')}>
        <ListItemIcon> <PersonAddAltIcon />    </ListItemIcon>
        <ListItemText primary="USER FORM" />
      </ListItemButton>
      <ListItemButton onClick={() => navigate('/su/apps')}>
        <ListItemIcon> <DifferenceIcon />    </ListItemIcon>
        <ListItemText primary="Assign Apps" />
      </ListItemButton>
      <ListItemButton onClick={() => navigate('/su/office')}>
        <ListItemIcon> <HomeWorkIcon />    </ListItemIcon>
        <ListItemText primary="Office" />
      </ListItemButton>
      <ListItemButton onClick={() => navigate('/su/branch')}>
        <ListItemIcon> <AddBusinessIcon />    </ListItemIcon>
        <ListItemText primary="Assign Apps" />
      </ListItemButton>
    </List>
  );
};

export default SuperUserMenu;
