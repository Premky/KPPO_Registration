import NepaliDate from 'nepali-datetime';

export const calculateBSDate = ( startDate, endDate, referenceDuration = null, hirasat_years = 0, hirasat_months = 0, hirasat_days = 0 ) => {
  try {
    let startDate1, endDate1;
    let startAD, endAD;

    try {
      startDate1 = new NepaliDate( startDate );
      endDate1 = new NepaliDate( endDate );

      // This will throw if the date is invalid
      startAD = startDate1.getDateObject();
      endAD = endDate1.getDateObject();
    } catch ( err ) {
      console.warn( "⚠️ NepaliDate failed, using fallback:", err );

      // Fallback: assume startDate and endDate are in YYYY-MM-DD format (AD)
      startAD = new Date( startDate );
      endAD = new Date( endDate );

      if ( isNaN( startAD.getTime() ) || isNaN( endAD.getTime() ) ) {
        throw new Error( "Invalid fallback dates" );
      }

      let totalDays = Math.floor( ( endAD - startAD ) / ( 1000 * 60 * 60 * 24 ) );
      if ( totalDays < 0 ) totalDays = 0;
      const hirasatTotalDays = ( hirasat_years * 365 ) + ( hirasat_months * 30 ) + ( hirasat_days );
      totalDays += hirasatTotalDays;
      const years = Math.floor( totalDays / 365 );
      const remainingDays = totalDays % 365;
      const months = Math.floor( remainingDays / 30 );
      const days = ( remainingDays % 30 );

      let percentage = null;
      if ( referenceDuration && referenceDuration.totalDays > 0 ) {
        percentage = ( ( totalDays / referenceDuration.totalDays ) * 100 ).toFixed( 2 );
      }

      const formattedDuration = years + '|' + months + '|' + days;

      return {
        years,
        months,
        days,
        totalDays,
        percentage: percentage ? parseFloat( percentage ) : undefined,
        formattedDuration,
        usedFallback: true
      };
    }

    // Proceed with valid NepaliDate calculations
    const startYear = startDate1.year;
    const startMonth = startDate1.month + 1;
    const startDay = startDate1.day;

    const endYear = endDate1.year;
    const endMonth = endDate1.month + 1;
    const endDay = endDate1.day;

    let years = endYear - startYear + hirasat_years;
    let months = endMonth - startMonth + hirasat_months;
    let days = endDay - startDay + hirasat_days;

    
    if ( days <= 0 ) {
      months--;     
      // days += NepaliDate.getDaysOfMonth( endYear, endMonth - 1 );
      days += 30;
    }

    // if ( days >= NepaliDate.getDaysOfMonth( endYear, endMonth ) ) {
    //   months++;
    //   days -= NepaliDate.getDaysOfMonth( endYear, endMonth );
    // }

    if ( days >= 30 ) {
      months++;
      days -= 30;      
    }

    if ( months < 0 ) {
      years--;
      months += 12;
    }

    let totalDays = Math.floor( ( endAD - startAD ) / ( 1000 * 60 * 60 * 24 ) );
    if ( totalDays < 0 ) totalDays = 0;
    const hirasatTotalDays = ( hirasat_years * 365 ) + ( hirasat_months * 30 ) + ( hirasat_days );
    totalDays += hirasatTotalDays;

    let percentage = null;
    if ( referenceDuration && referenceDuration.totalDays > 0 ) {
      percentage = ( ( totalDays / referenceDuration.totalDays ) * 100 ).toFixed( 2 );
    }

    const formattedDuration = years + '|' + months + '|' + days;

    return {
      years,
      months,
      days,
      totalDays,
      percentage: percentage ? parseFloat( percentage ) : undefined,
      formattedDuration,
      usedFallback: false
    };
  } catch ( err ) {
    console.error( "❌ Error in calculateBSDate:", err );
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


export const calculateBSDate1 = ( startDate, endDate, referenceDuration = null ) => {
  try {
    // Step 1: Check if both inputs exist
    if ( !startDate || !endDate ) {
      throw new Error( `Missing input: ${ !startDate ? 'startDate is missing' : '' } ${ !endDate ? 'endDate is missing' : '' }` );
    }

    // Step 2: Attempt to parse dates
    let startDate1, endDate1;
    try {
      startDate1 = new NepaliDate( startDate );
    } catch ( e ) {
      throw new Error( `Invalid startDate format: "${ startDate }"` );
    }

    try {
      endDate1 = new NepaliDate( endDate );
    } catch ( e ) {
      throw new Error( `Invalid endDate format: "${ endDate }"` );
    }

    // Duration calculation
    const startYear = startDate1.year;
    const startMonth = startDate1.month + 1;
    const startDay = startDate1.day;

    const endYear = endDate1.year;
    const endMonth = endDate1.month + 1;
    const endDay = endDate1.day;

    let years = endYear - startYear;
    let months = endMonth - startMonth;
    let days = endDay - startDay;

    if ( days < 0 ) {
      months--;
      days += NepaliDate.getDaysOfMonth( endYear, endMonth - 1 );
    }

    if ( months < 0 ) {
      years--;
      months += 12;
    }

    const startAD = startDate1.getDateObject();
    const endAD = endDate1.getDateObject();

    // Step 3: Validate the converted JS Date objects
    if ( isNaN( startAD ) ) {
      throw new Error( `startDate "${ startDate }" could not be converted to a valid Date` );
    }
    if ( isNaN( endAD ) ) {
      throw new Error( `endDate "${ endDate }" could not be converted to a valid Date` );
    }

    let totalDays = '';
    let percentage = '';
    if ( isNaN( startAD ) || isNaN( endAD ) ) {
      totalDays = Math.floor( ( endAD - startAD ) / ( 1000 * 60 * 60 * 24 ) );
      if ( totalDays < 0 ) totalDays = 0;

      percentage = null;
      if ( referenceDuration && referenceDuration.totalDays > 0 ) {
        percentage = ( ( totalDays / referenceDuration.totalDays ) * 100 ).toFixed( 2 );
      }
    }

    return {
      years,
      months,
      days,
      totalDays,
      percentage: percentage ? parseFloat( percentage ) : undefined,
      formattedDuration: `${ years } वर्ष, ${ months } महिना, ${ days } दिन`,
      rawFormatted: `${ years }|${ months }|${ days }`
    };

  } catch ( err ) {
    console.error( "🚨 Error in calculateBSDate:", err.message );
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      percentage: 0,
      formattedDuration: '',
      rawFormatted: '0|0|0'
    };
  }
};



export const sumDates = ( hirasat_years, hirasat_months, hirasat_days, referenceDuration = null ) => {
  try {
    let totalYears = parseFloat( referenceDuration.years || 0 ) + parseFloat( hirasat_years || 0 );
    let totalMonths = parseFloat( referenceDuration.months || 0 ) + parseFloat( hirasat_months || 0 );
    let totalDays = parseFloat( referenceDuration.days || 0 ) + parseFloat( hirasat_days || 0 );

    // Normalize days to months
    if ( totalDays >= 30 ) {
      totalMonths += Math.floor( totalDays / 30 );
      totalDays = totalDays % 30;
    }

    // Normalize months to years
    if ( totalMonths >= 12 ) {
      totalYears += Math.floor( totalMonths / 12 );
      totalMonths = totalMonths % 12;
    }

    return {
      totalDays: totalDays,
      totalMonths: totalMonths,
      totalYears: totalYears
    };
  } catch {
    return {
      totalDays: 0,
      totalMonths: 0,
      totalYears: 0
    };
  }
  // Parse and add kaid and hirasat durations

};

export const calculateDateDetails = ( startDate, endDate, referenceDuration = null ) => {
  if ( !( startDate instanceof Date ) || !( endDate instanceof Date ) ) return null;

  let totalDays = Math.floor( ( endDate - startDate ) / ( 1000 * 60 * 60 * 24 ) );
  if ( totalDays < 0 ) totalDays = 0;

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if ( days < 0 ) {
    months--;
    const prevMonth = new Date( endDate.getFullYear(), endDate.getMonth(), 0 );
    days += prevMonth.getDate();
  }

  if ( months < 0 ) {
    years--;
    months += 12;
  }

  let percentage = null;
  if ( referenceDuration && referenceDuration.totalDays > 0 ) {
    percentage = ( ( totalDays / referenceDuration.totalDays ) * 100 ).toFixed( 2 );
  }

  return {
    years,
    months,
    days,
    totalDays,
    percentage: percentage ? parseFloat( percentage ) : undefined
  };
};
