"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ExternalLink, FileCheck2, LockKeyhole, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicFrame } from "@/src/features/account/AccountPages";
import { useAccount } from "@/src/hooks/useAccount";
import { useLegalPrivacy } from "@/src/hooks/useLegalPrivacy";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { PrivacyRequestType } from "@/src/domain/legal";
import { dataInventory, isLegalIdentityComplete, legalConfig, legalDocuments, missingLegalFields, officialLegalSources, verifiedProviders } from "@/src/lib/legalConfig";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

function LegalStatus() {
  return <>
    <p className="legal-page__updated">Versión {legalDocuments[0].version} · Vigente desde el 27 de agosto de 2026</p>
    {!isLegalIdentityComplete && <aside className="legal-draft-notice" role="status"><strong>Documento en preparación para publicación definitiva</strong><p>La estructura legal está implementada, pero faltan datos verificables del responsable: {missingLegalFields.join(", ")}. No se inventaron datos.</p></aside>}
  </>;
}

function ResponsibleInfo() {
  const value = (text: string | null) => text || "Pendiente de completar antes del lanzamiento comercial";
  return <dl className="legal-responsible">
    <div><dt>Responsable del tratamiento</dt><dd>{value(legalConfig.responsibleName)}</dd></div>
    <div><dt>NIT o identificación</dt><dd>{value(legalConfig.taxId)}</dd></div>
    <div><dt>Domicilio</dt><dd>{value(legalConfig.address)} · {legalConfig.cityCountry}</dd></div>
    <div><dt>Privacidad</dt><dd>{value(legalConfig.privacyEmail)}</dd></div>
    <div><dt>Soporte y PQR</dt><dd>{value(legalConfig.pqrEmail || legalConfig.supportEmail)} · {value(legalConfig.supportPhone)}</dd></div>
    <div><dt>Sitio oficial</dt><dd><a href={legalConfig.officialDomain}>{legalConfig.officialDomain}</a></dd></div>
  </dl>;
}

