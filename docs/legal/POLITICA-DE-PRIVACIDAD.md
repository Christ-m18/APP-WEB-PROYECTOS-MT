# Política de Privacidad

**Aplicación:** MT-PRESUPUESTOS-SIE
**Versión del documento:** 1.0
**Fecha de última actualización:** [FECHA_DE_ULTIMA_ACTUALIZACION]
**Marco legal principal:** Ley No. 172-13 sobre Protección de Datos de Carácter Personal de la República Dominicana.

---

## 1. Identidad del Responsable del Tratamiento

El operador de MT-PRESUPUESTOS-SIE (en adelante, el "Operador") es responsable del tratamiento de los datos personales recogidos a través de la Aplicación. Para cualquier asunto relacionado con esta Política, el titular podrá comunicarse a la dirección indicada en la sección 12.

## 2. Datos Personales que Recogemos

### 2.1. Datos proporcionados directamente por el usuario

- **Registro de cuenta:** nombre, apellido, empresa o institución, número telefónico, correo electrónico y contraseña (esta última almacenada exclusivamente mediante el servicio de autenticación de Supabase Inc., en formato cifrado, sin que el Operador tenga acceso al texto plano).
- **Perfil profesional:** datos opcionales como avatar, razón social, RNC, dirección, datos de contacto comercial.
- **Datos de pago:** banco emisor, número de referencia, fecha de pago, monto y comprobante (voucher) en formato imagen o PDF.

### 2.2. Datos generados por el uso del Servicio

- Presupuestos creados, partidas, valores y configuraciones asociadas a la cuenta del usuario.
- Registros de acceso y de actividad (fecha y hora de inicio de sesión, navegador, dirección IP en términos generales) con fines de seguridad y diagnóstico.

### 2.3. Datos provenientes de proveedores OAuth

Cuando el usuario opta por iniciar sesión mediante Google o Facebook, recibimos únicamente la información estrictamente necesaria para crear el perfil: identificador único, nombre, dirección de correo electrónico y, en su caso, foto de avatar. No accedemos a publicaciones, contactos ni a otra información no requerida.

### 2.4. Datos sensibles

La Aplicación no solicita ni trata categorías especiales de datos personales (origen racial, salud, opiniones políticas, vida sexual, biometría, datos genéticos, etc.). El usuario se obliga a no introducir dicha información en los campos de la Plataforma.

## 3. Finalidades del Tratamiento

Los datos personales se tratan para las siguientes finalidades:

a. Crear y administrar la cuenta del usuario;
b. Prestar las funcionalidades del Servicio (creación y exportación de presupuestos, catálogo, suscripciones);
c. Gestionar pagos, verificación de comprobantes y emisión de facturas;
d. Atender consultas, reclamaciones y solicitudes;
e. Cumplir obligaciones legales, contables y fiscales aplicables;
f. Prevenir fraudes, abusos y vulneraciones de seguridad;
g. Realizar mejoras del Servicio mediante análisis técnico agregado;
h. Enviar comunicaciones operativas y, previo consentimiento, comunicaciones comerciales.

## 4. Base Legal del Tratamiento

El tratamiento se ampara, según el caso, en:

a. **Consentimiento expreso** otorgado por el titular al registrarse (artículo 5 de la Ley 172-13);
b. **Ejecución contractual** de los Términos y Condiciones aceptados por el usuario;
c. **Cumplimiento de obligación legal** del Operador (fiscal, contable, regulatoria);
d. **Interés legítimo** para garantizar la seguridad e integridad del Servicio.

El usuario podrá retirar su consentimiento en cualquier momento, sin que ello afecte la licitud del tratamiento previo a su retiro ni los tratamientos amparados en otras bases legales.

## 5. Derechos del Titular (Derechos ARCO y otros)

Conforme a la Ley 172-13 y, cuando aplique, al RGPD (UE) y la CCPA (California), el titular tiene los siguientes derechos:

- **Acceso:** conocer qué datos personales se tratan.
- **Rectificación:** solicitar la corrección de datos inexactos o incompletos.
- **Cancelación / Supresión:** solicitar la eliminación de sus datos cuando ya no sean necesarios o se haya retirado el consentimiento.
- **Oposición:** oponerse al tratamiento basado en interés legítimo o a finalidades de marketing directo.
- **Portabilidad:** obtener una copia de sus datos en formato estructurado y de uso común, cuando técnicamente sea posible.
- **Limitación:** solicitar la suspensión temporal del tratamiento durante una verificación o controversia.
- **No discriminación:** no recibir trato desfavorable por el ejercicio de sus derechos.

