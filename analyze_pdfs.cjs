const fs = require('fs');
const pdf = require('pdf-parse');

const files = [
    'Estructuras_MT/FIRMA_DIGITAL_32500-Modelo.pdf',
    'Estructuras_MT/RES.LUZ DE LUNA W. (1).pdf',
    'Estructuras_MT/ANEXO-FIRMA_DIGITAL_33596.pdf'
];

async function extractText() {
    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.log(`File not found: ${file}`);
            continue;
        }
        console.log(`Extracting ${file}...`);
        const dataBuffer = fs.readFileSync(file);
        try {
            const pdfFunc = typeof pdf === 'function' ? pdf : pdf.default;
            const data = await pdfFunc(dataBuffer);
            const outName = file.replace('.pdf', '.txt').replace('Estructuras_MT/', 'Estructuras_MT/parsed_');
            fs.writeFileSync(outName, data.text);
            console.log(`Wrote ${outName}`);
        } catch (err) {
            console.error(`Error parsing ${file}:`, err);
        }
    }
}

extractText();
