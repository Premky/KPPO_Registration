import React, { useEffect, useState } from 'react';
import {
    Autocomplete, Box, Button, Divider, Grid, InputLabel, Paper,
    TextField, Typography
} from '@mui/material';
// import Grid from '@mui/material/Unstable_Grid';

import { useBaseURL } from '../../../Context/BaseURLProvider';
import axios from 'axios';
import { Controller, useForm } from 'react-hook-form';
import { DataGrid } from "@mui/x-data-grid";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const AssignApps = () => {
    const BASE_URL = useBaseURL();
    const { handleSubmit, reset, control } = useForm();
    const [editing, setEditing] = useState(false);
    const [users, setUsers] = useState([]);
    const [apps, setApps] = useState([]);
    const [assignedApps, setAssignedApps] = useState([]);
    const [formattedRows, setFormattedRows] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);

    const fetchData = async (url, params, setStateFunction) => {
        try {
            const response = await axios.get(url, { params, withCredentials: true });
            const { Status, Result, Error } = response.data;
            if (Status) {
                setStateFunction(Result);
            } else {
                console.error(Error || 'Failed to fetch records');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('An error occurred while fetching data.');
        }
    };

    const fetchUsers = () => {
        fetchData(`${BASE_URL}/auth/get_users`, {}, setUsers);
    };

    const fetchApps = () => {
        fetchData(`${BASE_URL}/public/get_apps`, {}, setApps);
    };

    const fetchAssignedApps = async (user_id = null) => {
        const params = user_id ? { user_id } : {};         
        fetchData(`${BASE_URL}/admin/get_assigned_apps`, params, (result) => {
            setAssignedApps(result);
            const formatted = result.map((item, index) => ({
                id: index + 1,
                user_name: `${item.user_name} (${item.username})`,
                app_name: item.app_name
            }));
            setFormattedRows(formatted);
        });
    };

    const onFormSubmit = async (data) => {
        try {
            const response = await axios.post(`${BASE_URL}/admin/add_app`, data, { withCredentials: true });
            const { Status } = response.data;
            if (Status) {
                alert('App assigned successfully!');
                reset();
                fetchAssignedApps(selectedUserId);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred while submitting the form.');
        }
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Assigned Apps");

        worksheet.addRow(["सि.नं.", "प्रयोगकर्ता नाम", "नाम"]);

        formattedRows.forEach((row, index) => {
            worksheet.addRow([index + 1, row.user_name, row.app_name]);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "assigned_apps.xlsx");
    };

    useEffect(() => {
        fetchUsers();
        fetchApps();
        fetchAssignedApps();
    }, []);

    const columns = [
        { field: "id", headerName: "सि.नं.", width: 100 },
        { field: "user_name", headerName: "नाम", flex: 1 },
        { field: "app_name", headerName: "प्रयोगकर्ता नाम", flex: 1 }
    ];

    return (
        <Box sx={{ flexGrow: 1, margin: 2 }}>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <Grid container spacing={1}>
                    <Grid xs={12}>
                        <Typography variant="h6">Assign Applications:</Typography>
                    </Grid>

                    <Grid xs={12} sm={6} md={3}>
                        <InputLabel>Username:</InputLabel>
                        <Controller
                            name="user"
                            control={control}
                            render={({ field: { onChange, value, ref } }) => (
                                <Autocomplete
                                    options={users}
                                    autoHighlight
                                    getOptionLabel={(option) => `${option.name} (${option.username})`}
                                    value={users.find((u) => u.id === value) || null}
                                    onChange={(_, newVal) => {
                                        const userId = newVal?.id || '';
                                        onChange(userId);
                                        setSelectedUserId(userId);
                                        fetchAssignedApps(userId);
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} inputRef={ref} variant="outlined" size="small" required />
                                    )}
                                />
                            )}
                        />
                    </Grid>

                    <Grid xs={12} sm={6} md={3}>
                        <InputLabel>Apps:</InputLabel>
                        <Controller
                            name="app"
                            control={control}
                            render={({ field: { onChange, value, ref } }) => (
                                <Autocomplete
                                    options={apps}
                                    autoHighlight
                                    getOptionLabel={(option) => `${option.name_np} (${option.short_name})`}
                                    value={apps.find((a) => a.id === value) || null}
                                    onChange={(_, newVal) => onChange(newVal?.id || '')                                    }
                                    renderInput={(params) => (
                                        <TextField {...params} inputRef={ref} variant="outlined" size="small" required />
                                    )}
                                />
                            )}
                        />
                    </Grid>

                    <Grid xs={12} sm={6} md={3}>
                        <Button variant="contained" type="submit" color="primary" sx={{ mt: 3 }}>
                            Assign
                        </Button>
                    </Grid>
                </Grid>
            </form>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
                Assigned Applications:
            </Typography>

            <Button variant="outlined" onClick={handleExportExcel} sx={{ mb: 2 }}>
                Export to Excel
            </Button>

            <Paper sx={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={formattedRows}
                    columns={columns}
                    pageSize={10}
                    rowsPerPageOptions={[10]}
                    disableRowSelectionOnClick
                />
            </Paper>
        </Box>
    );
};

export default AssignApps;
