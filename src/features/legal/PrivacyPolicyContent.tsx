import Link from "next/link";
import { GOOGLE_API_USER_DATA_POLICY_URL, legalConfig } from "@/src/lib/legalConfig";

export function PrivacyPolicyContent() {
  const privacyContact = legalConfig.privacyEmail
    ? <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a>
    : <Link href="/pqr">canal PQR y de privacidad</Link>;

  return <article className="legal-page" translate="no" data-no-translate="true">
    <p className="eyebrow">PRIVACIDAD Y CONTROL</p>
    <h1>Política de Privacidad de My Best Version</h1>
    <p className="legal-page__updated">Última actualización: 16 de septiembre de 2026</p>
    <p className="lead">Esta política explica cómo My Best Version, disponible en <a href={legalConfig.officialDomain}>{legalConfig.officialDomain}</a>, recopila, usa, almacena, protege, comparte y elimina la información necesaria para prestar la aplicación.</p>

    <section>
      <h2>1. Quién trata la información</h2>
      <p>My Best Version es la aplicación responsable de las decisiones descritas en esta política. Puedes presentar consultas, correcciones, revocaciones o solicitudes de eliminación mediante el {privacyContact}. Verificaremos razonablemente la identidad antes de entregar o eliminar información de una cuenta.</p>
    </section>

    <section>
      <h2>2. Información que utilizamos</h2>
      <p>Para crear y proteger una cuenta usamos los datos de identidad que proporcionas o autorizas, como nombre, correo, identificador de cuenta, foto de perfil, idioma, sesión y preferencias. Los datos técnicos estrictamente necesarios pueden incluir dirección IP, navegador y registros de seguridad.</p>
      <p>El contenido detallado del planner —metas, tareas, hábitos, journal, bienestar, fitness, alimentación y finanzas— se guarda principalmente en IndexedDB, dentro del navegador y dispositivo de la persona.</p>
      <p>Si llegas mediante una invitación, el navegador puede conservar temporalmente un código aleatorio opaco y la fecha de llegada. El código no contiene nombre, correo, identificador de cuenta, progreso ni información de quien compartió el enlace.</p>
    </section>

    <section id="google-calendar">
      <h2>3. Información de Google y Google Calendar</h2>
      <p>El inicio de sesión con Google y la conexión con Google Calendar son decisiones independientes. El inicio de sesión recibe únicamente la identidad básica autorizada, como nombre, correo, foto e identificador de cuenta; no habilita Calendar.</p>
      <p>La integración con Google Calendar está temporalmente pausada desde el 16 de septiembre de 2026: no admite nuevas conexiones ni realiza sincronizaciones. Mientras estuvo disponible, solicitó <code>openid</code> y <code>email</code> para identificar la cuenta conectada, <code>calendar.calendarlist.readonly</code> para mostrar la lista de calendarios y <code>calendar.events</code> para leer y administrar eventos únicamente dentro de los calendarios seleccionados.</p>
      <p>Las conexiones históricas pudieron tratar el identificador, nombre, zona horaria, color, rol de acceso y estado principal de los calendarios elegidos, además del título, descripción, fechas, horas, zona horaria, estado, recurrencia, identificadores y ETag de sus eventos. También pudieron almacenar cifrados los tokens OAuth necesarios para mantener la conexión.</p>
      <h3>Uso Limitado</h3>
      <p>El uso y la transferencia a otras aplicaciones de la información recibida de las APIs de Google por My Best Version cumplen la <a href={GOOGLE_API_USER_DATA_POLICY_URL} target="_blank" rel="noreferrer">Política de Datos del Usuario de los Servicios API de Google</a>, incluidos sus requisitos de Uso Limitado.</p>
    </section>

    <section>
      <h2>4. Cómo usamos la información</h2>
      <p>Usamos los datos para autenticar y proteger la cuenta, operar el planner, conservar preferencias, prestar soporte y cumplir solicitudes legales. Mientras la integración estuvo activa, los datos de Calendar se usaron exclusivamente para identificar la cuenta conectada, permitir elegir calendarios, importar y sincronizar eventos, y crear, actualizar o eliminar un evento cuando la persona ejecutaba esa acción desde My Best Version. Durante la pausa no se consulta ni se modifica Google Calendar.</p>
      <p>La analítica de producto permanece desactivada hasta que la autorices. Con ese consentimiento podemos enviar eventos técnicos con propiedades cerradas para medir activación, retorno, revisión semanal, exportación de tarjetas y atribución agregada de invitaciones. No enviamos el titular de una tarjeta, textos del planner, emociones, salud, finanzas, montos, nombres ni correos.</p>
      <p>No solicitamos acceso a Gmail, Drive ni Contactos y no usamos la información de Google para publicidad, elaboración de perfiles comerciales, venta de datos, evaluación crediticia ni finalidades ajenas a la integración.</p>
    </section>

    <section>
      <h2>5. Almacenamiento y seguridad</h2>
      <p>La comunicación con la aplicación y con Google se protege mediante HTTPS. Los tokens OAuth se cifran en el servidor con AES-GCM. Las credenciales, calendarios seleccionados y la copia operativa de los eventos se conservan en tablas de Supabase accesibles únicamente por procesos autenticados del servidor; no se exponen directamente al navegador ni se incluyen en los respaldos locales del planner.</p>
      <p>Aplicamos minimización, control de acceso, separación entre datos locales y datos de sincronización, políticas de acceso a nivel de base de datos y registros técnicos para detectar fallos. Ningún sistema puede garantizar seguridad absoluta, pero revisamos y limitamos cada acceso según la función necesaria.</p>
      <p>La atribución de una invitación se guarda en el navegador por un máximo de 29 días. Sólo se encola para la cuenta autenticada cuando Analítica está autorizada; después se elimina la copia temporal. Retirar Analítica elimina la cola local y detiene nuevos envíos.</p>
    </section>

    <section>
      <h2>6. Proveedores y divulgación</h2>
      <p>Compartimos información sólo con proveedores necesarios para operar el servicio: Google para identidad y Calendar, Supabase para autenticación y almacenamiento server-side, y Vercel para alojar la aplicación. Estos proveedores procesan la información conforme a sus funciones y condiciones aplicables.</p>
      <p>No vendemos, alquilamos ni compartimos datos con anunciantes o corredores de datos. Tampoco usamos ni transferimos información obtenida de Google para entrenar modelos generales o no personalizados de inteligencia artificial o aprendizaje automático. El acceso humano se limita a soporte solicitado expresamente, investigación de seguridad o cumplimiento legal cuando sea necesario.</p>
    </section>

    <section>
      <h2>7. Conservación, desconexión y eliminación</h2>
      <p>Durante la pausa, las credenciales históricas cifradas y la copia operativa existente permanecen aisladas en tablas server-only, pero la aplicación no las usa para conectarse o sincronizar. Puedes revocar el permiso desde tu Cuenta de Google y solicitar la supresión de la copia histórica mediante el canal PQR o el Centro de Privacidad. La supresión de la cuenta incluye las credenciales y la copia asociadas cuando proceda.</p>
      <p>Los eventos locales creados en el planner no se borran al pausar Calendar, revocar el permiso o solicitar la eliminación de la copia de sincronización. Permanecen hasta que los elimines desde Ajustes, borres el almacenamiento del navegador o elimines el dispositivo.</p>
      <p>Consulta las instrucciones completas para <Link href="/data-deletion">exportar, desconectar o eliminar tus datos</Link>.</p>
    </section>

    <section>
      <h2>8. Tus decisiones y derechos</h2>
      <p>Puedes acceder, corregir, exportar o eliminar datos; retirar consentimientos opcionales; revocar el acceso desde Google; solicitar la supresión de datos históricos de Calendar; y pedir información sobre el uso de tus datos. Calendar es una función opcional y su pausa no afecta el uso de las demás funciones.</p>
    </section>

    <section>
      <h2>9. Cambios a esta política</h2>
      <p>Actualizaremos la fecha de esta página cuando cambien de forma material las prácticas descritas. Si un cambio requiere una nueva autorización, la solicitaremos antes de aplicar la nueva finalidad.</p>
    </section>
  </article>;
}
