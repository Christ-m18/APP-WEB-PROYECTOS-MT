# PROMPT PARA CLAUDE CODE — TÉRMINOS LEGALES Y DISCLAIMERS

Copia y pega el siguiente bloque como instrucción inicial para Claude Code (o el agente de tu preferencia):

---

Eres un agente legal-tech. Tu tarea es investigar, generar e implementar todos los documentos legales, políticas de privacidad, términos de servicio, descargos de responsabilidad y avisos necesarios para proteger legalmente a esta aplicación web y a su operador ante la ley de República Dominicana y estándares internacionales.

## CONTEXTO DE LA APLICACIÓN

Esta es una aplicación web llamada **MT-PRESUPUESTOS-SIE** para crear y gestionar **presupuestos de proyectos eléctricos de Media Tensión (MT)** según las regulaciones de la **Superintendencia de Electricidad (SIE) de República Dominicana**.

### Stack
React 18 + TypeScript 5.9 + Vite 5, Supabase (PostgreSQL, Auth, Storage), Tailwind CSS, TanStack Query, React Hook Form + Zod, jsPDF, Framer Motion, Recharts.

### Qué hace la app
- Registro de usuarios (email/password + Google/Facebook OAuth) con datos personales: nombre, email, teléfono, empresa
- Dashboard con KPIs y gráficos de actividad
- Creación/edición de presupuestos con partidas (estructuras eléctricas, cantidades, precios)
- Catálogo técnico de ~417 estructuras SIE con ~4,055 materiales asociados
- Cálculos financieros: subtotal, overhead %, ITBIS (18%), total general en RD$
- Exportación de PDFs (4 tipos: Comercial, Logística/Materiales, Mano de Obra, Completo)
- Suscripciones con planes Gratis (3 proyectos) y Pro (US$5/mes, ilimitado)
- **Pago manual**: transferencia bancaria a cuentas dominicanas (Banco Reservas, BHD, Santa Cruz) + subida de voucher
- Admin panel para revisar pagos, gestionar usuarios, ver métricas globales
- Importación de planos PDF con extracción AI via Supabase Edge Function
- Conversión USD→DOP via API externa open.er-api.com
- Almacenamiento de avatares y comprobantes en Supabase Storage
- CSP en index.html, RLS en todas las tablas de BD

### Datos que maneja
- **Personales**: nombre, email, teléfono, empresa, avatar, contraseña (auth delegado a Supabase)
- **Financieros**: presupuestos con valores en RD$, comprobantes de pago (vouchers), referencias bancarias, cuentas bancarias hardcodeadas en código
- **Críticos**: precios de catálogo de materiales (IGMELEC, Grape), cálculos de ITBIS con implicaciones fiscales reales, overhead configurable
- **Técnicos**: estructuras eléctricas SIE que pueden impactar seguridad física de proyectos reales

### Lo que NO existe actualmente (brecha legal total)
- No hay Términos y Condiciones
- No hay Política de Privacidad
- No hay Descargo de Responsabilidad / Disclaimer
- No hay Aviso de Cookies
- No hay consentimiento informado en registro
- No hay avisos legales en los PDFs exportados
- No hay política de suscripciones, cancelación o reembolsos
- No hay licencia de uso del catálogo SIE

### Riesgos legales identificados (usa esto como checklist)
1. Ausencia total de términos legales en todo el flujo
2. Datos personales capturados sin consentimiento explícito ni referencia a privacidad
3. Presupuestos con valor legal/financiero sin disclaimer de responsabilidad
4. Cálculos de ITBIS con implicaciones fiscales reales sin advertencia
5. Precios de catálogo referenciales sin garantía de vigencia
6. Pagos manuales por transferencia bancaria sin protección al comprador
7. Cuentas bancarias hardcodeadas en el código fuente
8. PDFs sin marca de agua legal ni limitación de responsabilidad
9. OAuth sin informar qué datos se recogen del proveedor
10. Sin política de cancelación, reembolso o periodo de gracia
11. Uso de localStorage sin informar al usuario
12. Presupuestos de infraestructura eléctrica (MT) — errores pueden afectar seguridad física y costos reales

