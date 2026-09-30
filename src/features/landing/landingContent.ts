import type { Language } from "@/src/stores/useUiStore";
import { getPremiumOffer, minorUnitsToDecimal, type BillingInterval } from "@/src/domain/commercialOffer";

function offerPrice(interval: BillingInterval, language: Language) {
  const decimal = minorUnitsToDecimal(getPremiumOffer(interval).amountMinor);
  return `USD ${language === "es" ? decimal.replace(".", ",") : decimal} / ${interval === "monthly" ? (language === "es" ? "mes" : "month") : (language === "es" ? "año" : "year")}`;
}

export type LandingIconName = "leaf" | "home" | "target" | "chart" | "eye" | "calendar" | "repeat" | "check" | "journal" | "wallet" | "fitness" | "sparkles" | "brain";

export interface LandingFeature {
  title: string;
  description: string;
  icon: LandingIconName;
}

export interface PremiumLandingFeature extends LandingFeature {
  detail: string;
}

export interface ComparisonRow {
  feature: string;
  free: boolean;
  premium: boolean;
}

export type LandingShowcaseMomentId = "today" | "planning" | "wellbeing" | "progress";

export interface LandingShowcaseMoment {
  id: LandingShowcaseMomentId;
  marker: string;
  label: string;
  title: string;
  description: string;
  alt: string;
}

export interface LandingContent {
  language: Language;
  promo: string;
  navigation: Array<{ id: "como-funciona" | "que-incluye" | "beneficios" | "planes" | "faq"; label: string }>;
  actions: {
    start: string;
    login: string;
    included: string;
    openSpace: string;
    plans: string;
    monthlyCheckout: string;
    annualCheckout: string;
  };
  hero: { eyebrow: string; title: string; accent: string; paragraphs: string[]; trust: string; visualAlt: string };
  benefits: { eyebrow: string; title: string; description: string; items: LandingFeature[] };
  problemSolution: {
    eyebrow: string;
    title: string;
    description: string;
    problemLabel: string;
    problemTitle: string;
    problemItems: string[];
    solutionLabel: string;
    solutionTitle: string;
    solutionItems: string[];
  };
  how: { eyebrow: string; title: string; description: string; example: string; steps: LandingFeature[] };
  included: {
    eyebrow: string;
    title: string;
    description: string;
    items: LandingFeature[];
    secondaryLabel: string;
    secondaryDescription: string;
    secondaryItems: LandingFeature[];
  };
  showcase: {
    eyebrow: string;
    title: string;
    description: string;
    selectorLabel: string;
    exampleLabel: string;
    moments: LandingShowcaseMoment[];
  };
  premium: { eyebrow: string; title: string; description: string; availableLabel: string; items: PremiumLandingFeature[] };
  pricing: {
    eyebrow: string;
    title: string;
    description: string;
    freeName: string;
    freePrice: string;
    freePeriod: string;
    freeDescription: string;
    freeIncludesLabel: string;
    freeIncludes: string[];
    freeTrust: string;
    premiumName: string;
    premiumDescription: string;
    monthlyLabel: string;
    annualLabel: string;
    monthlyPrice: string;
    annualPrice: string;
    premiumIncludesLabel: string;
    premiumIncludes: Array<{ title: string; detail?: string }>;
    checkoutNote: string;
  };
  comparison: { eyebrow: string; title: string; description: string; featureLabel: string; freeLabel: string; premiumLabel: string; rows: ComparisonRow[] };
  reward: {
    titleLines: [string, string];
    descriptionLines: [string, string];
    cta: string;
    facts: Array<{ icon: "calendar" | "crown" | "heart"; lines: [string, string?] }>;
    note: string;
  };
  finalCta: { eyebrow: string; title: string; description: string };
  faq: { eyebrow: string; title: string; description: string; items: Array<{ question: string; answer: string; checkout?: boolean }> };
  footer: { tagline: string; product: string; account: string; legal: string; privacy: string; terms: string; cookies: string; pqr: string; copyright: string };
  accessibility: { skipLink: string; brandHome: string; primaryNavigation: string; mobileNavigation: string; menuOpen: string; menuClose: string; purchaseOptions: string; comparisonAvailable: string; comparisonUnavailable: string; screenshotGroup: string };
}

