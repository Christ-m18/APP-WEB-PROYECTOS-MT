# Aviso Legal para PDFs Exportados

**Aplicación:** MT-PRESUPUESTOS-SIE
**Versión del documento:** 1.0
**Fecha de última actualización:** [FECHA_DE_ULTIMA_ACTUALIZACION]

---

Este documento define el texto legal que debe incluirse en todos los PDFs exportados por la Aplicación (presupuestos comerciales, listas de materiales, mano de obra, completos y facturas).

## 1. Disclaimer Corto (pie de página de cada página)

> Documento generado electrónicamente con carácter referencial. Verifique con un profesional calificado antes de su uso contractual o de compra. El operador de MT-PRESUPUESTOS-SIE no se hace responsable por errores u omisiones.

## 2. Aviso Legal Extendido (sección final del PDF)

### AVISO LEGAL

Este documento ha sido generado electrónicamente por **MT-PRESUPUESTOS-SIE**, herramienta digital de apoyo profesional para la elaboración de presupuestos de proyectos eléctricos de Media Tensión conforme a las regulaciones de la Superintendencia de Electricidad (SIE) de la República Dominicana.

**1. Carácter referencial.** Los precios, cantidades, cálculos de subtotal, gastos generales, ITBIS (18%) y total general aquí mostrados son **estimaciones** y **no constituyen** oferta vinculante, factura, contrato ni asesoría profesional. Los precios del catálogo se obtienen de proveedores comerciales (entre otros, IGMELEC y Grape) y pueden estar desactualizados.

**2. Verificación profesional obligatoria.** Es responsabilidad exclusiva del usuario validar todos los valores con un ingeniero eléctrico colegiado, contador o profesional competente antes de utilizar este documento para contratar, comprar materiales, ejecutar obra o presentar declaraciones tributarias.

**3. Seguridad física.** Los presupuestos contemplan infraestructura eléctrica de Media Tensión, cuya incorrecta especificación o ejecución puede entrañar **riesgos para la seguridad física de personas y bienes**. La responsabilidad técnica del diseño y ejecución recae exclusivamente en el ingeniero responsable del proyecto.

**4. Limitación de responsabilidad.** El operador de MT-PRESUPUESTOS-SIE no se hace responsable por errores, omisiones, decisiones de inversión, contratación o ejecución basadas en este documento, ni por las consecuencias fiscales derivadas de los cálculos mostrados.

**5. Vigencia.** Este documento refleja la información introducida al momento de la generación y no se actualiza automáticamente. Solicite siempre cotización formal directa al proveedor antes de cualquier orden de compra.

**6. Contacto.** Para verificar la información de este presupuesto, comunicarse con el emisor cuyos datos figuran en el encabezado. Para consultas sobre la herramienta: **[CORREO_DE_CONTACTO_LEGAL]**.

---

## 3. Texto Sintetizado para Marca de Agua (opcional, sutil)

> Documento referencial. Verifique con un profesional antes de su uso contractual.

## 4. Implementación Sugerida en `exportPDF.ts` / `facturaPDF.ts`

a. **Pie de página:** una línea adicional con el texto del apartado 1, en tipografía pequeña (6.5pt), color gris medio, sobre la franja de copyright existente.
b. **Última página:** un bloque dedicado titulado "AVISO LEGAL" con el texto del apartado 2, antes del pie de página de la última hoja del documento.
c. La generación debe respetar márgenes y saltos de página automáticos (`doc.addPage()` si no hay espacio suficiente).
