const moment = require('moment');

function calculateAnnualLeave(employee, companyPolicy) {
  const startDate = moment(employee.hireDate || employee.startDate);
  const today = moment();
  const seniorityYears = today.diff(startDate, 'years');
  const age = employee.birthDate ? moment().diff(moment(employee.birthDate), 'years') : null;

  // Zorunlu yasal taban kıdem kuralları
  let leaveDays = 0;
  if (seniorityYears < 5) leaveDays = 14;
  else if (seniorityYears < 15) leaveDays = 20;
  else leaveDays = 26;

  // Yaşa bağlı zorunlu asgari 20 gün kuralı
  if (age <= 18 || age >= 50) {
    if (leaveDays < 20) leaveDays = 20;
  }

  // Pazar dahil edilmez (sadece bilgi, gün hesabı izin kullanım aşamasında yapılacak)
  // NOT: Bu motor sadece hakediş miktarını belirler

  return {
    seniorityYears,
    age,
    leaveDays,
    policy: companyPolicy
  };
}

module.exports = { calculateAnnualLeave };