const es: LandingContent = {
  language: "es",
  promo: "Usa My Best Version durante 30 días consecutivos y recibe 30 días Premium gratis",
  navigation: [
    { id: "como-funciona", label: "Cómo funciona" },
    { id: "que-incluye", label: "Qué incluye" },
    { id: "beneficios", label: "Beneficios" },
    { id: "planes", label: "Planes" },
    { id: "faq", label: "FAQ" },
  ],
  actions: {
    start: "Empieza gratis",
    login: "Iniciar sesión",
    included: "Ver qué incluye",
    openSpace: "Ir a mi espacio",
    plans: "Ver planes Premium",
    monthlyCheckout: "Comprar mensual",
    annualCheckout: "Comprar anual",
  },
  hero: {
    eyebrow: "VISIÓN · METAS · HÁBITOS · TU DÍA",
    title: "Tu mejor versión",
    accent: "empieza aquí",
    paragraphs: [
      "Ordena tus planes, elige lo importante y encuentra tu siguiente paso para hoy. Un espacio para dar forma a tus metas, organizar tus tareas y reconocer tus avances a tu ritmo.",
      "Empieza con Gratis y construye una práctica personal que puedas sostener a tu ritmo.",
    ],
    trust: "Gratis · USD 0 · Sin tarjeta",
    visualAlt: "Vista de ejemplo de Mi día con tres prioridades y tareas organizadas",
  },
  benefits: {
    eyebrow: "CLARIDAD PARA TU VIDA REAL",
    title: "Más claridad para organizarte a tu manera",
    description: "Beneficios concretos para volver a lo que importa sin añadir más ruido.",
    items: [
      { title: "Menos pendientes dando vueltas", description: "Reúne lo que quieres hacer en un lugar al que puedas volver.", icon: "check" },
      { title: "Un punto de partida para hoy", description: "Elige tus prioridades sin tener que resolver toda tu semana de una vez.", icon: "target" },
      { title: "Planes que no se quedan olvidados", description: "Vuelve a tus metas y decide qué acción concreta quieres darles hoy.", icon: "calendar" },
      { title: "Avances que puedes reconocer", description: "Consulta lo que completaste y los hábitos que registraste, no solo lo que falta.", icon: "chart" },
      { title: "Espacio para cómo te sientes", description: "Incluye tu ánimo y tu reflexión en la forma de organizar tu día.", icon: "journal" },
    ],
  },
  problemSolution: {
    eyebrow: "MENOS DISPERSIÓN, MÁS CLARIDAD",
    title: "Un lugar para volver a lo que importa",
    description: "No necesitas tener todo resuelto para empezar a avanzar con intención.",
    problemLabel: "CUANDO TODO COMPITE",
    problemTitle: "Es fácil perder de vista tu dirección",
    problemItems: [
      "Tus metas quedan separadas de lo que haces cada día.",
      "Registrar hábitos se convierte en otra obligación.",
      "Cuesta reconocer el progreso cuando está disperso.",
      "Una pausa puede sentirse como volver a empezar.",
    ],
    solutionLabel: "CON MY BEST VERSION",
    solutionTitle: "Tu dirección acompaña tus días",
    solutionItems: [
      "Define la visión que quieres tener presente.",
      "Da forma a metas concretas y personales.",
      "Registra hábitos con una mirada amable.",
      "Elige desde Mi día y observa el conjunto en Dashboard.",
    ],
  },
  how: {
    eyebrow: "UN RECORRIDO SIMPLE",
    title: "De lo que quieres para tu vida a lo que puedes hacer hoy",
    description: "No necesitas tenerlo todo resuelto para empezar. Puedes comenzar con una meta, una prioridad o una acción pequeña.",
    example: "Por ejemplo, tú puedes pasar de “Quiero retomar la lectura” a una acción concreta: “Leer 20 minutos hoy”.",
    steps: [
      { title: "Dale una dirección", description: "Pon en palabras lo que quieres para ti y define las metas que te gustaría trabajar.", icon: "eye" },
      { title: "Hazle espacio en tus planes", description: "Organiza tus metas y acciones en tu planificación para decidir en qué quieres enfocarte y cuándo.", icon: "calendar" },
      { title: "Elige lo importante de hoy", description: "Selecciona tus prioridades, consulta tus tareas y registra lo que vas completando.", icon: "check" },
      { title: "Revisa y ajusta a tu ritmo", description: "Observa tus avances, tus hábitos y cómo te has sentido para decidir qué mantener y qué cambiar.", icon: "chart" },
    ],
  },
  included: {
    eyebrow: "HERRAMIENTAS DEL PRODUCTO",
    title: "Un espacio para tus planes y tu día a día",
    description: "Reúne espacios para orientar tus planes, actuar y revisar tu recorrido.",
    items: [
      { title: "Visión y metas", description: "Define qué quieres construir y mantén presente lo que es importante para ti.", icon: "target" },
      { title: "Planificación", description: "Da un lugar a tus objetivos y acciones en los espacios de planificación de la app.", icon: "calendar" },
      { title: "Prioridades y tareas", description: "Decide qué merece tu atención hoy y reúne lo que necesitas hacer.", icon: "check" },
      { title: "Hábitos", description: "Registra las pequeñas acciones que quieres mantener y consulta su seguimiento.", icon: "repeat" },
      { title: "Bienestar y reflexión", description: "Anota cómo te sientes y guarda lo que quieres recordar de tu día.", icon: "journal" },
      { title: "Progreso", description: "Consulta tus registros y reconoce lo que has ido completando.", icon: "chart" },
    ],
    secondaryLabel: "TAMBIÉN EN PREMIUM",
    secondaryDescription: "Herramientas complementarias para registrar otras áreas, sin cambiar el foco principal de tu día.",
    secondaryItems: [
      { title: "Alimentación", description: "Registra y consulta tus comidas por día.", icon: "leaf" },
      { title: "Entrenamiento", description: "Registra sesiones de fuerza, cardio o deporte por fecha.", icon: "fitness" },
      { title: "Finanzas", description: "Reúne cuentas, movimientos y presupuestos para revisar tus finanzas personales.", icon: "wallet" },
    ],
  },
  showcase: {
    eyebrow: "PRODUCTO REAL",
    title: "Así se organiza un día más tuyo",
    description: "De lo que quieres hacer a lo que haces hoy. Mira cómo puedes elegir tus prioridades, organizar tus acciones y reconocer lo que vas construyendo.",
    selectorLabel: "Momentos de uso de My Best Version",
    exampleLabel: "Vista de ejemplo",
    moments: [
      { id: "today", marker: "A", label: "Elige qué hacer hoy", title: "Elige qué hacer hoy", description: "Pon delante lo que merece tu atención. Elige hasta tres prioridades, consulta tus tareas y marca lo que ya hiciste.", alt: "Vista de ejemplo de Mi día con tres prioridades y tareas organizadas" },
      { id: "planning", marker: "B", label: "Dale un lugar a tus planes", title: "Dale un lugar a tus planes", description: "Convierte tus intenciones en planes concretos y distribuye tus acciones para que no se queden solo en una idea.", alt: "Vista de ejemplo de la planificación semanal con prioridades, tareas y hábitos distribuidos por día" },
      { id: "wellbeing", marker: "C", label: "Organízate teniendo en cuenta cómo estás", title: "Organízate teniendo en cuenta cómo estás", description: "Registra tus hábitos y haz una pausa para observar tu ánimo y tu energía. Tu organización también puede tener en cuenta cómo estás hoy.", alt: "Vista de ejemplo del registro de ánimo y energía del día" },
      { id: "progress", marker: "D", label: "Reconoce lo que avanzaste", title: "Reconoce lo que avanzaste", description: "Vuelve a lo que sí hiciste. Consulta tus acciones y registros para reconocer tus avances y decidir qué mantener o ajustar.", alt: "Vista de ejemplo de Progreso con tareas completadas y registros de hábitos calculados por la aplicación" },
    ],
  },
  premium: {
    eyebrow: "MÁS HERRAMIENTAS, CUANDO LAS QUIERAS",
    title: "Premium amplía tu experiencia",
    description: "Conserva todo lo incluido en Gratis y suma cuatro espacios para cuidar más áreas de tu vida.",
    availableLabel: "Premium",
    items: [
      { title: "Fitness y alimentación", description: "Registra entrenamientos, comidas y medidas dentro de tu espacio personal.", detail: "Tus registros permanecen bajo tu control y no sustituyen orientación profesional.", icon: "fitness" },
      { title: "Finanzas", description: "Organiza cuentas, movimientos, presupuestos, fondos y metas financieras.", detail: "My Best Version no se conecta a tus bancos ni ofrece asesoría financiera.", icon: "wallet" },
      { title: "Análisis avanzado del progreso", description: "Profundiza en patrones y tendencias para entender mejor tu recorrido.", detail: "Usa señales de tu propio registro para ayudarte a revisar y ajustar.", icon: "chart" },
      { title: "Recomendaciones para ti", description: "Recibe sugerencias relevantes según tu progreso y lo que decides registrar.", detail: "Tú conservas el criterio y la decisión final sobre cada sugerencia.", icon: "sparkles" },
    ],
  },
  pricing: {
    eyebrow: "PLANES",
    title: "Elige cómo quieres empezar",
    description: "Gratis no tiene costo. Premium se compra de forma explícita en modalidad mensual o anual.",
    freeName: "Gratis",
    freePrice: "USD 0",
    freePeriod: "sin vencimiento",
    freeDescription: "Empieza con las herramientas esenciales y conoce tu propia forma de avanzar.",
    freeIncludesLabel: "Incluye",
    freeIncludes: ["Visión", "Metas", "Hábitos y registro", "Mi día", "Dashboard"],
    freeTrust: "Sin tarjeta · Sin cobros automáticos",
    premiumName: "Premium",
    premiumDescription: "Todo lo de Gratis, más herramientas para bienestar, finanzas y una lectura más profunda de tu progreso.",
    monthlyLabel: "Premium mensual",
    annualLabel: "Premium anual",
    monthlyPrice: offerPrice("monthly", "es"),
    annualPrice: offerPrice("annual", "es"),
    premiumIncludesLabel: "Incluye",
    premiumIncludes: [
      { title: "Todo lo incluido en Gratis" },
      { title: "Fitness y alimentación" },
      { title: "Finanzas" },
      { title: "Análisis avanzado del progreso" },
      { title: "Recomendaciones para ti" },
    ],
    checkoutNote: "El pago se realiza en Mercado Pago. Volver del checkout no activa Premium automáticamente; el acceso sólo cambia cuando el estado del pago queda confirmado.",
  },
  comparison: {
    eyebrow: "COMPARACIÓN CLARA",
    title: "Gratis o Premium: tú eliges",
    description: "Compara la oferta disponible sin límites de planificación ni funciones anunciadas como futuras.",
    featureLabel: "Característica",
    freeLabel: "Gratis · USD 0",
    premiumLabel: "Premium",
    rows: [
      { feature: "Visión", free: true, premium: true },
      { feature: "Metas", free: true, premium: true },
      { feature: "Hábitos y registro", free: true, premium: true },
      { feature: "Mi día", free: true, premium: true },
      { feature: "Dashboard", free: true, premium: true },
      { feature: "Fitness y alimentación", free: false, premium: true },
      { feature: "Finanzas", free: false, premium: true },
      { feature: "Análisis avanzado del progreso", free: false, premium: true },
      { feature: "Recomendaciones para ti", free: false, premium: true },
    ],
  },
  reward: {
    titleLines: ["Tu constancia", "tiene recompensa"],
    descriptionLines: [
      "Usa My Best Version durante 30 días consecutivos",
      "y recibe 30 días Premium gratis.",
    ],
    cta: "Empezar gratis",
    facts: [
      { icon: "calendar", lines: ["30 días", "consecutivos"] },
      { icon: "crown", lines: ["30 días", "Premium"] },
      { icon: "heart", lines: ["Sin costo"] },
    ],
    note: "Para sumar un día, guarda al menos una acción en Visión, Metas, Hábitos o Mi día.",
  },
  finalCta: {
    eyebrow: "TU PROCESO PUEDE EMPEZAR HOY",
    title: "Empieza con lo esencial",
    description: "Crea tu cuenta Gratis, conoce tu ritmo y decide más adelante si Premium tiene sentido para ti.",
  },
  faq: {
    eyebrow: "PREGUNTAS FRECUENTES",
    title: "Todo claro antes de empezar",
    description: "Precios, funciones y recompensa explicados sin letra pequeña.",
    items: [
      { question: "¿Gratis tiene límite de tiempo?", answer: "No. El plan Gratis cuesta USD 0 y no vence. Incluye Visión, Metas, Hábitos y registro, Mi día y Dashboard." },
      { question: "¿Necesito tarjeta para empezar?", answer: "No. Puedes crear tu cuenta Gratis sin registrar una tarjeta ni un método de pago." },
      { question: "¿Qué incluye Premium?", answer: "Premium incluye todo lo de Gratis y añade Fitness y alimentación, Finanzas, Análisis avanzado del progreso y Recomendaciones para ti." },
      { question: "¿Cuánto cuesta Premium?", answer: "Premium cuesta USD 2,99 al mes o USD 29,99 al año. Tú eliges la modalidad antes de salir al checkout." },
      { question: "¿Cómo funciona la recompensa de 30 días?", answer: "Usa My Best Version durante 30 días consecutivos y recibe 30 días Premium gratis. Para sumar un día, guarda al menos una acción en Visión, Metas, Hábitos o Mi día." },
      { question: "¿Qué cuenta como un día de uso?", answer: "Cuenta una fecha en la que, con tu sesión iniciada, guardas una acción real: crear o actualizar tu Visión o una Meta, registrar un Hábito, o crear, actualizar o completar una acción con fecha en Mi día. Abrir la app o visitar la landing no cuenta." },
      { question: "¿Qué pasa si interrumpo la continuidad?", answer: "Tus datos y avances permanecen. La secuencia actual vuelve a empezar con tu siguiente día válido; varios registros el mismo día siguen contando como una sola fecha." },
      { question: "¿Los 30 días Premium se renuevan automáticamente?", answer: "No. La recompensa no registra un cobro automático. Al terminar, puedes seguir con Gratis o comprar Premium mensual o anual." },
      { question: "¿Cómo compro Premium?", answer: "Elige Comprar mensual o Comprar anual. El pago ocurre en Mercado Pago y el acceso se actualiza sólo después de que su estado queda confirmado.", checkout: true },
      { question: "¿Cómo funcionan la renovación y la cancelación?", answer: "Cuando la contratación está habilitada, Mercado Pago crea una suscripción automática con el intervalo que elegiste. Cada nuevo período requiere un pago confirmado. Puedes consultar fechas y estado en Mi plan y solicitar la cancelación desde la sección de Suscripciones y pagos; una cancelación programada conserva el acceso hasta el final del período ya pagado." },
      { question: "¿Mis registros se sincronizan entre dispositivos?", answer: "No. El contenido detallado de tu espacio permanece guardado localmente en el navegador de este dispositivo." },
    ],
  },
  footer: {
    tagline: "UNA VIDA MÁS TUYA",
    product: "Producto",
    account: "Cuenta",
    legal: "Legal",
    privacy: "Privacidad",
    terms: "Términos",
    cookies: "Cookies",
    pqr: "PQR y soporte",
    copyright: "© 2026 My Best Version. Todos los derechos reservados.",
  },
  accessibility: {
    skipLink: "Saltar al contenido",
    brandHome: "My Best Version — inicio",
    primaryNavigation: "Navegación principal",
    mobileNavigation: "Navegación móvil",
    menuOpen: "Abrir menú",
    menuClose: "Cerrar menú",
    purchaseOptions: "Opciones de compra Premium",
    comparisonAvailable: "Incluido",
    comparisonUnavailable: "No incluido",
    screenshotGroup: "Capturas reales del producto",
  },
};

