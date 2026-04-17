import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { error: e1 } = await supabase.from('proyectos').select('id').limit(1);
  console.log('Proyectos exists:', !e1 || e1.code !== '42P01', e1?.message);

  const { error: e2 } = await supabase.from('partidas').select('id').limit(1);
  console.log('Partidas exists:', !e2 || e2.code !== '42P01', e2?.message);
}

check();
