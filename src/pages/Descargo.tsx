import LegalPage from '@/components/legal/LegalPage'

export default function Descargo() {
  return (
    <LegalPage
      title="Descargo de Responsabilidad"
      subtitle="MT-PRESUPUESTOS-SIE — Carácter referencial de la información"
    >
      <h2>1. Naturaleza Referencial</h2>
      <p>
        MT-PRESUPUESTOS-SIE es una herramienta digital de apoyo profesional. Toda
        información mostrada (precios, cantidades, cálculos, ITBIS, totales, listas
        de materiales y mano de obra, conversiones de divisa) tiene <strong>carácter
        referencial e informativo</strong> y <strong>no constituye</strong> oferta
        comercial vinculante, factura, contrato ni asesoría legal, fiscal, contable
        o de ingeniería.
      </p>

      <h2>2. Verificación Profesional Obligatoria</h2>
      <p>
        Es responsabilidad exclusiva del usuario verificar de manera independiente,
        con un profesional calificado (ingeniero eléctrico colegiado, contador u
        otro), las cantidades, precios, cálculos, conversión USD/DOP y
        especificaciones técnicas antes de utilizar cualquier resultado con fines
        contractuales, comerciales, fiscales o de ejecución.
      </p>

      <h2>3. Precios del Catálogo</h2>
      <p>
        Los precios se obtienen de proveedores comerciales referenciales (entre
        otros, IGMELEC y Grape). El Operador no garantiza vigencia, exactitud ni
        disponibilidad. Solicite siempre cotización formal directa al proveedor
        antes de cualquier orden de compra.
      </p>

      <h2>4. ITBIS y Gastos Generales</h2>
      <p>
        El cálculo automático del ITBIS (18%) y del overhead constituye una
        estimación. El usuario es responsable de confirmar la alícuota vigente con
        su contador, verificar el overhead aplicable a su empresa y cumplir las
        obligaciones tributarias derivadas. El Operador no asume responsabilidad
        por sanciones, intereses, multas o reparos fiscales.
      </p>

      <h2>5. Estructuras SIE y Seguridad Física</h2>
      <p>
        El catálogo corresponde a información técnica regulada por la
        Superintendencia de Electricidad de la República Dominicana. El diseño y
        ejecución de obras de Media Tensión entrañan <strong>riesgos para la
        seguridad física de personas y bienes</strong>. La responsabilidad técnica
        recae exclusivamente en el ingeniero responsable. El uso de la Aplicación
        no sustituye la firma, sello ni responsabilidad profesional de dicho
        ingeniero.
      </p>

      <h2>6. Servicios y APIs de Terceros</h2>
      <p>
        Supabase Inc., Google, Meta, APIs de tasa de cambio y proveedores de IA.
        El Operador no controla su disponibilidad, exactitud o continuidad y no
        asume responsabilidad por interrupciones, errores o pérdidas de datos
        derivadas.
      </p>

      <h2>7. Importación de Planos con IA</h2>
      <p>
        La extracción de estructuras y cantidades desde PDF es probabilística y
        puede contener errores u omisiones. Revise manualmente toda partida
        importada antes de incorporarla al presupuesto definitivo.
      </p>

      <h2>8. Conversión de Divisas</h2>
      <p>
        La tasa USD/DOP es referencial, proviene de una fuente externa y puede
        diferir de la efectivamente aplicada por su entidad bancaria. El Operador
        no se responsabiliza por pérdidas derivadas de estas diferencias.
      </p>

      <h2>9. PDFs Exportados</h2>
      <p>
        Los documentos PDF generados reflejan la información introducida al
        momento de la exportación y conservan el carácter referencial. La firma
        comercial, sellos profesionales y revisión legal de dichos documentos
        corresponde al usuario emisor.
      </p>

      <h2>10. Pagos por Transferencia Bancaria</h2>
      <p>
        Las suscripciones se procesan mediante transferencia bancaria manual.
        Este método no otorga protección automática del comprador. El usuario
        debe verificar cuidadosamente los datos bancarios de destino dentro de la
        Aplicación.
      </p>

      <h2>11. Disponibilidad</h2>
      <p>
        El Servicio se presta &quot;tal cual&quot; y &quot;según
        disponibilidad&quot;. No se garantiza disponibilidad ininterrumpida ni
        adecuación a un propósito particular.
      </p>

      <h2>12. Uso Bajo Propio Riesgo</h2>
      <p>
        El uso de MT-PRESUPUESTOS-SIE se realiza bajo el exclusivo riesgo del
        usuario, quien acepta validar profesionalmente todo resultado antes de
        tomar decisiones operativas, comerciales, fiscales o de ejecución.
      </p>

      <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.7 }}>
        Este Descargo forma parte integral de los Términos y Condiciones y de la
        Política de Privacidad. Debe ser revisado por un abogado en la República
        Dominicana antes de su publicación definitiva.
      </p>
    </LegalPage>
  )
}
