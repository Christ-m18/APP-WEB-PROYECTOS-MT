import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import dotenv from 'dotenv';

// Cargar variables de entorno
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helpers para procesar CSV
const readCSV = (fileName) => {
  const filePath = path.join(__dirname, fileName);
  const csvText = fs.readFileSync(filePath, 'utf8');
  
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true, // Convierte números automáticamente
    transform: (value) => {
      if (value === '' || value === 'NULL' || value === null) return null;
      return value;
    }
  });
  
  return results.data;
};

// Insertar en batches
const insertInBatches = async (tableName, data, batchSize = 500) => {
  console.log(`\nInsertando ${data.length} filas en la tabla '${tableName}'...`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    console.log(`  -> Insertando batch de ${batch.length} filas (progreso: ${i + batch.length}/${data.length})`);
    
    // Eliminamos cualquier campo id o campo autogenerado que los CSV puedan traer pre-asignado,
    // (A menos que los CSV no traigan ID o sqlite ID. Los dejaremos pasar para este caso
    // y asumimos que se alinean al esquema, pero es mejor limpiar subtotal de analisis_costo_estructura).
    if (tableName === 'analisis_costo_estructura') {
        batch.forEach(row => delete row.subtotal);
    }
    
    // Para materiales, no debemos cambiar el 'codigo'.
    const { error } = await supabase.from(tableName).insert(batch);
    if (error) {
      console.error(`\x1b[31mError insertando batch en ${tableName}:\x1b[0m`, error.message);
      console.error("Fila ofendiendo / Detalles:", error.details || error);
      console.error("Primer registro del batch fallido:", batch[0]);
      process.exit(1); 
    }
  }
  console.log(`\x1b[32m✔ Tabla '${tableName}' cargada con éxito.\x1b[0m`);
};

// Ejecutar migración por pasos ordenados
const runMigration = async () => {
  console.log("==========================================");
  console.log("INICIANDO CARGA DE DATOS A SUPABASE");
  console.log("Proyecto:", supabaseUrl);
  console.log("==========================================\n");

  try {
    // IMPORTANTE: Asegúrate de haber ejecutado el archivo 'supabase_schema_migration.sql' en Supabase SQL Editor primero.

    // 1° materiales (PK: codigo)
    const materiales = readCSV('materiales.csv');
    await insertInBatches('materiales', materiales, 500);

    // 2° estructuras_catalogo
    const catalogo = readCSV('estructuras_catalogo.csv');
    // Para no interferir con las secuencias seriales si el CSV trae 'id'
    catalogo.forEach(r => delete r.id);
    await insertInBatches('estructuras_catalogo', catalogo, 500);

    // 3° estructuras_mano_obra
    const manoObra = readCSV('estructuras_mano_obra.csv');
    manoObra.forEach(r => delete r.id);
    await insertInBatches('estructuras_mano_obra', manoObra, 500);

    // 4° totales_materiales (FK a materiales.codigo)
    const totales = readCSV('totales_materiales.csv');
    totales.forEach(r => delete r.id);
    await insertInBatches('totales_materiales', totales, 500);

    // 5° uucc_material_estructura (FK a materiales.codigo, 4,055 filas)
    const uucc = readCSV('uucc_material_estructura.csv');
    uucc.forEach(r => delete r.id);
    await insertInBatches('uucc_material_estructura', uucc, 500);

    // 6° analisis_costo_estructura (FK a materiales.codigo)
    const analisis = readCSV('analisis_costo_estructura.csv');
    analisis.forEach(r => delete r.id);
    await insertInBatches('analisis_costo_estructura', analisis, 500);

    console.log("\n==========================================");
    console.log("\x1b[32m✔ CARGA COMPLETADA EXITOSAMENTE\x1b[0m");
    console.log("==========================================");
    
    console.log("\nRevisa las verificaciones del PASO 6 ejecutando estos querys en SQL Editor:");
    console.log("- SELECT COUNT(*) FROM uucc_material_estructura u LEFT JOIN materiales m ON u.codigo_material = m.codigo WHERE m.codigo IS NULL");
    
  } catch (err) {
    console.error("Excepción inesperada:", err);
  }
};

runMigration();
