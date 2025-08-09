import NepaliDate from 'nepali-datetime';

export const calculateBSDate = (startDate, endDate, referenceDuration = null) => {
  const MAX_VALID_BS = "2099-12-30";
  const MS_IN_DAY = 1000 * 60 * 60 * 24;

  try {
    let startAD, endAD;
    let validEndAD = null;
    let usedPartialFallback = false;

    let totalDays = 0;
    let years = 0, months = 0, days = 0;

    // Try creating NepaliDate objects
    let startDate1 = null;
    let endDate1 = null;

    try {
      startDate1 = new NepaliDate(startDate);
      endDate1 = new NepaliDate(endDate);
    } catch (err) {
      throw new Error("Start or end date is completely invalid");
    }

    startAD = startDate1.getDateObject();

    // Try to create valid end date in NepaliDate
    try {
      endDate1 = new NepaliDate(endDate);
      endAD = endDate1.getDateObject();

      // ✅ Fully valid date range — normal flow
      const startYear = startDate1.year;
      const startMonth = startDate1.month + 1;
      const startDay = startDate1.day;

      const endYear = endDate1.year;
      const endMonth = endDate1.month + 1;
      const endDay = endDate1.day;

      years = endYear - startYear;
      months = endMonth - startMonth;
      days = endDay - startDay;

      if (days < 0) {
        months--;
        days += NepaliDate.getDaysOfMonth(endYear, endMonth - 1);
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      totalDays = Math.floor((endAD - startAD) / MS_IN_DAY);
    } catch (err) {
      // ⚠️ Invalid endDate, fallback from max valid
      usedPartialFallback = true;

      const validEnd = new NepaliDate(MAX_VALID_BS);
      validEndAD = validEnd.getDateObject();

      // Calculate valid range first
      const validEndYear = validEnd.year;
      const validEndMonth = validEnd.month + 1;
      const validEndDay = validEnd.day;

      const startYear = startDate1.year;
      const startMonth = startDate1.month + 1;
      const startDay = startDate1.day;

      let y = validEndYear - startYear;
      let m = validEndMonth - startMonth;
      let d = validEndDay - startDay;

      if (d < 0) {
        m--;
        d += NepaliDate.getDaysOfMonth(validEndYear, validEndMonth - 1);
      }

      if (m < 0) {
        y--;
        m += 12;
      }

      // Convert manual portion to AD
      const manualEnd = new Date(endDate);
      const fallbackDays = Math.floor((manualEnd - validEndAD) / MS_IN_DAY);
      const manualYears = Math.floor(fallbackDays / 365);
      const manualMonths = Math.floor((fallbackDays % 365) / 30);
      const manualDays = (fallbackDays % 365) % 30;

      // Total values
      years = y + manualYears;
      months = m + manualMonths;
      days = d + manualDays;

      // Normalize (e.g., 15 months → 1 year + 3 months)
      if (days >= 30) {
        months += Math.floor(days / 30);
        days = days % 30;
      }
      if (months >= 12) {
        years += Math.floor(months / 12);
        months = months % 12;
      }

      totalDays = Math.floor((manualEnd - startAD) / MS_IN_DAY);
    }

    let percentage = null;
    if (referenceDuration && referenceDuration.totalDays > 0) {
      percentage = ((totalDays / referenceDuration.totalDays) * 100).toFixed(2);
    }

    const formattedDuration = `${years}|${months}|${days}`;

    return {
      years,
      months,
      days,
      totalDays,
      percentage: percentage ? parseFloat(percentage) : undefined,
      formattedDuration,
      usedFallback: usedPartialFallback
    };

  } catch (err) {
    console.error("❌ Error in calculateBSDate:", err);
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      percentage: 0,
      formattedDuration: '0|0|0',
      usedFallback: true
    };
  }
};


export const calculateBSDate1 = (startDate, endDate, referenceDuration = null) => {
  try {
    const startDate1 = new NepaliDate(startDate);
    const endDate1 = new NepaliDate(endDate);

    const startYear = startDate1.year;
    const startMonth = startDate1.month + 1;
    const startDay = startDate1.day;

    const endYear = endDate1.year;
    const endMonth = endDate1.month + 1;
    const endDay = endDate1.day;

    let years = endYear - startYear;
    let months = endMonth - startMonth;
    let days = endDay - startDay;

    if (days < 0) {
      months--;
      days += NepaliDate.getDaysOfMonth(endYear, endMonth - 1);
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const startAD = startDate1.getDateObject();
    const endAD = endDate1.getDateObject();

    let totalDays = Math.floor((endAD - startAD) / (1000 * 60 * 60 * 24));
    if (totalDays < 0) totalDays = 0;

    let percentage = null;
    if (referenceDuration && referenceDuration.totalDays > 0) {
      percentage = ((totalDays / referenceDuration.totalDays) * 100).toFixed(2);
    }

    const formattedDuration=years+'|'+months+'|'+days

    return {
      years,
      months,
      days,
      totalDays,
      percentage: percentage ? parseFloat(percentage) : undefined,
      formattedDuration
    };
  } catch (err) {
    console.error("Error in calculateBSDate:", err);
    // Return safe fallback object
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      percentage: 0
    };
  }
};

export const sumDates = (hirasat_years, hirasat_months, hirasat_days, referenceDuration = null) => {
  try {
    let totalYears = parseFloat(referenceDuration.years || 0) + parseFloat(hirasat_years || 0);
    let totalMonths = parseFloat(referenceDuration.months || 0) + parseFloat(hirasat_months || 0);
    let totalDays = parseFloat(referenceDuration.days || 0) + parseFloat(hirasat_days || 0);
  
    // Normalize days to months
    if (totalDays >= 30) {
      totalMonths += Math.floor(totalDays / 30);
      totalDays = totalDays % 30;
    }

    // Normalize months to years
    if (totalMonths >= 12) {
      totalYears += Math.floor(totalMonths / 12);
      totalMonths = totalMonths % 12;
    }

    return {
      totalDays: totalDays,
      totalMonths: totalMonths,
      totalYears: totalYears
    }
  } catch {
    return {
      totalDays: 0,
      totalMonths: 0,
      totalYears: 0
    }
  }
  // Parse and add kaid and hirasat durations

}

export const calculateDateDetails = (startDate, endDate, referenceDuration = null) => {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return null;

  let totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) totalDays = 0;

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  let percentage = null;
  if (referenceDuration && referenceDuration.totalDays > 0) {
    percentage = ((totalDays / referenceDuration.totalDays) * 100).toFixed(2);
  }

  return {
    years,
    months,
    days,
    totalDays,
    percentage: percentage ? parseFloat(percentage) : undefined
  };
};
