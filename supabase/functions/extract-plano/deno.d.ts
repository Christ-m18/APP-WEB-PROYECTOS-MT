// Ambient declarations para silenciar el TS del IDE cuando no está la extensión Deno.
// La extensión denoland.vscode-deno (recomendada via .vscode/settings.json) ignora estas declaraciones.

declare module 'jsr:@supabase/functions-js/edge-runtime.d.ts' {}

declare module 'jsr:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}
