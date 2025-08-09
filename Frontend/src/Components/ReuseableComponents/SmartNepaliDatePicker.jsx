import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Popper,
  Paper,
  Box,
  Typography,
  IconButton,
  Grid
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { BSToAD, ADToBS } from 'bikram-sambat-js';

// Helpers inside this file 👇

const isValidBSDate = (year, month, day) => {
  try {
    const ad = BSToAD({ year, month, day });
    return ad instanceof Date && !isNaN(ad);
  } catch {
    return false;
  }
};

const getNumDaysInBSMonth = (year, month) => {
  // Try up to 32, return max that succeeds
  for (let d = 32; d >= 28; d--) {
    if (isValidBSDate(year, month, d)) return d;
  }
  return 0;
};

const SmartNepaliDatePicker = ({
  label = 'मिति (वि.सं.)',
  value = '',
  onChange,
  withAD = false,
  inputProps = {},
  error,
  helperText,
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2081);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const anchorRef = useRef(null);

  useEffect(() => {
    if (value) setInputValue(value);
  }, [value]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return;

    const [_, y, m, d] = match.map(Number);
    if (isValidBSDate(y, m, d)) {
      const adDate = BSToAD({ year: y, month: m, day: d });
      onChange?.(val, withAD ? adDate : undefined);
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  };

  const handleDateClick = (day) => {
    const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setInputValue(formatted);
    const ad = BSToAD({ year: selectedYear, month: selectedMonth, day });
    onChange?.(formatted, withAD ? ad : undefined);
    setCalendarOpen(false);
  };

  const handleFocus = () => setCalendarOpen(true);
  const handleBlur = () => setTimeout(() => setCalendarOpen(false), 150);

  const renderCalendar = () => {
    const totalDays = getNumDaysInBSMonth(selectedYear, selectedMonth);
    const days = Array.from({ length: totalDays }, (_, i) => i + 1);

    return (
      <Grid container spacing={1} mt={1}>
        {days.map((day) => (
          <Grid item xs={3} key={day}>
            <Box
              onClick={() => handleDateClick(day)}
              sx={{
                px: 1,
                py: 0.5,
                textAlign: 'center',
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: '#f5f5f5',
                '&:hover': { backgroundColor: '#d0e7ff' }
              }}
            >
              {day}
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Box sx={{ position: 'relative' }} ref={anchorRef}>
        <TextField
          label={label}
          value={inputValue}
          
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          size="small"
          fullWidth
          placeholder="२०८१-०४-१५"
          InputProps={{
            endAdornment: (
              <IconButton size="small" tabIndex={-1}>
                <CalendarMonthIcon color="action" />
              </IconButton>
            ),
            ...inputProps
          }}
          error={error}
          helperText={helperText}
          {...props}
        />

        {/* <Popper open={calendarOpen} anchorEl={anchorRef.current} placement="bottom-start"> */}
        <Popper open={true} anchorEl={document.body} placement="bottom-start" style={{zIndex:3000}}>
          <Paper elevation={3} sx={{ mt: 1, p: 2, minWidth: 240 }}>
            <Typography variant="subtitle2" gutterBottom>
              {`${selectedYear} / ${String(selectedMonth).padStart(2, '0')}`}
            </Typography>
            {renderCalendar()}
          </Paper>
        </Popper>
      </Box>
    </>
  );
};

export default SmartNepaliDatePicker;