## INSTRUCCIONES

### Fase 1: Investigación (usa todas las herramientas disponibles)

1. **Firecrawl Search** — Busca en internet:
   - Plantillas de términos y condiciones para SaaS en República Dominicana
   - Ley 172-13 de Protección de Datos Personales de República Dominicana
   - Código Civil Dominicano artículos sobre responsabilidad contractual
   - Regulaciones SIE sobre responsabilidad en presupuestos eléctricos
   - GDPR y CCPA (por usuarios internacionales)
   - Políticas de privacidad para apps que usan Supabase (datos en USA)
   - Ley de Comercio Electrónico de RD (Ley 126-02)
   - Buenas prácticas para disclaimers en calculadoras financieras online
   - Políticas de cancelación y reembolso para SaaS con pago manual
   - Requisitos de consentimiento informado para registro de usuarios

2. **Firecrawl Scrape** — Extrae ejemplos reales de:
   - Términos de servicio de apps similares (presupuestos, construcción, ingeniería)
   - Políticas de privacidad de apps dominicanas
   - Disclaimers de calculadoras financieras online
   - Avisos legales en PDFs de presupuestos profesionales

3. **WebFetch** — Si firecrawl no está disponible, usa webfetch para leer páginas relevantes sobre legislación dominicana y plantillas legales.

### Fase 2: Generación de Documentos

Crea los siguientes archivos en la raíz del proyecto:

1. **`docs/legal/TERMINOS-Y-CONDICIONES.md`** — Términos y Condiciones de Uso completo (~3,000-5,000 palabras) que incluya:
   - Aceptación de términos
   - Descripción del servicio
   - Registro y cuentas de usuario
   - Planes, suscripciones, precios y pagos (con políticas de cancelación y reembolso)
   - Responsabilidad del usuario
   - Limitación de responsabilidad (MUY importante — deslindar responsabilidad por errores en cálculos, precios desactualizados, decisiones basadas en los presupuestos)
   - Propiedad intelectual (catálogo SIE, código, contenido)
   - Privacidad y datos personales
   - Enlaces externos (API tasa de cambio)
   - Modificaciones del servicio
   - Legislación aplicable y jurisdicción (República Dominicana)
   - Contacto

2. **`docs/legal/POLITICA-DE-PRIVACIDAD.md`** — Política de Privacidad completa que cubra:
   - Datos recogidos (registro, perfil, uso, pago)
   - Finalidad del tratamiento
   - Base legal (consentimiento, ejecución contractual)
   - Derechos ARCO (acceso, rectificación, cancelación, oposición)
   - Retención y eliminación de datos
   - Transferencias internacionales (Supabase USA — explicar)
   - Cookies y almacenamiento local (localStorage)
   - Seguridad de datos
   - Cambios a la política
   - Ley aplicable (Ley 172-13)

3. **`docs/legal/DESCARGO-DE-RESPONSABILIDAD.md`** — Descargo de Responsabilidad que cubra:
   - Naturaleza referencial de cálculos y precios
   - Obligación de verificación profesional independiente
   - Catálogo de precios sin garantía de vigencia
   - Cálculos de ITBIS y overhead como estimaciones
   - No responsabilidad por decisiones basadas en la herramienta
   - Precios de materiales (IGMELEC, Grape) como referencia
   - API de terceros sin garantía de disponibilidad
   - Uso bajo propio riesgo

4. **`docs/legal/POLITICA-DE-SUSCRIPCIONES.md`** — Política específica de suscripciones y pagos:
   - Precios en USD convertidos a DOP
   - Método de pago (solo transferencia bancaria)
   - Proceso de aprobación manual
   - Renovación automática (o no)
   - Cancelación y reembolsos
   - Periodo de gracia
   - Suspensión del servicio
   - Datos bancarios y seguridad

5. **`docs/legal/AVISO-LEGAL-PDFS.md`** — Texto legal para incluir en PDFs (marca de agua/copyright):
   - Texto de disclaimer para incluir en cada PDF exportado
   - A quién contactar para verificar el presupuesto

