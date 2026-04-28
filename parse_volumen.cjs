const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'Estructuras_MT/VOLUMEN-II-Estructuras-de-Diseno-y-Construccion-NRD-AE-II.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

(typeof pdf === 'function' ? pdf : pdf.default)(dataBuffer).then(function(data) {
    const text = data.text;
    
    // We are looking for structure codes. Typical SIE codes:
    // PREFIX-NUMBER[SUFFIX]
    // Regex to catch [LETTERS]-[NUMBERS] or [LETTERS]-[NUMBERS]-[NUMBERS] or [LETTERS][NUMBERS]-[LETTERS]
    const regex = /\b([A-Z]{2,4}-\d{2,3}(?:-[A-Z0-9]{1,3})?|[A-Z]{1,2}\d-(?:MT|BT|S1|D1))\b/g;
    
    const matches = text.match(regex) || [];
    
    // Also catch space formats like "HA 100B"
    const regexSpace = /\b([A-Z]{2,4})\s+(\d{2,3}[A-Z]?)\b/g;
    let spaceMatch;
    while ((spaceMatch = regexSpace.exec(text)) !== null) {
        if (['MT', 'BT', 'PR', 'PT', 'TR', 'TRA', 'HA', 'AP', 'LB', 'PO', 'HAV', 'HPV', 'MCH', 'MAD', 'PC', 'PH', 'SF', 'SP', 'CV', 'CE', 'SO', 'CDA', 'CSA'].includes(spaceMatch[1])) {
            matches.push(`${spaceMatch[1]}-${spaceMatch[2]}`);
        }
    }
    
    // Extract unique prefixes to see all families
    const families = new Set();
    const exactCodes = new Set();
    
    matches.forEach(m => {
        exactCodes.add(m);
        const parts = m.split('-');
        if (parts.length > 0) {
            families.add(parts[0]);
        }
    });

    console.log(`Found ${exactCodes.size} unique structure codes across ${families.size} families.`);
    console.log("\nFAMILIES FOUND:");
    console.log(Array.from(families).sort().join(', '));
    
    console.log("\nSAMPLE CODES PER FAMILY:");
    const familyMap = {};
    exactCodes.forEach(code => {
        const prefix = code.split('-')[0];
        if (!familyMap[prefix]) familyMap[prefix] = [];
        if (familyMap[prefix].length < 20) {
            familyMap[prefix].push(code);
        }
    });
    
    Object.keys(familyMap).sort().forEach(prefix => {
        console.log(`${prefix}: ${familyMap[prefix].join(', ')}`);
    });

}).catch(err => console.error(err));