const en: LandingContent = {
  ...es,
  language: "en",
  promo: "Use My Best Version for 30 consecutive days and receive 30 Premium days free",
  navigation: [
    { id: "como-funciona", label: "How it works" },
    { id: "que-incluye", label: "What's included" },
    { id: "beneficios", label: "Benefits" },
    { id: "planes", label: "Plans" },
    { id: "faq", label: "FAQ" },
  ],
  actions: {
    start: "Start for free",
    login: "Sign in",
    included: "See what's included",
    openSpace: "Open my space",
    plans: "See Premium plans",
    monthlyCheckout: "Buy monthly",
    annualCheckout: "Buy annual",
  },
  hero: {
    eyebrow: "VISION · GOALS · HABITS · YOUR DAY",
    title: "Your best version",
    accent: "starts here",
    paragraphs: ["Organize your plans, choose what matters and find your next step for today. A space to shape your goals, organize your tasks and recognize your progress at your own pace.", "Start with Free and build a personal practice you can sustain at your own pace."],
    trust: "Free · USD 0 · No card",
    visualAlt: "Example My Day view with three priorities and organized tasks",
  },
  benefits: {
    eyebrow: "CLARITY FOR REAL LIFE",
    title: "More clarity to organize life your way",
    description: "Practical benefits that help you return to what matters without adding more noise.",
    items: [
      { title: "Fewer loose ends on your mind", description: "Bring together what you want to do in one place you can return to.", icon: "check" },
      { title: "A starting point for today", description: "Choose your priorities without having to solve the whole week at once.", icon: "target" },
      { title: "Plans that are not forgotten", description: "Return to your goals and decide what concrete action you want to give them today.", icon: "calendar" },
      { title: "Progress you can recognize", description: "See what you completed and the habits you logged, not only what remains.", icon: "chart" },
      { title: "Room for how you feel", description: "Include your mood and reflection in the way you organize your day.", icon: "journal" },
    ],
  },
  problemSolution: {
    eyebrow: "LESS SCATTER, MORE CLARITY",
    title: "One place to return to what matters",
    description: "You do not need to have everything figured out to move forward intentionally.",
    problemLabel: "WHEN EVERYTHING COMPETES",
    problemTitle: "It is easy to lose sight of your direction",
    problemItems: ["Your goals are separate from what you do each day.", "Habit tracking becomes another obligation.", "Progress is hard to recognize when it is scattered.", "A pause can feel like starting over."],
    solutionLabel: "WITH MY BEST VERSION",
    solutionTitle: "Your direction stays close to your days",
    solutionItems: ["Define the vision you want to keep present.", "Shape clear, personal goals.", "Track habits with a kinder perspective.", "Choose from My Day and see the whole picture in Dashboard."],
  },
  how: {
    eyebrow: "A SIMPLE JOURNEY",
    title: "From what you want for your life to what you can do today",
    description: "You do not need to have everything figured out to begin. Start with a goal, a priority or one small action.",
    example: "For example, you can move from “I want to get back to reading” to one concrete action: “Read for 20 minutes today.”",
    steps: [
      { title: "Give it direction", description: "Put into words what you want for yourself and define the goals you would like to work on.", icon: "eye" },
      { title: "Make room in your plans", description: "Organize your goals and actions in planning so you can decide what to focus on and when.", icon: "calendar" },
      { title: "Choose what matters today", description: "Select your priorities, review your tasks and log what you complete.", icon: "check" },
      { title: "Review and adjust at your pace", description: "Look at your progress, habits and how you have felt to decide what to keep and what to change.", icon: "chart" },
    ],
  },
  included: {
    eyebrow: "PRODUCT TOOLS",
    title: "A space for your plans and everyday life",
    description: "Bring together spaces for guiding your plans, taking action and reviewing your journey.",
    items: [
      { title: "Vision and goals", description: "Define what you want to build and keep what matters to you in view.", icon: "target" },
      { title: "Planning", description: "Give your goals and actions a place in the app's planning spaces.", icon: "calendar" },
      { title: "Priorities and tasks", description: "Decide what deserves your attention today and bring together what you need to do.", icon: "check" },
      { title: "Habits", description: "Log the small actions you want to maintain and review their history.", icon: "repeat" },
      { title: "Wellbeing and reflection", description: "Note how you feel and save what you want to remember from your day.", icon: "journal" },
      { title: "Progress", description: "Review your records and recognize what you have completed.", icon: "chart" },
    ],
    secondaryLabel: "ALSO IN PREMIUM",
    secondaryDescription: "Complementary tools for logging other areas without changing the main focus of your day.",
    secondaryItems: [
      { title: "Nutrition", description: "Log and review your meals by day.", icon: "leaf" },
      { title: "Training", description: "Log strength, cardio or sports sessions by date.", icon: "fitness" },
      { title: "Finances", description: "Bring together accounts, transactions and budgets to review your personal finances.", icon: "wallet" },
    ],
  },
  showcase: {
    eyebrow: "REAL PRODUCT",
    title: "How a more personal day comes together",
    description: "From what you want to do to what you do today. See how you can choose your priorities, organize your actions and recognize what you are building.",
    selectorLabel: "Ways to use My Best Version",
    exampleLabel: "Example view",
    moments: [
      { id: "today", marker: "A", label: "Choose what to do today", title: "Choose what to do today", description: "Put what deserves your attention first. Choose up to three priorities, review your tasks and mark what you completed.", alt: "Example My Day view with three priorities and organized tasks" },
      { id: "planning", marker: "B", label: "Give your plans a place", title: "Give your plans a place", description: "Turn your intentions into concrete plans and distribute your actions so they do not remain only an idea.", alt: "Example weekly planning view with priorities, tasks and habits distributed by day" },
      { id: "wellbeing", marker: "C", label: "Organize with how you feel in mind", title: "Organize with how you feel in mind", description: "Log your habits and pause to notice your mood and energy. Your organization can also take into account how you feel today.", alt: "Example view of the daily mood and energy check-in" },
      { id: "progress", marker: "D", label: "Recognize what moved forward", title: "Recognize what moved forward", description: "Return to what you did. Review your actions and records to recognize your progress and decide what to keep or adjust.", alt: "Example Progress view with completed tasks and habit records calculated by the app" },
    ],
  },
  premium: {
    eyebrow: "MORE TOOLS, WHEN YOU WANT THEM",
    title: "Premium expands your experience",
    description: "Keep everything included in Free and add four spaces for more areas of life.",
    availableLabel: "Premium",
    items: [
      { title: "Fitness and nutrition", description: "Log workouts, meals and measurements inside your personal space.", detail: "Your records stay under your control and do not replace professional guidance.", icon: "fitness" },
      { title: "Finances", description: "Organize accounts, transactions, budgets, funds and financial goals.", detail: "My Best Version does not connect to your bank or provide financial advice.", icon: "wallet" },
      { title: "Advanced progress analysis", description: "Go deeper into patterns and trends to understand your journey.", detail: "Use signals from your own records to support review and adjustment.", icon: "chart" },
      { title: "Recommendations for you", description: "Receive relevant suggestions based on your progress and what you choose to record.", detail: "You keep the final judgment and decision over every suggestion.", icon: "sparkles" },
    ],
  },
  pricing: {
    eyebrow: "PLANS",
    title: "Choose how you want to begin",
    description: "Free costs nothing. Premium is an explicit monthly or annual purchase.",
    freeName: "Free",
    freePrice: "USD 0",
    freePeriod: "no expiration",
    freeDescription: "Start with the essential tools and discover your own way forward.",
    freeIncludesLabel: "Includes",
    freeIncludes: ["Vision", "Goals", "Habits and logs", "My Day", "Dashboard"],
    freeTrust: "No card · No automatic charges",
    premiumName: "Premium",
    premiumDescription: "Everything in Free, plus tools for wellbeing, finances and a deeper view of your progress.",
    monthlyLabel: "Monthly Premium",
    annualLabel: "Annual Premium",
    monthlyPrice: offerPrice("monthly", "en"),
    annualPrice: offerPrice("annual", "en"),
    premiumIncludesLabel: "Includes",
    premiumIncludes: [
      { title: "Everything included in Free" },
      { title: "Fitness and nutrition" },
      { title: "Finances" },
      { title: "Advanced progress analysis" },
      { title: "Recommendations for you" },
    ],
    checkoutNote: "Payment takes place in Mercado Pago. Returning from checkout does not activate Premium automatically; access changes only after the payment status is confirmed.",
  },
  comparison: {
    eyebrow: "CLEAR COMPARISON",
    title: "Free or Premium: you choose",
    description: "Compare the available offer without planning limits or features announced as future work.",
    featureLabel: "Feature",
    freeLabel: "Free · USD 0",
    premiumLabel: "Premium",
    rows: [
      { feature: "Vision", free: true, premium: true },
      { feature: "Goals", free: true, premium: true },
      { feature: "Habits and logs", free: true, premium: true },
      { feature: "My Day", free: true, premium: true },
      { feature: "Dashboard", free: true, premium: true },
      { feature: "Fitness and nutrition", free: false, premium: true },
      { feature: "Finances", free: false, premium: true },
      { feature: "Advanced progress analysis", free: false, premium: true },
      { feature: "Recommendations for you", free: false, premium: true },
    ],
  },
  reward: {
    titleLines: ["Your consistency", "has a reward"],
    descriptionLines: [
      "Use My Best Version for 30 consecutive days",
      "and receive 30 Premium days free.",
    ],
    cta: "Start for free",
    facts: [
      { icon: "calendar", lines: ["30 consecutive", "days"] },
      { icon: "crown", lines: ["30 Premium", "days"] },
      { icon: "heart", lines: ["At no cost"] },
    ],
    note: "To add a day, save at least one action in Vision, Goals, Habits or My Day.",
  },
  finalCta: {
    eyebrow: "YOUR PROCESS CAN START TODAY",
    title: "Start with the essentials",
    description: "Create your Free account, discover your rhythm and decide later whether Premium makes sense for you.",
  },
  faq: {
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    title: "Everything clear before you start",
    description: "Prices, features and the reward explained without fine print.",
    items: [
      { question: "Does Free have a time limit?", answer: "No. Free costs USD 0 and does not expire. It includes Vision, Goals, Habits and logs, My Day and Dashboard." },
      { question: "Do I need a card to start?", answer: "No. You can create a Free account without registering a card or payment method." },
      { question: "What does Premium include?", answer: "Premium includes everything in Free, plus Fitness and nutrition, Finances, Advanced progress analysis and Recommendations for you." },
      { question: "How much does Premium cost?", answer: "Premium costs USD 2.99 per month or USD 29.99 per year. You choose the billing option before leaving for checkout." },
      { question: "How does the 30-day reward work?", answer: "Use My Best Version for 30 consecutive days and receive 30 Premium days free. To add a day, save at least one action in Vision, Goals, Habits or My Day." },
      { question: "What counts as a day of use?", answer: "A date counts when, while signed in, you save a real action: create or update your Vision or a Goal, log a Habit, or create, update or complete a dated My Day action. Opening the app or visiting the landing page does not count." },
      { question: "What happens if I break the streak?", answer: "Your data and progress remain. The current sequence starts again on your next valid day; multiple records on the same day still count as one date." },
      { question: "Do the 30 Premium days renew automatically?", answer: "No. The reward does not create an automatic charge. When it ends, you can stay on Free or buy monthly or annual Premium." },
      { question: "How do I buy Premium?", answer: "Choose Buy monthly or Buy annual. Payment takes place in Mercado Pago and access updates only after its status is confirmed.", checkout: true },
      { question: "How do renewal and cancellation work?", answer: "When purchasing is enabled, Mercado Pago creates an automatic subscription for the interval you chose. Every new period requires a confirmed payment. You can review dates and status in My plan and request cancellation from Subscriptions and payments; a scheduled cancellation keeps access through the paid period." },
      { question: "Do my records sync across devices?", answer: "No. The detailed content of your space remains stored locally in this device's browser." },
    ],
  },
  footer: { tagline: "A LIFE THAT FEELS MORE YOURS", product: "Product", account: "Account", legal: "Legal", privacy: "Privacy", terms: "Terms", cookies: "Cookies", pqr: "Support", copyright: "© 2026 My Best Version. All rights reserved." },
  accessibility: { skipLink: "Skip to content", brandHome: "My Best Version — home", primaryNavigation: "Primary navigation", mobileNavigation: "Mobile navigation", menuOpen: "Open menu", menuClose: "Close menu", purchaseOptions: "Premium purchase options", comparisonAvailable: "Included", comparisonUnavailable: "Not included", screenshotGroup: "Real product screenshots" },
};

export const landingContent = { es, en } satisfies Record<Language, LandingContent>;
