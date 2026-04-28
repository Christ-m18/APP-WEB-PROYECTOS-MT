import fs from 'fs';

const files = [
    'Estructuras_MT/FIRMA_DIGITAL_32500-Modelo.pdf',
    'Estructuras_MT/RES.LUZ DE LUNA W. (1).pdf',
    'Estructuras_MT/ANEXO-FIRMA_DIGITAL_33596.pdf'
];

async function runGemini() {
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        console.log(`Processing ${file}...`);
        const base64 = fs.readFileSync(file, 'base64');
        
        try {
            const resp = await fetch('https://uxqwagpxylusgejugvdk.supabase.co/functions/v1/extract-plano', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // The user's anon key and auth token would normally be here.
                    // For local testing without a token, this will fail with 401.
                },
                body: JSON.stringify({
                    nombreArchivo: file,
                    archivoBase64: base64
                })
            });
            console.log(resp.status);
            const text = await resp.text();
            console.log(text.slice(0, 100));
        } catch (e) {
            console.error(e);
        }
    }
}
runGemini();
