import React, { lazy, Suspense, useEffect, useState, useTransition } from 'react'
import axios from 'axios'
import { useForm, Controller } from 'react-hook-form'
import { Box, Button, Divider, Grid } from '@mui/material';
import Swal from 'sweetalert2';

import ReuseDistrict from '../../ReuseableComponents/ReuseDistrict';
import ReuseInput from '../../ReuseableComponents/ReuseInput';
import ReuseState from '../../ReuseableComponents/ReuseState';
import ReuseMunicipality from '../../ReuseableComponents/ReuseMunicipality';
import ReuseOffice from '../../ReuseableComponents/ReuseOffice';
import OfficeTable from './OfficeTable';
import { useBaseURL } from '../../../Context/BaseURLProvider';
const OfficeForm = () => {
    // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // const BASE_URL = localStorage.getItem('BASE_URL');
    const BASE_URL = useBaseURL();
    const token = localStorage.getItem('token');

    //Required Variables 
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editableData, setEditableData] = useState();


    const { register, handleSubmit, reset, setValue, watch, formState: { errors }, control } = useForm();
    const selectedState = watch("state"); // Get the selected state value
    const selectedDistrict = watch("district"); // Get the selected district value


    const onFormSubmit = async (data) => {
        setLoading(true);
        try {
            // console.log(data)
            const url = editing ? `${BASE_URL}/admin/update_office/${editableData.id}` : `${BASE_URL}/admin/add_office`;
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
            console.log(response)
            if (Status) {
                Swal.fire({
                    title: `Office ${editing ? 'updated' : 'created'} successfully!`,
                    icon: "success",
                    draggable: true
                });
                reset();
                setEditing(false);
                fetchOffices();
            } else {
                Swal.fire({
                    title: response.data.nerr,
                    icon: 'error',
                    draggable: true
                });
            }

        } catch (err) {
            console.error(err);
            Swal.fire({
                title: err?.response?.data?.nerr || err.message || "सर्भरमा समस्या आयो।",
                icon: 'error',
                draggable: true
            });
        } finally {
            setLoading(false);
        }
    }

    const [office, setOffice] = useState([]);
    const fetchOffices = async () => {
        try {
            const url = `${BASE_URL}/admin/get_offices`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { Status, Result, Error } = response.data;

            if (Status) {
                if (Array.isArray(Result) && Result.length > 0) {
                    const formatted = Result.map((opt, index) => ({
                        id: index + 1,
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
    }

    return (
        <>
            <Box sx={{ flexGrow: 1 }}>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <Grid container spacing={1}>
                        <Grid size={12}>
                            कार्यालयको विवरणः
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ReuseInput
                                name='name_np'
                                label='कर्यालयको नाम नेपालीमा'
                                required
                                control={control}
                                error={errors.name_np}
                            />
                       <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ReuseInput
                                name='name_en'
                                label='Office Name (In English)'
                                control={control}
                                error={errors.name_en}
                            />
                        </Grid>                  </Grid>
       
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* Use 'xs' instead of 'size' */}
                            <ReuseState
                                required
                                name='state'
                                label='प्रदेश'
                                control={control}
                                error={errors.state}
                                options={''}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* Use 'xs' instead of 'size' */}
                            <ReuseDistrict
                                required
                                name='district'
                                label='जिल्ला'
                                control={control}
                                error={errors.district}
                                options={''}
                                selectedState={selectedState}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* Use 'xs' instead of 'size' */}
                            <ReuseMunicipality
                                required
                                name='municipality'
                                label='गा.पा./न.पा./उ.न.पा./म.न.पा.'
                                control={control}
                                error={errors.municipality}
                                options={''}
                                selectedDistrict={selectedDistrict}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ReuseInput
                                name='ward'
                                label='वडा नं.(In English)'
                                control={control}
                                error={errors.ward}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ReuseInput
                                type='email'
                                name='email'
                                label='Email'
                                control={control}
                                error={errors.email}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <ReuseInput
                                type='number'
                                name='contact'
                                label='सम्पर्क नं.'
                                control={control}
                                error={errors.contact}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* Use 'xs' instead of 'size' */}
                            <ReuseOffice
                                required
                                name='headoffice'
                                label='तालुक कार्यालय'
                                control={control}
                                error={errors.headoffice}
                                options={''}
                            />
                        </Grid>
                        <Grid container size={12}>
                            <Grid size={6}>
                                <Button variant='contained' type='submit'>Submit</Button>
                            </Grid>
                            <Grid size={6}>
                                <Button variant='contained' color="error">Clear</Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </form>
            </Box>
            <Box>
                <OfficeTable />
            </Box>
        </>
    )
}

export default OfficeForm
