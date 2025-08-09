import React, { useState, useEffect } from "react";
import { Controller } from "react-hook-form";
import { NepaliDatePicker } from "nepali-datepicker-reactjs";
import "nepali-datepicker-reactjs/dist/index.css";
import { TextField, InputLabel, Box, Typography } from "@mui/material";

const ReuseDatePickerBS = ( {
    control,
    name,
    label,
    required = false,
    defaultValue = "",
} ) => {
    const [dateValue, setDateValue] = useState( defaultValue );

    useEffect( () => {
        setDateValue( defaultValue );
    }, [defaultValue] );

    return (
        <>
            <InputLabel id={name}>
                {label}
                {required && <span style={{ color: 'red' }}>*</span>}
            </InputLabel>
            <Controller
                name={name}
                control={control}
                defaultValue={defaultValue}
                rules={{
                    ...( required && {
                        required: "यो फिल्ड अनिवार्य छ",
                    } ),
                    pattern: {
                        value: /^\d{4}-\d{2}-\d{2}$/,
                        message: "मिति YYYY-MM-DD ढाँचामा हुनुपर्छ",
                    },
                }}
                render={( { field: { onChange, value }, fieldState: { error } } ) => (
                    <Box sx={{ mb: 2, mt:2 }}>
                        {/* <Typography
                            component="label"
                            htmlFor={name}
                            sx={{ display: "block", mb: 0.5, fontWeight: "500" }}
                        >
                            {label} {required && <span style={{ color: "red" }}>*</span>}
                        </Typography> */}

                        <NepaliDatePicker
                            value={value || ""}
                            onChange={( val ) => {
                                setDateValue( val );
                                onChange( val );
                            }}
                            inputClassName="nepali-datepicker-input"
                            options={{ calenderLocale: "ne", valueLocale: "en" }}
                        />

                        {/* Custom styles for the datepicker input to match MUI TextField */}
                        <style>{`
            .nepali-datepicker-input {
              width: 100%;
              padding: 10.5px 14px;
              font-size: 0.875rem;
              border-radius: 4px;
              border: 1px solid ${ error ? "#d32f2f" : "rgba(0, 0, 0, 0.23)" };
              font-family: "Roboto", "Helvetica", "Arial", sans-serif;
              transition: border-color 0.2s ease-in-out;
              box-sizing: border-box;
              outline: none;
            }
            .nepali-datepicker-input:focus {
              border-color: ${ error ? "#d32f2f" : "#1976d2" };
              box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.25);
            }
          `}</style>

                        {error && (
                            <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5, display: "block" }}
                            >
                                {error.message}
                            </Typography>
                        )}
                    </Box>
                )}
            />
        </>
    );
};

export default ReuseDatePickerBS;
