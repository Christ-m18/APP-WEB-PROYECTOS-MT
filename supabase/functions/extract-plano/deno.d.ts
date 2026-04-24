// Ambient declarations para que el TypeScript del IDE no marque errores
// en este archivo Deno. La extensión oficial de Deno para VSCode (denoland.vscode-deno)
// ignora estas declaraciones cuando está activa para esta carpeta.

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2.44.0' {
  export * from '@supabase/supabase-js'
}

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}