Para ejercer cualquiera de estos derechos, el titular podrá escribir a **[CORREO_DE_CONTACTO_LEGAL]**, acreditando su identidad. El Operador responderá en un plazo razonable y, en todo caso, dentro de los plazos legales aplicables.

## 6. Conservación y Eliminación de Datos

Los datos se conservan mientras la cuenta del usuario permanezca activa y, posteriormente, durante los plazos exigidos por la legislación fiscal, contable o regulatoria aplicable. Una vez transcurridos dichos plazos, los datos se eliminan o se anonimizan de forma irreversible.

La eliminación de la cuenta del usuario implica la supresión de los datos de perfil, sin perjuicio de la conservación de información mínima requerida para acreditar el cumplimiento normativo.

## 7. Transferencias Internacionales

El Operador utiliza los servicios de **Supabase Inc.**, prestador de infraestructura cuya operación principal se encuentra en los **Estados Unidos de América**. Los datos personales del usuario son almacenados y procesados en dicha jurisdicción.

Supabase declara cumplir estándares industriales de seguridad (incluyendo cifrado en tránsito y en reposo) y disponer de medidas contractuales y técnicas adecuadas. El usuario, al aceptar esta Política, otorga su consentimiento expreso a la transferencia internacional de sus datos hacia dicha infraestructura.

Otros proveedores que pueden recibir datos en jurisdicciones extranjeras incluyen:

- **Google LLC** y **Meta Platforms, Inc.** (autenticación OAuth);
- Proveedores de inteligencia artificial para procesamiento de planos;
- API de tasa de cambio (open.er-api.com u otras).

## 8. Cookies y Almacenamiento Local

### 8.1. Almacenamiento técnico necesario

La Aplicación utiliza mecanismos de almacenamiento del navegador (`localStorage`, sesión de Supabase) estrictamente necesarios para mantener la sesión activa, recordar preferencias y persistir configuraciones técnicas (por ejemplo, la configuración de empresa bajo la clave `mt_empresa_config`).

### 8.2. Cookies de terceros

Cuando el usuario utiliza un proveedor OAuth, dicho proveedor puede establecer cookies propias regidas por sus respectivas políticas.

### 8.3. Sin cookies publicitarias

El Operador no utiliza cookies ni mecanismos de seguimiento con fines publicitarios o de perfilado de comportamiento.

## 9. Seguridad de los Datos

El Operador implementa medidas técnicas y organizativas razonables para proteger la información, incluyendo:

a. Transporte cifrado mediante TLS;
b. Cifrado de credenciales en reposo a través de Supabase;
c. Políticas de seguridad a nivel de fila (Row Level Security) en todas las tablas críticas;
d. Cabeceras de seguridad HTTP (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy);
e. Control de acceso basado en roles para el panel de administración.

A pesar de lo anterior, ningún sistema es absolutamente seguro. El Operador no garantiza la inviolabilidad absoluta de los datos y promoverá la notificación oportuna en caso de incidente que pueda afectar derechos del titular.

## 10. Menores de Edad

El Servicio no está dirigido a personas menores de dieciocho (18) años. El Operador no recoge intencionalmente datos de menores. Si un padre, madre o representante legal advierte que un menor ha registrado una cuenta, podrá solicitar su eliminación inmediata escribiendo al canal de contacto.

## 11. Cambios a esta Política

Esta Política podrá actualizarse para reflejar cambios legales, técnicos u operativos. La fecha de "última actualización" indicará la versión vigente. Los cambios sustanciales se notificarán al usuario mediante la Aplicación o por correo electrónico.

## 12. Contacto y Reclamaciones

Para cualquier consulta sobre el tratamiento de datos personales o para ejercer derechos, el titular podrá escribir a:

- Correo electrónico: **[CORREO_DE_CONTACTO_LEGAL]**
- Dirección postal: **[DIRECCION_POSTAL_OPERADOR]**

El titular tiene además el derecho de presentar reclamaciones ante la autoridad competente en materia de protección de datos en la República Dominicana.

---

**Aviso.** Esta Política de Privacidad ha sido generada como base profesional y debe ser revisada por un abogado especializado en protección de datos antes de su publicación final.
