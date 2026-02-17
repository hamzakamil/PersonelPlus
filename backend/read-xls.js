const XLSX = require('xlsx');

// XLS dosyasını oku
const workbook = XLSX.readFile('C:\\puantaj (4).xls');

// İlk sheet'i al
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// JSON'a çevir (header yok)
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

console.log('Sheet adı:', sheetName);
console.log('Toplam satır:', data.length);

// İlk 20 satırı göster (compact)
console.log('\n=== İlk 20 satır (ilk 50 kolon) ===');
data.slice(0, 20).forEach((row, idx) => {
  const firstCols = row.slice(0, 50);
  console.log(`\nSatır ${idx + 1} (${row.length} kolon):`);
  console.log(firstCols.filter(c => c !== '').join(' | '));
});

// Çıkış
process.exit(0);
