import NepaliDate from 'nepali-datetime';

export async function calculateAge(birthDateBS) {
    if (!birthDateBS) return null;

    // Convert BS to AD (JS Date object)
    const nepaliDate = new NepaliDate(birthDateBS);
    const birthDateAD = nepaliDate.getDateObject();

    const today = new Date();

    // Basic age calculation
    let age = today.getFullYear() - birthDateAD.getFullYear();

    // Check if birthday has passed this year
    const hasHadBirthday =
        today.getMonth() > birthDateAD.getMonth() ||
        (today.getMonth() === birthDateAD.getMonth() && today.getDate() >= birthDateAD.getDate());

    if (!hasHadBirthday) {
        age--;
    }

    return age;
}

export const inCalculateAge = (birthDateBS) => {
  if (!birthDateBS) return null;

    // Convert BS to AD (JS Date object)
    const nepaliDate = new NepaliDate(birthDateBS);
    const birthDateAD = nepaliDate.getDateObject();

    const today = new Date();

    // Basic age calculation
    let age = today.getFullYear() - birthDateAD.getFullYear();

    // Check if birthday has passed this year
    const hasHadBirthday =
        today.getMonth() > birthDateAD.getMonth() ||
        (today.getMonth() === birthDateAD.getMonth() && today.getDate() >= birthDateAD.getDate());

    if (!hasHadBirthday) {
        age--;
    }

    return age;
};