function LegalArticle({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return <PublicFrame><article className="legal-page"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><LegalStatus /><p className="lead">{lead}</p>{children}<section><h2>Fuentes oficiales de referencia</h2><ul className="legal-source-list">{officialLegalSources.map(([name, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{name} <ExternalLink size={13} /></a></li>)}</ul><p>Este contenido debe recibir revisión jurídica antes de una operación comercial definitiva o un cambio material del producto.</p></section></article></PublicFrame>;
}

export function LegalCenterPage() {
  const items = [
    ["/terms", "Términos y Condiciones", "Reglas de uso, cuenta, disponibilidad y responsabilidades."],
    ["/data-policy", "Política de Tratamiento de Datos", "Tratamiento, derechos, finalidades y procedimientos bajo la Ley 1581."],
    ["/privacy", "Aviso de Privacidad", "Resumen claro de cómo se usan y protegen tus datos."],
    ["/cookies", "Política de Cookies", "Tecnologías necesarias y preferencias opcionales."],
    ["/payments", "Suscripciones y pagos", "Información previa a cualquier compra y proveedor de pago."],
    ["/retract", "Retracto y reversión", "Canales y condiciones legales aplicables."],
    ["/data-deletion", "Eliminar o exportar datos", "Cómo ejercer control sobre la cuenta y el planner."],
    ["/ai-privacy", "Inteligencia Artificial", "Estado actual y reglas antes de activar funciones de IA."],
    ["/security", "Seguridad", "Medidas, límites y reporte responsable de incidentes."],
    ["/provider-info", "Información del proveedor", "Identificación y canales oficiales disponibles."],
    ["/pqr", "Peticiones, quejas y reclamos", "Presenta una PQR o consulta de privacidad."],
  ];
  return <PublicFrame><main className="legal-page legal-page--center"><p className="eyebrow">TRANSPARENCIA Y CONTROL</p><h1>Centro Legal y de Privacidad</h1><LegalStatus /><p className="lead">Encuentra en lenguaje claro las reglas del servicio, el tratamiento de datos y los canales para ejercer tus derechos.</p><div className="legal-resource-grid">{items.map(([href, title, text]) => <Link key={href} to={href}><FileCheck2 size={20} /><strong>{title}</strong><span>{text}</span></Link>)}</div><section><h2>Responsable y canales</h2><ResponsibleInfo /></section></main></PublicFrame>;
}

export function TermsPage() {
  return <LegalArticle eyebrow="CONDICIONES DEL SERVICIO" title="Términos y Condiciones" lead="Estas condiciones regulan el uso de My Best Version en Colombia. No eliminan ni reducen los derechos irrenunciables de las personas consumidoras.">
    <section><h2>1. Identificación y aceptación</h2><ResponsibleInfo /><p>La aceptación se solicita de forma separada, expresa y no preseleccionada al crear una cuenta. Conservamos la versión, fecha y método de la autorización.</p></section>
    <section><h2>2. Servicio y alcance</h2><p>My Best Version es una herramienta de organización personal para conectar visión, metas, planificación, hábitos, bienestar, finanzas y reflexión. No reemplaza diagnóstico ni asesoría médica, psicológica, nutricional, financiera o legal.</p></section>
    <section><h2>3. Cuenta y edad</h2><p>El servicio está dirigido a personas de 18 años o más. La persona usuaria debe entregar información correcta, proteger sus credenciales y comunicar accesos no autorizados. El inicio con Google solicita únicamente identidad básica autorizada.</p></section>
    <section><h2>4. Contenido y almacenamiento local</h2><p>El contenido detallado del planner pertenece a la persona usuaria y se guarda principalmente en IndexedDB del dispositivo. Cambiar de navegador, dispositivo o dominio puede requerir exportar e importar un respaldo.</p></section>
    <section><h2>5. Uso permitido</h2><p>No se permite vulnerar cuentas o infraestructura, introducir código dañino, infringir derechos de terceros, suplantar identidades ni usar el servicio con fines ilícitos. Podemos limitar el acceso ante fraude, riesgo de seguridad o incumplimiento material, respetando el debido proceso aplicable.</p></section>
    <section><h2>6. Prueba, Premium y pagos</h2><p>La prueba informada actualmente es de 15 días y no exige pago automático. Antes de cualquier compra se presentarán precio total, periodicidad, renovación, impuestos, proveedor de pago y mecanismo de cancelación. Los derechos de retracto, reversión y garantías legales no se renuncian.</p></section>
    <section><h2>7. Disponibilidad y responsabilidad</h2><p>Trabajamos para mantener el servicio disponible y seguro, pero pueden presentarse interrupciones. No prometemos resultados personales, financieros, físicos o de bienestar. Las limitaciones de responsabilidad no aplican cuando la ley colombiana lo prohíbe.</p></section>
    <section><h2>8. Cambios y terminación</h2><p>Los cambios materiales se informarán antes de exigir una nueva aceptación. La persona puede cerrar la cuenta, exportar sus datos y solicitar supresión, salvo obligaciones legales de conservación.</p></section>
    <section><h2>9. Ley aplicable y PQR</h2><p>Se aplican las leyes de la República de Colombia. Las consultas, peticiones, quejas y reclamos pueden radicarse en el <Link to="/pqr">canal PQR</Link>. También puedes acudir a la Superintendencia de Industria y Comercio cuando corresponda.</p></section>
  </LegalArticle>;
}

export function DataPolicyPage() {
  return <LegalArticle eyebrow="LEY 1581 DE 2012" title="Política de Tratamiento de Datos Personales" lead="Esta política describe las finalidades, bases, medidas y procedimientos aplicables al tratamiento de datos personales en My Best Version.">
    <section><h2>1. Responsable</h2><ResponsibleInfo /></section>
    <section><h2>2. Principios</h2><p>Aplicamos legalidad, finalidad, libertad, veracidad, transparencia, acceso restringido, seguridad y confidencialidad. Solicitamos autorización previa, expresa e informada cuando corresponde.</p></section>
    <section><h2>3. Datos tratados</h2><div className="legal-table" role="table">{dataInventory.map((item) => <div role="row" key={item.category}><strong role="cell">{item.category}{item.sensitive ? " · sensible" : ""}</strong><span role="cell">{item.examples}</span><small role="cell">{item.storage}</small></div>)}</div></section>
    <section><h2>4. Finalidades</h2><p>Crear y autenticar cuentas; operar el planner; conservar preferencias; prestar soporte; proteger la seguridad; gestionar accesos, suscripciones y evidencias legales; responder solicitudes; cumplir obligaciones legales; y, únicamente con autorización opcional, enviar comunicaciones comerciales.</p></section>
    <section><h2>5. Datos sensibles</h2><p>Los registros de salud, bienestar, ánimo, sueño, alimentación, medidas, journal y ciertas finanzas pueden revelar información sensible. Su entrega es facultativa. Solicitamos una autorización separada al entrar por primera vez a la función pertinente; negarla bloquea únicamente esa función.</p></section>
    <section><h2>6. Derechos de las personas titulares</h2><p>Puedes conocer, actualizar, rectificar y acceder gratuitamente a tus datos; solicitar prueba de autorización e información sobre su uso; revocar la autorización o pedir supresión cuando proceda; y presentar quejas ante la SIC después de agotar el trámite ante el responsable.</p></section>
    <section><h2>7. Consultas y reclamos</h2><p>Radica una solicitud desde el <Link to="/pqr">canal PQR</Link> o el Centro de Privacidad. Las consultas se atienden en máximo diez (10) días hábiles y los reclamos en quince (15) días hábiles, con las prórrogas legales informadas oportunamente. Para protegerte podremos verificar identidad.</p></section>
    <section><h2>8. Conservación y eliminación</h2><p>Conservamos datos de cuenta mientras exista la relación y por el tiempo adicional necesario para obligaciones legales, seguridad o defensa de derechos. Los datos locales permanecen hasta que la persona los borre, limpie el navegador o importe un reemplazo. La supresión se ejecuta cuando no exista deber legal o contractual de conservar.</p></section>
    <section><h2>9. Encargados y transmisiones</h2><div className="legal-table">{verifiedProviders.map((provider) => <div key={provider.name}><strong>{provider.name}</strong><span>{provider.purpose}</span><small>{provider.data} · {provider.location}</small><a href={provider.policyUrl} target="_blank" rel="noreferrer">Ver política <ExternalLink size={12} /></a></div>)}</div><p>La región exacta, contratos y salvaguardas de cada proveedor deben revisarse y mantenerse en el inventario interno. No habilitamos un proveedor nuevo sin evaluación previa.</p></section>
    <section><h2>10. Seguridad e incidentes</h2><p>Aplicamos control de acceso, sesiones gestionadas por Supabase, políticas RLS, minimización, almacenamiento local y respaldos bajo control de la persona. Ningún sistema es infalible. Investigaremos incidentes, los documentaremos y notificaremos a las personas o autoridades cuando la ley lo exija.</p></section>
    <section><h2>11. Vigencia y cambios</h2><p>La política rige desde la fecha indicada. Los cambios sustanciales se mostrarán de forma visible y, cuando cambien finalidades o bases, solicitaremos una nueva autorización.</p></section>
  </LegalArticle>;
}

export function PrivacyPage() {
  return <LegalArticle eyebrow="AVISO DE PRIVACIDAD" title="Tu privacidad, en claro" lead="My Best Version usa la información mínima necesaria para darte acceso y permitirte organizar tu vida con control sobre tus datos.">
    <section><h2>Quién trata tus datos</h2><ResponsibleInfo /></section>
    <section><h2>Qué usamos y para qué</h2><p>Usamos nombre, correo, sesión y preferencias para autenticar y operar la cuenta. Tus metas, hábitos, tareas, journal, finanzas, fitness y alimentación se guardan principalmente en el navegador. No vendemos datos ni los usamos para publicidad personalizada.</p></section>
    <section><h2>Google</h2><p>Si eliges Google, recibimos nombre, correo y foto de perfil autorizados. No pedimos acceso a Gmail, Drive, Calendario ni Contactos. El uso de información de APIs de Google se limita a iniciar sesión y cumple los requisitos de Uso Limitado aplicables.</p></section>
    <section><h2>Decisiones bajo tu control</h2><p>Puedes exportar o borrar datos, retirar consentimientos opcionales y solicitar acceso, corrección, revocación o supresión desde el Centro de Privacidad. Lee la <Link to="/data-policy">política completa de tratamiento</Link>.</p></section>
  </LegalArticle>;
}

export function CookiesPage() {
  return <LegalArticle eyebrow="PREFERENCIAS" title="Política de Cookies y tecnologías similares" lead="Usamos almacenamiento del navegador para mantener la sesión, el idioma, la seguridad y los datos locales del planner.">
    <section><h2>Necesarias</h2><p>Son indispensables para autenticar, mantener preferencias esenciales, recordar la decisión de cookies y operar IndexedDB. No pueden desactivarse desde el gestor mientras se use la aplicación.</p></section>
    <section><h2>Funcionales</h2><p>Recuerdan opciones adicionales de experiencia. Son opcionales y pueden cambiarse en cualquier momento.</p></section>
    <section><h2>Analítica y marketing</h2><p>Actualmente no se cargan proveedores externos de analítica publicitaria ni marketing. Las categorías permanecen desactivadas hasta que exista una finalidad, proveedor documentado y consentimiento previo.</p></section>
    <section><h2>Administrar la elección</h2><p>Usa “Preferencias de cookies” en el pie de página. Retirar una categoría opcional no afecta las tecnologías esenciales ni borra los datos del planner.</p></section>
  </LegalArticle>;
}

export function PaymentsPage() {
  return <LegalArticle eyebrow="INFORMACIÓN COMERCIAL" title="Suscripciones, precios y pagos" lead="No se realiza ningún cobro sin una acción expresa. La prueba no exige tarjeta ni activa renovación automática por sí sola.">
    <section><h2>Información antes de comprar</h2><p>Antes del pago se debe mostrar precio total en COP, impuestos, duración, alcance, periodicidad, renovación, cancelación, condiciones promocionales y datos del proveedor. Si una pieza todavía no está definida, no se presenta como oferta vigente.</p></section>
    <section><h2>Proveedor de pago</h2><p>El checkout configurado usa {legalConfig.paymentProvider}. Los datos completos de tarjeta se entregan directamente al proveedor y no se almacenan en My Best Version. Debes revisar su información antes de pagar.</p></section>
    <section><h2>Cancelación y soporte</h2><p>La cancelación detiene futuras renovaciones cuando corresponda y no elimina datos del planner. Las solicitudes comerciales pueden radicarse por <Link to="/pqr">PQR</Link>. Los derechos legales de retracto, reversión y garantía permanecen disponibles.</p></section>
  </LegalArticle>;
}

export function RetractPage() {
  return <LegalArticle eyebrow="ESTATUTO DEL CONSUMIDOR" title="Retracto, reversión y cancelación" lead="Los derechos aplicables dependen del tipo de transacción y de los plazos legales; ninguna condición de la app pretende eliminarlos.">
    <section><h2>Derecho de retracto</h2><p>Cuando sea legalmente procedente, puedes ejercerlo dentro del plazo previsto por la Ley 1480 de 2011. Radica la solicitud con referencia de compra y datos de contacto en el canal PQR.</p></section>
    <section><h2>Reversión del pago</h2><p>En pagos electrónicos, la reversión puede proceder en los eventos definidos por la ley, por ejemplo fraude, operación no solicitada, producto no recibido o no correspondiente. Debes informar también al emisor del instrumento de pago dentro del plazo legal.</p></section>
    <section><h2>Cancelación</h2><p>Cancelar una suscripción y ejercer retracto o reversión son trámites distintos. Te informaremos la recepción, número de referencia y respuesta por el canal de contacto registrado.</p></section>
  </LegalArticle>;
}

export function DataDeletionPage() {
  return <LegalArticle eyebrow="CONTROL DE TU INFORMACIÓN" title="Exportación y eliminación de datos" lead="Puedes administrar los datos locales desde Ajustes y solicitar la supresión de información de cuenta desde el Centro de Privacidad.">
    <section><h2>Exportar</h2><p>En Ajustes y datos, “Exportar copia de seguridad” descarga un JSON con el contenido local. Guárdalo en un lugar privado: puede incluir información sensible.</p></section>
    <section><h2>Eliminar datos del dispositivo</h2><p>“Eliminar todos los datos” borra permanentemente el planner de ese navegador después de una confirmación reforzada. También puedes borrar datos del sitio desde el navegador.</p></section>
    <section><h2>Eliminar la cuenta</h2><p>Desde el Centro de Privacidad puedes crear una solicitud trazable. Verificaremos identidad, informaremos lo que deba conservarse legalmente y ejecutaremos la supresión procedente. Cerrar sesión por sí solo no elimina datos.</p></section>
  </LegalArticle>;
}

export function AiPrivacyPage() {
  return <LegalArticle eyebrow="TRANSPARENCIA TECNOLÓGICA" title="Uso de Inteligencia Artificial" lead="La versión auditada no conecta un proveedor de IA ni envía tus metas, journal, finanzas o bienestar a un modelo externo.">
    <section><h2>Antes de habilitar IA</h2><p>Cualquier función futura deberá informar proveedor, finalidad, datos enviados, ubicación, retención, revisión humana, riesgos y forma de desactivarla. Cuando trate datos sensibles requerirá autorización explícita separada.</p></section>
    <section><h2>Decisiones automatizadas</h2><p>No se toman decisiones jurídicas, médicas, laborales, crediticias ni de acceso basadas exclusivamente en algoritmos. Las sugerencias futuras deberán presentarse como apoyo opcional, explicable y sujeto al criterio de la persona.</p></section>
  </LegalArticle>;
}

export function ProviderInfoPage() {
  return <LegalArticle eyebrow="INFORMACIÓN DEL PROVEEDOR" title="Quién está detrás del servicio" lead="Publicamos únicamente información verificable. Los datos aún no suministrados se muestran como pendientes y deben completarse antes del lanzamiento comercial."><section><h2>Identificación</h2><ResponsibleInfo /></section><section><h2>Canales</h2><p>El Centro de Privacidad recibe consultas y reclamos de datos. El canal PQR recibe peticiones, quejas, reclamos, retractos y solicitudes comerciales, con número de referencia.</p></section></LegalArticle>;
}

export function SecurityPage() {
  return <LegalArticle eyebrow="SEGURIDAD" title="Protección y reporte responsable" lead="La seguridad combina controles técnicos, minimización y decisiones conscientes de la persona usuaria.">
    <section><h2>Medidas</h2><p>Sesiones gestionadas por Supabase, control de acceso por RLS, conexiones HTTPS, almacenamiento local del contenido detallado, validación de entradas y minimización de registros. No registramos contenido del journal ni datos personales en consola.</p></section>
    <section><h2>Tu dispositivo</h2><p>Usa bloqueo de pantalla, protege tus credenciales y exporta respaldos solo a ubicaciones seguras. Un dispositivo compartido puede exponer datos locales incluso después de cerrar sesión.</p></section>
    <section><h2>Reportar un incidente</h2><p>Radica una solicitud de tipo “Seguridad” en el <Link to="/pqr">canal PQR</Link>, sin incluir contraseñas ni datos sensibles innecesarios.</p></section>
  </LegalArticle>;
}

export function LegalNoticesPage() { return <LegalCenterPage />; }

const requestLabels: Record<PrivacyRequestType, string> = {
  data_inquiry: "Consulta de datos", data_claim: "Reclamo de datos", correction: "Corrección", data_deletion: "Supresión de datos", consent_revocation: "Revocar autorización", account_deletion: "Eliminar cuenta", pqr: "Petición, queja o reclamo", retract: "Retracto o reversión", security: "Seguridad",
};

function RequestForm({ compact = false }: { compact?: boolean }) {
  const account = useAccount();
  const legal = useLegalPrivacy(account.user?.id ?? null);
  const [type, setType] = useState<PrivacyRequestType>("pqr");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account.user) { setMessage("Inicia sesión para radicar y consultar el estado de tu solicitud."); return; }
    setSaving(true); setMessage("");
    try {
      const request = await legal.createRequest({ type, subject, description, contactEmail: account.user.email, attachment });
      setMessage(`Solicitud recibida. Tu número de referencia es ${request.reference}.`); setSubject(""); setDescription(""); setAttachment(null);
    } catch { setMessage("No pudimos radicar la solicitud. Revisa los campos e inténtalo de nuevo."); }
    finally { setSaving(false); }
  };
  return <form className={`privacy-request-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
    <label className="form-field"><span>Tipo de solicitud</span><select value={type} onChange={(event) => setType(event.target.value as PrivacyRequestType)}>{Object.entries(requestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="form-field"><span>Asunto</span><input required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
    <label className="form-field"><span>Descripción</span><textarea required minLength={10} maxLength={3000} rows={compact ? 4 : 6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Cuéntanos qué necesitas y evita incluir contraseñas." /></label>
    <label className="form-field"><span>Adjunto opcional · PDF, JPG, PNG o TXT · máximo 2 MB</span><input type="file" accept="application/pdf,image/jpeg,image/png,text/plain" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /></label>
    <Button type="submit" loading={saving}>Radicar solicitud</Button>{message && <p className="inline-message" role="status">{message}</p>}
  </form>;
}

export function PqrPage() {
  const account = useAccount();
  return <PublicFrame><main className="legal-page legal-page--center"><p className="eyebrow">ATENCIÓN Y PRIVACIDAD</p><h1>Peticiones, quejas y reclamos</h1><LegalStatus /><p className="lead">Radica solicitudes comerciales, de privacidad, retracto, seguridad o eliminación. Al iniciar sesión podrás consultar su estado y conservar la trazabilidad.</p>{account.user ? <RequestForm /> : <><Card className="legal-login-card"><Mail size={22} /><h2>Ingresa para proteger tu solicitud</h2><p>Usamos tu cuenta para verificar identidad, asignar una referencia y mostrarte el seguimiento.</p><Link className="button button--primary" to="/login">Iniciar sesión</Link></Card><section><h2>Plazos de privacidad</h2><p>Consultas: hasta 10 días hábiles. Reclamos: hasta 15 días hábiles. Si se requiere prórroga, informaremos el motivo y la nueva fecha dentro de los límites legales.</p></section></>}</main></PublicFrame>;
}

export function LegalPrivacyPage() {
  const rows = useMemo(() => [
    ["/app/privacy-center", "Centro de Privacidad", "Consentimientos, solicitudes, exportación y eliminación."],
    ["/terms", "Términos y Condiciones", "Condiciones vigentes del servicio."], ["/data-policy", "Tratamiento de datos", "Finalidades, derechos y procedimientos."], ["/privacy", "Aviso de Privacidad", "Resumen claro del tratamiento."], ["/cookies", "Cookies", "Administra tecnologías opcionales."], ["/pqr", "PQR", "Peticiones, quejas, reclamos y retractos."], ["/security", "Seguridad", "Protección y reporte de incidentes."],
  ], []);
  return <div className="page-stack"><SectionHeading eyebrow="TRANSPARENCIA Y CONTROL" title="Legal y privacidad" description="Tus documentos, decisiones y solicitudes en un solo lugar." action={<Badge tone={isLegalIdentityComplete ? "sage" : "warm"}>{isLegalIdentityComplete ? "Información verificada" : "Identificación pendiente"}</Badge>} /><div className="legal-app-grid">{rows.map(([href, title, text]) => <Card key={href}><ShieldCheck size={20} /><h2>{title}</h2><p>{text}</p><Link className="button button--secondary" to={href}>Abrir</Link></Card>)}</div></div>;
}

export function PrivacyCenterPage({ planner }: { planner: PlannerController }) {
  const account = useAccount();
  const legal = useLegalPrivacy(account.user?.id ?? null);
  const marketing = legal.hasConsent("marketing");
  const sensitiveWellness = legal.hasConsent("sensitive_wellness");
  return <div className="page-stack"><SectionHeading eyebrow="TUS DATOS, TUS DECISIONES" title="Centro de Privacidad" description="Consulta, exporta y administra autorizaciones sin borrar tus avances por accidente." action={<LockKeyhole size={22} />} />
    <div className="privacy-center-grid"><Card><h2>Mapa de tus datos</h2><div className="legal-table">{dataInventory.map((item) => <div key={item.category}><strong>{item.category}</strong><span>{item.examples}</span><small>{item.storage}</small></div>)}</div></Card><Card><h2>Acciones rápidas</h2><p>El respaldo puede incluir información sensible. Guárdalo en un lugar privado.</p><Button onClick={() => planner.downloadBackup()}>Exportar todos mis datos</Button><Link className="button button--secondary" to="/app/settings">Administrar datos locales</Link><Link className="button button--danger" to="/data-deletion"><Trash2 size={16} /> Ver opciones de eliminación</Link></Card></div>
    <Card className="consent-manager"><h2>Autorizaciones</h2><div><div><strong>Comunicaciones comerciales</strong><p>Opcional. No afecta el acceso al planner.</p></div><Button variant={marketing ? "danger" : "secondary"} disabled={legal.loading} onClick={() => legal.recordConsent({ consentType: "marketing", method: "privacy_center", status: marketing ? "withdrawn" : "granted" })}>{marketing ? "Retirar autorización" : "Autorizar"}</Button></div><div><div><strong>Datos sensibles de bienestar</strong><p>Habilita Fitness y Alimentación. Retirarla no borra automáticamente los registros locales.</p></div><Button variant={sensitiveWellness ? "danger" : "secondary"} disabled={legal.loading} onClick={() => legal.recordConsent({ consentType: "sensitive_wellness", method: "privacy_center", status: sensitiveWellness ? "withdrawn" : "granted" })}>{sensitiveWellness ? "Retirar autorización" : "Autorizar"}</Button></div><p className="form-help">Los términos, la política de datos y la mayoría de edad se registran por separado durante el acceso.</p></Card>
    <Card><h2>Nueva solicitud</h2><RequestForm compact /></Card>
    <section><h2>Seguimiento</h2>{legal.requests.length ? <div className="privacy-request-list">{legal.requests.map((request) => <Card key={request.id}><div><strong>{request.reference}</strong><Badge tone={request.status === "closed" ? "sage" : "warm"}>{request.status === "received" ? "Recibida" : request.status === "in_review" ? "En revisión" : request.status === "answered" ? "Respondida" : "Cerrada"}</Badge></div><h3>{request.subject}</h3><p>{requestLabels[request.type]} · {new Date(request.createdAt).toLocaleDateString("es-CO")}</p>{request.deadlineAt && <small>Fecha objetivo legal: {new Date(request.deadlineAt).toLocaleDateString("es-CO")}</small>}</Card>)}</div> : <EmptyState title="Aún no tienes solicitudes" text="Cuando radiques una, podrás ver aquí su referencia y estado." />}</section>
  </div>;
}
