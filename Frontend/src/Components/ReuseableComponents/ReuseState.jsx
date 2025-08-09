import React, { useEffect, useState } from 'react';
import axios from 'axios'; // Import axios
import { InputLabel, TextField, Autocomplete } from '@mui/material';
import { Controller } from 'react-hook-form';
import { Box } from '@mui/material';
import { useBaseURL } from '../../Context/BaseURLProvider'; // Import the custom hook for base URL

const ReuseState = ({ name, label, required, control, error }) => {
    // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // const BASE_URL = localStorage.getItem('BASE_URL');
    const BASE_URL = useBaseURL(); // Custom hook to get the base URL
    const token = localStorage.getItem('token');

    // State to store district options
    const [formattedOptions, setFormattedOptions] = useState([]);


    const fetchState = async () => {
        try {
            const url = `${BASE_URL}/public/get_states`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { Status, Result, Error } = response.data;

            if (Status) {
                if (Array.isArray(Result) && Result.length > 0) {
                    const formatted = Result.map((opt) => ({
                        label: opt.state_name_np, // Use Nepali name
                        value: opt.state_id, // Use ID as value
                    }));
                    setFormattedOptions(formatted);
                } else {
                    console.log('No country records found.');
                }
            } else {
                console.log(Error || 'Failed to fetch countries.');
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    useEffect(() => {
        fetchState();
    }, []);

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
                render={({ field: { onChange, value, ref } }) => (
                    <Autocomplete
                        id={name}
                        options={formattedOptions}
                        autoHighlight
                        getOptionLabel={(option) => option.label || ''}
                        value={formattedOptions.find((option) => option.value === value) || null}
                        onChange={(_, newValue) => onChange(newValue ? newValue.value : '')}
                        sx={{ width: '100%' }}
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
                )}
            />

        </>
    );
};

export default ReuseState;
