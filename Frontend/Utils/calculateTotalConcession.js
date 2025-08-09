// utils/concessionUtils.js
export const getTotalMonths = (duration) => {
  const { years = 0, months = 0, days = 0 } = duration;
  return Number(years) * 12 + Number(months) + Number(days) / 30;
};

export const convertDaysToYMD = (totalDays) => {
  const years = Math.floor(totalDays / 365);
  totalDays %= 365;
  const months = Math.floor(totalDays / 30);
  const days = Math.round(totalDays % 30);

  return {
    years,
    months,
    days,
    formatted: `${years} | ${months} | ${days} `,
  };
};

export const calculateTotalConcession = (duration, ranks, selectedrankId) => {
  if (!duration || !ranks || !selectedrankId) return null;

  // console.log('duration:', selectedrankId);


  const rankObj = ranks.find((rank) => rank.id === selectedrankId);
  if (!rankObj) return null;

  const concessionPerMonth = rankObj.concession_per_month;
  const totalMonths = getTotalMonths(duration);
  const totalConcessionDays = Math.round(totalMonths * concessionPerMonth);

  const converted = convertDaysToYMD(totalConcessionDays);
  console.log(converted)
  return {
    totalConcessionDays,
    ...converted,
  };
};
