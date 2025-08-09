import React, { useEffect, useState } from 'react';
import {
  InputLabel,
  Avatar,
  Button,
  Box,
  Typography
} from '@mui/material';
import { Controller } from 'react-hook-form';
import { Person } from '@mui/icons-material'; // 👤 Default icon

const ReusePhotoInput = ({
  name,
  label,
  required,
  control,
  error,
  defaultValue,
  maxSizeMB = 1 // Default: 1MB
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');

  return (
    <>
      <InputLabel id={name}>
        {label}
        {required && <span style={{ color: 'red' }}>*</span>}
      </InputLabel>

      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue || null}
        rules={{
          ...(required && {
            required: {
              value: true,
              message: 'यो फिल्ड अनिवार्य छ',
            },
          }),
        }}
        render={({ field: { onChange, value, ...field } }) => {
          const handleImageChange = (e) => {
            const file = e.target.files[0];
            const maxBytes = maxSizeMB * 1024 * 1024;

            if (file) {
              if (!file.type.startsWith('image/')) {
                setUploadError('कृपया मात्र फोटो (image) फाइल अपलोड गर्नुहोस्।');
                setPreviewUrl(null);
                onChange(null);
                return;
              }

              if (file.size > maxBytes) {
                setUploadError(`फोटोको साइज ${maxSizeMB}MB भन्दा कम हुनुपर्छ।`);
                setPreviewUrl(null);
                onChange(null);
                return;
              }

              setUploadError('');
              const reader = new FileReader();
              reader.onloadend = () => {
                setPreviewUrl(reader.result);
              };
              reader.readAsDataURL(file);
              onChange(file);
            }
          };

          useEffect(() => {
            // If value is a string (e.g., saved image URL), set it as preview
            if (typeof value === 'string') {
              setPreviewUrl(value);
            }
          }, [value]);

          return (
            <Box mt={1}>
              <Avatar
                variant="rounded"
                src={previewUrl || undefined}
                sx={{ width: 150, height: 150, mb: 1 }}
              >
                {!previewUrl && <Person sx={{ fontSize: 60 }} />} {/* 👤 */}
              </Avatar>

              <Button variant="contained" component="label" size="small">
                {previewUrl ? 'फोटो परिवर्तन गर्नुहोस्' : 'फोटो छान्नुहोस्'}
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handleImageChange}
                />
              </Button>

              {(error || uploadError) && (
                <Typography color="error" variant="body2" mt={1}>
                  {uploadError || error?.message}
                </Typography>
              )}
            </Box>
          );
        }}
      />
    </>
  );
};

export default ReusePhotoInput;
