import LegalPage from '@/components/legal/LegalPage'

export default function Privacidad() {
  return (
    <LegalPage
      title="Política de Privacidad"
      subtitle="MT-PRESUPUESTOS-SIE — Conforme a la Ley 172-13 de la República Dominicana"
    >
      <h2>1. Responsable del Tratamiento</h2>
      <p>
        El operador de MT-PRESUPUESTOS-SIE es responsable del tratamiento de los
        datos personales recogidos a través de la Aplicación. Para cualquier
        asunto, el titular podrá comunicarse a la dirección indicada en la sección
        12.
      </p>

      <h2>2. Datos que Recogemos</h2>
      <p>
        <strong>Registro:</strong> nombre, apellido, empresa, número telefónico,
        correo electrónico y contraseña (cifrada por Supabase Inc.; no accesible
        en texto plano para el Operador).
        <br />
        <strong>Perfil profesional:</strong> avatar, razón social, RNC, dirección y
        datos de contacto comercial (opcionales).
        <br />
        <strong>Pagos:</strong> banco emisor, referencia, fecha, monto y
        comprobante.
        <br />
        <strong>Uso:</strong> presupuestos creados, registros de acceso, datos
        técnicos de seguridad.
        <br />
        <strong>OAuth:</strong> al iniciar sesión con Google o Facebook recibimos
        identificador, nombre, correo y avatar, sin acceso a publicaciones,
        contactos u otra información.
      </p>

      <h2>3. Finalidades</h2>
      <p>
        Crear y administrar la cuenta, prestar el Servicio, gestionar pagos y
        facturación, atender consultas, cumplir obligaciones legales, prevenir
        fraudes, mejorar el Servicio mediante análisis técnico agregado y enviar
        comunicaciones operativas o, previo consentimiento, comerciales.
      </p>

      <h2>4. Base Legal</h2>
      <p>
        Consentimiento expreso (Ley 172-13, artículo 5), ejecución contractual,
        cumplimiento legal e interés legítimo para la seguridad. El consentimiento
        puede retirarse en cualquier momento sin afectar la licitud del tratamiento
        previo.
      </p>

      <h2>5. Derechos del Titular (ARCO y otros)</h2>
      <p>
        Derechos de acceso, rectificación, cancelación, oposición, portabilidad,
        limitación y no discriminación. Para ejercerlos, escribir a{' '}
        <strong>[CORREO_DE_CONTACTO_LEGAL]</strong> acreditando identidad. La
        respuesta se emitirá dentro de los plazos legales aplicables.
      </p>

      <h2>6. Conservación y Eliminación</h2>
      <p>
        Los datos se conservan mientras la cuenta esté activa y durante los plazos
        exigidos por la legislación fiscal o regulatoria. La eliminación de la
        cuenta implica la supresión de los datos de perfil, sin perjuicio de la
        conservación mínima requerida para cumplimiento normativo.
      </p>

      <h2>7. Transferencias Internacionales</h2>
      <p>
        El Operador utiliza Supabase Inc., con infraestructura principal en los
        Estados Unidos de América. Sus datos son almacenados y procesados en
        dicha jurisdicción bajo medidas contractuales y técnicas adecuadas. Al
        aceptar esta Política, otorga su consentimiento expreso a esta
        transferencia. Otros terceros (Google, Meta, APIs de tasa de cambio,
        proveedores de IA) pueden recibir datos en jurisdicciones extranjeras.
      </p>

      <h2>8. Cookies y Almacenamiento Local</h2>
      <p>
        La Aplicación utiliza <code>localStorage</code> y mecanismos de sesión de
        Supabase estrictamente necesarios (incluida la clave{' '}
        <code>mt_empresa_config</code> para guardar la configuración de empresa).
        No utilizamos cookies de publicidad ni mecanismos de perfilado. Los
        proveedores OAuth pueden establecer cookies propias.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        TLS en tránsito, cifrado de credenciales en reposo (Supabase), Row Level
        Security en tablas críticas, cabeceras HTTP de seguridad
        (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy) y
        control de acceso por rol. Ningún sistema es absolutamente seguro; el
        Operador notificará oportunamente cualquier incidente que pueda afectar
        derechos del titular.
      </p>

      <h2>10. Menores de Edad</h2>
      <p>
        El Servicio no está dirigido a menores de dieciocho (18) años. Si advierte
        que un menor ha registrado una cuenta, contacte al canal indicado para
        su eliminación inmediata.
      </p>

      <h2>11. Cambios a la Política</h2>
      <p>
        Esta Política puede actualizarse. La fecha de &quot;última
        actualización&quot; indicará la versión vigente. Los cambios sustanciales
        se notificarán mediante la Aplicación o por correo electrónico.
      </p>

      <h2>12. Contacto y Reclamaciones</h2>
      <p>
        Correo electrónico: <strong>[CORREO_DE_CONTACTO_LEGAL]</strong>. El
        titular tiene derecho a presentar reclamaciones ante la autoridad
        competente en materia de protección de datos en la República Dominicana.
      </p>

      <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.7 }}>
        Esta Política es una base profesional generada como referencia y debe
        revisarse con un abogado especializado en protección de datos antes de
        su publicación definitiva.
      </p>
    </LegalPage>
  )
}
