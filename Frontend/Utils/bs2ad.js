import NepaliDate from 'nepali-datetime';
export async function bs2ad(date) {
    const bsdob = new NepaliDate(date)
    // console.log(bsdob)
    const addob = bsdob.formatEnglishDate('YYYY-MM-DD')
    // console.log(date)
    // console.log(addob)
    return addob;
}