### Fase 3: Implementación en Código

1. **Modifica la página de registro** (`src/pages/Registro.tsx` o similar) para:
   - Agregar checkbox obligatorio de "Acepto los Términos y Condiciones y la Política de Privacidad"
   - Links a los documentos legales generados
   - Validación Zod: el checkbox debe ser `true` para enviar

2. **Modifica la página de login** para agregar link a términos si no existe.

3. **Modifica el pie de página** en el Layout o en el Login/Registro para incluir links a:
   - Términos y Condiciones
   - Política de Privacidad
   - Descargo de Responsabilidad

4. **Modifica la exportación de PDF** (`src/utils/exportPDF.ts` y `facturaPDF.ts`) para:
   - Agregar texto de disclaimer en cada página (como nota al pie)
   - Agregar una página o sección de "Aviso Legal" en cada PDF exportado
   - El disclaimer debe decir algo como: "Este documento es generado electrónicamente y tiene carácter referencial. Los precios, cálculos e ITBIS mostrados son estimaciones. El contratista debe verificar todos los valores con un profesional calificado antes de usar este presupuesto para fines contractuales o de compra. El operador de MT-PRESUPUESTOS-SIE no se hace responsable por errores, omisiones o decisiones basadas en este documento."

5. **Crea un componente `LegalFooter`** en `src/components/legal/LegalFooter.tsx` con los links legales.

6. **Agrega una página de `Terminos`** en `/terminos` (ruta pública) que renderice los términos desde el markdown (o como contenido estático).

7. **Agrega una página de `Privacidad`** en `/privacidad` (ruta pública) similar.

8. **Actualiza el `App.tsx`** o el router para incluir las rutas públicas de términos y privacidad.

9. **Modifica la página de registro** para guardar en la base de datos (una nueva columna o tabla `consentimientos`) la fecha y versión de términos aceptados (opcional pero recomendado).

10. **Agrega un aviso de cookies/localStorage** si usas localStorage para `mt_empresa_config`.

### Fase 4: Verificación

1. Ejecuta `npm run build` — no debe haber errores de TypeScript
2. Ejecuta `npm run lint` — sin errores
3. Ejecuta `npm run test:run` — pruebas existentes deben seguir pasando
4. Lee los archivos generados para verificar coherencia

## REGLAS IMPORTANTES

- **NO inventes leyes o regulaciones**. Si no encuentras información específica sobre República Dominicana, usa principios generales de derecho informático y adapta.
- **Todos los textos legales deben redactarse en español (España/Latinoamérica)** con tono formal pero claro.
- **Las fechas en los documentos deben usar tokens o placeholders** como `[FECHA_DE_ULTIMA_ACTUALIZACION]` o la fecha actual.
- **No sustituyas el consejo de un abogado real**. Los documentos generados son una base que debe ser revisada por un profesional legal en RD.
- **Los cambios de código deben seguir las convenciones del proyecto**: import paths con `@/`, types desde `@/types`, validaciones Zod en `@/lib/validations.ts`.
- **No borres funcionalidad existente** — solo añade.
- **Usa los archivos de skill si están disponibles**: `skill accessibility` para asegurar que los avisos legales sean accesibles, `skill react-hook-form` para el checkbox de términos.

## ENTREGABLES

Al finalizar, DEBES confirmar que completaste:

1. [ ] docs/legal/TERMINOS-Y-CONDICIONES.md
2. [ ] docs/legal/POLITICA-DE-PRIVACIDAD.md
3. [ ] docs/legal/DESCARGO-DE-RESPONSABILIDAD.md
4. [ ] docs/legal/POLITICA-DE-SUSCRIPCIONES.md
5. [ ] docs/legal/AVISO-LEGAL-PDFS.md
6. [ ] Checkbox de aceptación en registro con validación
7. [ ] Links legales en login
8. [ ] LegalFooter component
9. [ ] Rutas /terminos y /privacidad
10. [ ] Disclaimer en exportación de PDFs
11. [ ] npm run build / lint / test pasando
