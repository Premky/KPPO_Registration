import React, { lazy, Suspense, useEffect, useState, useTransition } from 'react'
import axios from 'axios'
import { useForm, Controller } from 'react-hook-form'
import { Box, Button, Divider, Grid } from '@mui/material';
import Swal from 'sweetalert2'

import ReuseDistrict from '../../ReuseableComponents/ReuseDistrict';
import ReuseInput from '../../ReuseableComponents/ReuseInput';
import ReuseState from '../../ReuseableComponents/ReuseState';
import ReuseMunicipality from '../../ReuseableComponents/ReuseMunicipality';
import ReuseOffice from '../../ReuseableComponents/ReuseOffice';
import ReusableTable from '../../ReuseableComponents/ReuseTable';
import { useBaseURL } from '../../../Context/BaseURLProvider'


const BranchForm = () => {
    // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // const BASE_URL = localStorage.getItem('BASE_URL');
    // const BASE_URL = localStorage.getItem('BASE_URL');
    const BASE_URL = useBaseURL();
    const token = localStorage.getItem('token');

    //Required Variables 
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editableData, setEditableData] = useState();

    const { register, handleSubmit, reset, setValue, watch, formState: { errors }, control } = useForm();

    const onFormSubmit = async (data) => {
        setLoading(true);
        try {
            const url = editing ? `${BASE_URL}/admin/update_branch_name/${editableData.id}` : `${BASE_URL}/admin/add_branch_name`;
            const method = editing ? 'PUT' : 'POST';
            const response = await axios({
                method, url, data: data,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                withCredentials: true
            })
            const { Status, Result, Error } = response.data;
            // console.log(response.data)
            if (Status) {
                Swal.fire({
                    title: `Branch ${editing ? 'updated' : 'created'} successfully!`,
                    icon: "success",
                    draggable: true
                });
                reset();
                setEditing(false);
                fetchBranches();
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                title: err.response.data.message,
                icon: 'error',
                draggable: true
            });
        } finally {
            setLoading(false);
        }
    }

    const [formattedOptions, setFormattedOptions] = useState([]);
    const fetchBranches = async () => {
        try {
            const url = `${BASE_URL}/admin/get_branch_name`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { Status, Result, Error } = response.data;

            if (Status) {
                if (Array.isArray(Result) && Result.length > 0) {
                    const formatted = Result.map((opt, index) => ({
                        id: opt.id ?? `branch-${index}`,  // Ensure each row has a unique id
                        sn: index + 1,  // Ensure each row has a unique id
                        name_np: opt.name_np,
                        name_en: opt.name_en,
                    }));
                    setFormattedOptions(formatted);
                } else {
                    console.log('No records found.');
                }
            } else {
                console.log(Error || 'Failed to fetch.');
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        } finally {
            setLoading(false);
        }
    };


    // Handle edit action
    const handleEdit = (row) => {
        console.log("Editing user:", row);
        setEditableData(row);
        setEditing(true);

        setValue('name_np', row.name_np);
        setValue('name_en', row.name_en)
    };

    useEffect(() => {
        fetchBranches();

    }, [])

    const columns = [
        { field: "sn", headerName: "सि.नं." },
        { field: "name_np", headerName: "शाखा" },
        { field: "name_en", headerName: "Branch" },
    ];
    return (
        <>
            <Box sx={{ flexGrow: 1 }}>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <Grid container spacing={1}>
                        <Grid size={12}>
                            शाखाहरु थप्नुहोस्
                        </Grid>
                        <Grid size={{ md: 5 }}>
                            <ReuseInput
                                name='name_np'
                                label='शाखाको नाम नेपालीमा'
                                required
                                control={control}
                                error={errors.name_np}
                            />
                        </Grid>
                        <Grid size={{ md: 5 }}>
                            <ReuseInput
                                name='name_en'
                                label='Branch Name (In English)'
                                control={control}
                                error={errors.name_en}
                            />
                        </Grid>
                        <Grid container size={{ md: 2 }}>
                            <Button variant='contained' type='submit'>Save</Button>
                        </Grid>

                        <Grid container size={12}>
                        </Grid>
                    </Grid>
                </form>
            </Box>
            <Box>
                <ReusableTable
                    columns={columns}
                    rows={formattedOptions}
                    height="800"
                    showEdit={true}
                    showDelete={false}
                    onEdit={handleEdit}

                />
            </Box>
        </>
    )
}

export default BranchForm