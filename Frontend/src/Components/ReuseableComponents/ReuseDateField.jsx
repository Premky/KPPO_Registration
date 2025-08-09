import React, { useState, useEffect } from 'react';
import { InputLabel, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

const ReuseDateField = ({ name, label, required, control, error, placeholder, onChange: propsOnChange, defaultValue }) => {
    // console.log(defaultValue)
    return (
        <>
            <InputLabel id={name}>
                {label}
                {required && <span style={{ color: 'red' }}>*</span>}
            </InputLabel>

            <Controller
                name={name}
                control={control}
                defaultValue={defaultValue} // Provide a default value

                rules={{
                    ...(required && {
                        required: {
                            value: true,
                            message: 'यो फिल्ड अनिवार्य छ',
                        },
                    }),
                    validate: (value) => {
                        if (!value) return true; // Skip pattern check if empty (and not required)
                        const pattern = /^\d{4}-\d{2}-\d{2}$/;
                        return pattern.test(value) || 'मिति YYYY-MM-DD ढाँचामा हुनुपर्छ';
                    },
                }}

                render={({ field: { onChange, onBlur, value, ref } }) => {
                    const [formattedValue, setFormattedValue] = useState(value || "");

                    useEffect(() => {
                        setFormattedValue(value || ""); // Sync with external changes
                    }, [value]);

                    const handleInputChange = (e) => {
                        const inputValue = e.target.value.replace(/[^0-9]/g, ""); // Allow only numbers
                        let formatted = inputValue;

                        if (inputValue.length > 4) {
                            const year = inputValue.slice(0, 4);
                            const month = inputValue.slice(4, 6);
                            formatted = `${year}-${month}`;
                        }
                        if (inputValue.length > 6) {
                            const year = inputValue.slice(0, 4);
                            let month = inputValue.slice(4, 6);
                            let day = inputValue.slice(6, 8);

                            // Validate month
                            if (parseInt(month, 10) > 12) {
                                month = "12";
                            }
                            // Validate day
                            if (parseInt(day, 10) > 32) {
                                day = "32";
                            }

                            formatted = `${year}-${month}-${day}`;
                        }

                        formatted = formatted.slice(0, 10); // Limit to yyyy-mm-dd
                        setFormattedValue(formatted);
                        onChange(formatted); // internal RHF update
                        if (typeof propsOnChange === 'function') {
                            propsOnChange(formatted); // external prop callback
                        }
                    };

                    return (
                        <TextField
                            inputRef={ref}
                            id={name}
                            variant="outlined"
                            size="small"
                            fullWidth
                            margin="normal"
                            error={!!error}
                            helperText={error?.message || ""}
                            required={required}
                            placeholder={defaultValue||placeholder}
                            value={defaultValue||formattedValue}
                            onChange={handleInputChange}
                            onBlur={onBlur}
                            inputProps={{ maxLength: 10 }}
                        />
                    );
                }}
            />
        </>
    );
};

export default ReuseDateField;
