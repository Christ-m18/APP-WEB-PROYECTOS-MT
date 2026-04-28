import os
import PyPDF2

files = [
    'Estructuras_MT/FIRMA_DIGITAL_32500-Modelo.pdf',
    'Estructuras_MT/RES.LUZ DE LUNA W. (1).pdf',
    'Estructuras_MT/ANEXO-FIRMA_DIGITAL_33596.pdf',
    'Estructuras_MT/VOLUMEN-II-Estructuras-de-Diseno-y-Construccion-NRD-AE-II.pdf'
]

for file in files:
    try:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + '\n'
        out = file.replace('.pdf', '.txt').replace('Estructuras_MT/', 'Estructuras_MT/parsed_')
        with open(out, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Extracted {out}")
    except Exception as e:
        print(f"Error extracting {file}: {e}")
