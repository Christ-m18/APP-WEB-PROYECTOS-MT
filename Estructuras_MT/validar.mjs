import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const verificar = async () => {
    try {
        console.log("=== INICIANDO VALIDACIÓN (PASO 6) ===\n");
        
        // 1. Conteo de tablas
        const tablas = ['materiales', 'estructuras_catalogo', 'estructuras_mano_obra', 'uucc_material_estructura', 'totales_materiales', 'analisis_costo_estructura'];
        const conteos = {};
        for(let tabla of tablas) {
            const { count, error } = await supabase.from(tabla).select('*', { count: 'exact', head: true });
            conteos[tabla] = count;
        }
        console.table(conteos);

        // 2. FK check - Como no se puede hacer left join crudo via SDK anon 쉽게, bajaremos los códigos de uucc sin material
        const { data: fk_check } = await supabase.from('uucc_material_estructura')
            .select('codigo_material, materiales!inner(codigo)'); // Inner join filtrará estrictamente
        // Si quisieramos encontrar los que NO están, pero como foreign key on DB level enforce it, it is guaranteed to be 0 si cargó bien.
        // Simulando el test:
        const { count: uucc_total } = await supabase.from('uucc_material_estructura').select('*', { count: 'exact', head: true });
        console.log(`\nValidación FK materiales-uucc: ${uucc_total - fk_check.length} huérfanos (Esperado 0)`);

        // 3. Vista 1: top 5 más caras
        console.log("\nTop 5 estructuras más caras:");
        const { data: top5 } = await supabase.from('v_costo_uucc_por_estructura')
            .select('*')
            .order('costo_materiales_rd', { ascending: false })
            .limit(5);
        console.table(top5);

        // 4. Vista 2: Costo total proyecto - No podemos aplicar el select crudo completo sin RPC,
        // pero podemos sumar desde el cliente o usar la vista v_materiales_uso_total !!
        console.log("\nCosto Total Estimado del Proyecto:");
        const { data: total_uso } = await supabase.from('v_materiales_uso_total').select('costo_total_proyectado');
        const costo_total = total_uso.reduce((acu, item) => acu + Number(item.costo_total_proyectado || 0), 0);
        
        console.log(`Total RD$: ${costo_total.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

    } catch (e) {
        console.error("Error validando", e);
    }
};

verificar();
