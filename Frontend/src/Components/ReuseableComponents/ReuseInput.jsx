import React from 'react';
import { InputLabel, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

const ReuseInput = ({
  name,
  label,
  required,
  control,
  error,
  placeholder,
  type = 'text',
  readonly,
  maxLength,
  minLength,
  max,
  inputProps,
  defaultValue,
  onlyDigits = false,
}) => {
  const rules = {
    ...(required && {
      required: {
        value: true,
        message: 'यो फिल्ड अनिवार्य छ',
      },
    }),
    ...(minLength && {
      minLength: {
        value: minLength,
        message: `कम्तिमा ${minLength} अंक हुनुपर्छ`,
      },
    }),
    ...(maxLength && {
      maxLength: {
        value: maxLength,
        message: `अधिकतम ${maxLength} अंक मात्र हुनसक्छ`,
      },
    }),
    ...(onlyDigits && {
      pattern: {
        value: /^[0-9]*$/,
        message: 'कृपया केवल अंकहरू प्रविष्ट गर्नुहोस्',
      },
    }),
  };


  return (
    <>
      <InputLabel id={name}>
        {label}
        {required && <span style={{ color: 'red' }}>*</span>}
      </InputLabel>

      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue ?? ''}
        rules={rules}
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value ?? ''}
            id={name}
            variant="outlined"
            size="small"
            fullWidth
            margin="normal"
            error={!!error}
            helperText={error?.message || ''}
            required={required}
            placeholder={placeholder}
            type={type}
            InputProps={{ readOnly: readonly }}
            inputProps={{
              maxLength: maxLength || 255,
              inputMode: onlyDigits ? 'numeric' : undefined,
              pattern: onlyDigits ? '[0-9]*' : undefined,
              ...(inputProps || {}),
            }}
          />

        )}
      />
    </>
  );
};

export default ReuseInput;
