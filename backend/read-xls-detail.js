const XLSX = require('xlsx');

// XLS dosyasını oku
const workbook = XLSX.readFile('C:\\puantaj (4).xls');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// JSON'a çevir
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Satır 7, 8, 9'u detaylı göster (ilk 60 kolon)
console.log('\n=== SATIR 7 (İlk 60 kolon) ===');
const row7 = data[6] || [];
for (let i = 0; i < 60; i++) {
  const colName = XLSX.utils.encode_col(i);
  console.log(`${colName}7: "${row7[i] || ''}"`);
}

console.log('\n=== SATIR 8 (İlk 60 kolon) ===');
const row8 = data[7] || [];
for (let i = 0; i < 60; i++) {
  const colName = XLSX.utils.encode_col(i);
  console.log(`${colName}8: "${row8[i] || ''}"`);
}

console.log('\n=== SATIR 9 (İlk 60 kolon) ===');
const row9 = data[8] || [];
for (let i = 0; i < 60; i++) {
  const colName = XLSX.utils.encode_col(i);
  console.log(`${colName}9: "${row9[i] || ''}"`);
}

process.exit(0);
