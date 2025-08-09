import  { useEffect, useState } from 'react';
import axios from 'axios';
import { Autocomplete,  Grid,  InputLabel, TextField } from '@mui/material'
import { Controller } from 'react-hook-form';
import { useBaseURL } from '../../Context/BaseURLProvider';

const ReuseMuddaGroup = ({ name, label, required, control, error, defaultValue, setValue }) => {
    const BASE_URL = useBaseURL();
    const token = localStorage.getItem('token');

    const [formattedOptions, setFormattedOptions] = useState([]);

    // console.log(value);
    const fetchMudda = async () => {
        try {
            const url = `${BASE_URL}/public/get_mudda_groups`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { Status, Result, Error } = response.data;

            if (Status) {
                if (Array.isArray(Result) && Result.length > 0) {
                    const formatted = Result.map((opt) => ({
                        label: opt.mudda_group_name,
                        value: opt.id,
                    }));
                    setFormattedOptions(formatted);
                } else {
                    console.log('No mudda records found.');
                }
            } else {
                console.log(Error || 'Failed to fetch mudda.');
            }
        } catch (error) {
            console.error('Error fetching muddas:', error);
        }
    };

    useEffect(() => {
        fetchMudda();
    }, []);

    useEffect(() => {
        if (formattedOptions.length && defaultValue) {
            const matched = formattedOptions.find(opt => String(opt.value) === String(defaultValue));
            if (matched) {
                setValue(name, matched.value); // 👈 this ensures UI shows correct default
            }
        }
    }, [formattedOptions, defaultValue, name, setValue]);

    return (
        <>
            <InputLabel id={name}>
                <Grid container alignItems="center">
                    <Grid size={{xs:12, sm:6, md:6}}>
                        {label}
                    </Grid>
                    <Grid size={{xs:12, sm:6, md:6}}>
                        {required && <span style={{ color: 'red' }}>*</span>}
                    </Grid>
                </Grid>
            </InputLabel>

            <Controller
                name={name}
                control={control}
                defaultValue=""
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
                        isOptionEqualToValue={(option, val) => option.value === val}
                        value={
                            formattedOptions.find((option) => String(option.value) === String(value)) || null
                        }
                        onChange={(_, newValue) => {
                            onChange(newValue ? newValue.value : '');
                        }}
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

export default ReuseMuddaGroup;
