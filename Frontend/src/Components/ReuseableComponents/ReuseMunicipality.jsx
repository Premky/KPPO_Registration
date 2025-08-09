import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { InputLabel, TextField, Autocomplete } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useBaseURL } from '../../Context/BaseURLProvider';

const ReuseMunicipality = ({ name, label, required, control, error, selectedDistrict }) => {
    const BASE_URL = useBaseURL();
    const token = localStorage.getItem('token');

    const [municipality, setMunicipality] = useState([]);

    // Fetch Municipality data once
    useEffect(() => {
        const fetchMunicipality = async () => {
            try {
                const url = `${BASE_URL}/public/get_municipalities`;
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const { Status, Result, Error } = response.data;

                if (Status) {
                    const formatted = Result.map((opt) => ({
                        label: opt.city_name_np,
                        value: opt.cid,
                        state_id: opt.district_id,
                    }));

                    setMunicipality(formatted);
                } else {
                    console.error(Error || 'Failed to fetch Municipality.');
                }
            } catch (error) {
                console.error('Error fetching municipalities:', error);
            }
        };

        fetchMunicipality();
    }, [BASE_URL, token]);

    // Filter municipalities based on selectedDistrict
    const filteredMunicipality = useMemo(() => {
        if (selectedDistrict) {
            return municipality.filter(d => d.state_id === selectedDistrict);
        }
        return municipality;
    }, [selectedDistrict, municipality]);

    return (
        <>
            <InputLabel id={name}>
                {label}
                {required && <span style={{ color: 'red' }}>*</span>}
            </InputLabel>

            <Controller
                name={name}
                control={control}
                rules={{
                    ...(required && {
                        required: {
                            value: true,
                            message: 'यो फिल्ड अनिवार्य छ',
                        },
                    }),
                }}
                render={({ field: { onChange, value, ref } }) => {
                    const selectedOption = municipality.find((option) => option.value === value) || null;

                    if (value && !selectedOption) {
                        console.warn(`Municipality with ID ${value} not found in fetched options`);
                    }
                    return (
                        <Autocomplete
                            id={name}
                            options={filteredMunicipality}
                            autoHighlight
                            getOptionLabel={(option) => option.label || ''}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            value={selectedOption}
                            onChange={(_, newValue) => onChange(newValue ? newValue.value : '')}
                            sx={{ width: '100%' }}
                            renderOption={(props, option) => (
                                // Ensure key is unique (use the ID)
                                <li {...props} key={option.value}>
                                    {option.label}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    inputRef={ref}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    margin="normal"
                                    error={!!error}
                                    helperText={error?.message || ''}
                                    required={required}
                                />
                            )}
                        />


                    );
                }}
            />
        </>
    );
};

export default ReuseMunicipality;
