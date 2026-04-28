const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('Keys of pdf:', Object.keys(pdf));
if (typeof pdf === 'object') {
    console.log('pdf.default type:', typeof pdf.default);
    console.log('pdf.default keys:', Object.keys(pdf.default || {}));
}
