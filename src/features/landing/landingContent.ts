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

export interface LandingContent {
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
  how: { eyebrow: string; title: string; description: string; steps: LandingFeature[] };
  included: { eyebrow: string; title: string; description: string; items: LandingFeature[] };
  showcase: { eyebrow: string; title: string; description: string; dashboardAlt: string; todayAlt: string; habitsAlt: string; labels: string[] };
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
    eyebrow: string;
    title: string;
    description: string;
    steps: Array<{ title: string; description: string }>;
    note: string;
  };
  finalCta: { eyebrow: string; title: string; description: string };
  faq: { eyebrow: string; title: string; description: string; items: Array<{ question: string; answer: string; checkout?: boolean }> };
  footer: { tagline: string; product: string; account: string; legal: string; privacy: string; terms: string; cookies: string; pqr: string; copyright: string };
  accessibility: { menuOpen: string; menuClose: string; purchaseOptions: string; comparisonAvailable: string; comparisonUnavailable: string; screenshotGroup: string };
}

const es: LandingContent = {
  promo: "Usa Gratis 30 días consecutivos y recibe 30 días Premium tras la activación del equipo",
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
      "Reúne tu visión, tus metas y tus hábitos para elegir con claridad qué merece tu atención hoy.",
      "Empieza con Gratis y construye una práctica personal que puedas sostener a tu ritmo.",
    ],
    trust: "Gratis · USD 0 · Sin tarjeta",
    visualAlt: "Vistas reales de Dashboard, Mi día y Hábitos en My Best Version",
  },
  benefits: {
    eyebrow: "CLARIDAD PARA TU VIDA REAL",
    title: "Lo importante, visible y conectado",
    description: "Un espacio sereno para convertir intención en pequeños avances que sí puedes reconocer.",
    items: [
      { title: "Empieza sin costo", description: "Crea tu cuenta Gratis por USD 0, sin tarjeta ni vencimiento del acceso Gratis.", icon: "leaf" },
      { title: "Vuelve a tu dirección", description: "Mantén tu visión y tus metas cerca cuando necesites decidir qué hacer hoy.", icon: "eye" },
      { title: "Registra sin culpa", description: "Lleva tus hábitos y reconoce la constancia sin castigar las pausas.", icon: "repeat" },
      { title: "Mira lo que avanza", description: "Tu Dashboard reúne señales claras para que puedas continuar con perspectiva.", icon: "chart" },
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
    title: "De lo que quieres a lo que haces hoy",
    description: "Gratis reúne las piezas esenciales para que tu dirección no se pierda en el día a día.",
    steps: [
      { title: "Visión", description: "Expresa la vida que quieres construir.", icon: "eye" },
      { title: "Metas", description: "Convierte esa dirección en resultados claros.", icon: "target" },
      { title: "Hábitos", description: "Registra acciones repetibles a tu propio ritmo.", icon: "repeat" },
      { title: "Mi día", description: "Elige qué merece tu atención hoy.", icon: "check" },
      { title: "Dashboard", description: "Mira el conjunto y reconoce tu avance.", icon: "chart" },
    ],
  },
  included: {
    eyebrow: "INCLUIDO EN GRATIS",
    title: "Empieza con lo esencial por USD 0",
    description: "Tu acceso Gratis reúne cinco espacios para orientar, actuar y registrar tu proceso.",
    items: [
      { title: "Visión", description: "Conserva una dirección personal que dé contexto a tus decisiones.", icon: "eye" },
      { title: "Metas", description: "Define objetivos y resultados que tengan sentido para ti.", icon: "target" },
      { title: "Hábitos y registro", description: "Crea hábitos y registra lo que realizaste sin juicios ni castigos.", icon: "repeat" },
      { title: "Mi día", description: "Encuentra una vista clara para volver a lo importante cada día.", icon: "check" },
      { title: "Dashboard", description: "Observa en un mismo lugar el estado general de tu proceso.", icon: "home" },
    ],
  },
  showcase: {
    eyebrow: "PRODUCTO REAL",
    title: "Conoce la experiencia de My Best Version",
    description: "Una interfaz serena para ver tu dirección, elegir lo importante y registrar lo que sí hiciste.",
    dashboardAlt: "Dashboard real de My Best Version en escritorio",
    todayAlt: "Vista real de Mi día en móvil",
    habitsAlt: "Vista real de Hábitos en escritorio",
    labels: ["Dashboard", "Mi día", "Hábitos"],
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
    eyebrow: "30 DÍAS PREMIUM POR TU CONSTANCIA",
    title: "Tu recorrido de Gratis a Premium",
    description: "La recompensa no se activa al registrarte. Primero completas 30 días consecutivos de uso y el equipo revisa la alerta.",
    steps: [
      { title: "Empieza en Gratis", description: "Crea tu cuenta por USD 0 y usa las funciones incluidas." },
      { title: "Completa 30 días consecutivos", description: "Guarda cada día al menos una acción real en Visión, Metas, Hábitos o Mi día." },
      { title: "El equipo recibe una alerta", description: "El hito se envía a revisión; no se activa Premium de forma automática." },
      { title: "Recibe 30 días Premium", description: "Después de la activación del equipo, disfrutas 30 días Premium sin costo." },
    ],
    note: "Gratis → 30 días consecutivos → alerta al equipo → activación → 30 días Premium",
  },
  finalCta: {
    eyebrow: "TU PROCESO PUEDE EMPEZAR HOY",
    title: "Empieza con lo esencial",
    description: "Crea tu cuenta Gratis, conoce tu ritmo y decide más adelante si Premium tiene sentido para ti.",
  },
  faq: {
    eyebrow: "PREGUNTAS FRECUENTES",
    title: "Todo claro antes de empezar",
    description: "Precios, funciones y activación explicados sin letra pequeña.",
    items: [
      { question: "¿Gratis tiene límite de tiempo?", answer: "No. El plan Gratis cuesta USD 0 y no vence. Incluye Visión, Metas, Hábitos y registro, Mi día y Dashboard." },
      { question: "¿Necesito tarjeta para empezar?", answer: "No. Puedes crear tu cuenta Gratis sin registrar una tarjeta ni un método de pago." },
      { question: "¿Qué incluye Premium?", answer: "Premium incluye todo lo de Gratis y añade Fitness y alimentación, Finanzas, Análisis avanzado del progreso y Recomendaciones para ti." },
      { question: "¿Cuánto cuesta Premium?", answer: "Premium cuesta USD 2,99 al mes o USD 29,99 al año. Tú eliges la modalidad antes de salir al checkout." },
      { question: "¿Cómo funciona la recompensa de 30 días?", answer: "Empiezas en Gratis. Cuando completas 30 días consecutivos de uso, el equipo recibe una alerta, revisa el hito y puede activar 30 días Premium sin costo. No se activa al registrarte ni de forma automática." },
      { question: "¿Qué cuenta como un día de uso?", answer: "Cuenta una fecha en la que, con tu sesión iniciada, guardas una acción real: crear o actualizar tu Visión o una Meta, registrar un Hábito, o crear, actualizar o completar una acción con fecha en Mi día. Abrir la app o visitar la landing no cuenta." },
      { question: "¿Qué pasa si interrumpo la continuidad?", answer: "Tus datos y avances permanecen. La secuencia actual vuelve a empezar con tu siguiente día válido; varios registros el mismo día siguen contando como una sola fecha." },
      { question: "¿Cuándo empiezan mis 30 días Premium?", answer: "Empiezan cuando el equipo revisa la alerta y activa el beneficio, no cuando completas el requisito. Desde esa activación recibes 30 días completos y el beneficio se concede una sola vez para esta campaña." },
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
  promo: "Use Free for 30 consecutive days and receive 30 Premium days after team activation",
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
    paragraphs: ["Bring your vision, goals and habits together so you can clearly choose what deserves your attention today.", "Start with Free and build a personal practice you can sustain at your own pace."],
    trust: "Free · USD 0 · No card",
    visualAlt: "Real My Best Version Dashboard, My Day and Habits views",
  },
  benefits: {
    eyebrow: "CLARITY FOR REAL LIFE",
    title: "Keep what matters visible and connected",
    description: "A calm space for turning intention into small steps you can recognize.",
    items: [
      { title: "Start at no cost", description: "Create a Free USD 0 account with no card and no expiration for Free access.", icon: "leaf" },
      { title: "Return to your direction", description: "Keep your vision and goals close when you need to decide what to do today.", icon: "eye" },
      { title: "Log without guilt", description: "Track habits and recognize consistency without punishing pauses.", icon: "repeat" },
      { title: "See what is moving", description: "Your Dashboard brings together clear signals so you can continue with perspective.", icon: "chart" },
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
    title: "From what you want to what you do today",
    description: "Free brings together the essentials so your direction does not get lost in daily life.",
    steps: [
      { title: "Vision", description: "Express the life you want to build.", icon: "eye" },
      { title: "Goals", description: "Turn that direction into clear outcomes.", icon: "target" },
      { title: "Habits", description: "Log repeatable actions at your own pace.", icon: "repeat" },
      { title: "My Day", description: "Choose what deserves your attention today.", icon: "check" },
      { title: "Dashboard", description: "See the whole and recognize your progress.", icon: "chart" },
    ],
  },
  included: {
    eyebrow: "INCLUDED IN FREE",
    title: "Start with the essentials for USD 0",
    description: "Free access brings together five spaces for direction, action and reflection.",
    items: [
      { title: "Vision", description: "Keep a personal direction that gives context to your decisions.", icon: "eye" },
      { title: "Goals", description: "Define goals and outcomes that matter to you.", icon: "target" },
      { title: "Habits and logs", description: "Create habits and log what you did without judgment or punishment.", icon: "repeat" },
      { title: "My Day", description: "Return to a clear view of what matters each day.", icon: "check" },
      { title: "Dashboard", description: "See the overall state of your process in one place.", icon: "home" },
    ],
  },
  showcase: {
    eyebrow: "REAL PRODUCT",
    title: "Discover the My Best Version experience",
    description: "A calm interface to see your direction, choose what matters and log what you did.",
    dashboardAlt: "Real My Best Version dashboard on desktop",
    todayAlt: "Real My Day view on mobile",
    habitsAlt: "Real Habits view on desktop",
    labels: ["Dashboard", "My Day", "Habits"],
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
    eyebrow: "30 PREMIUM DAYS FOR YOUR CONSISTENCY",
    title: "Your journey from Free to Premium",
    description: "The reward does not activate when you sign up. First complete 30 consecutive days of use, then the team reviews the alert.",
    steps: [
      { title: "Start on Free", description: "Create your USD 0 account and use the included features." },
      { title: "Complete 30 consecutive days", description: "Each day, save at least one real action in Vision, Goals, Habits or My Day." },
      { title: "The team receives an alert", description: "The milestone goes to review; Premium is not activated automatically." },
      { title: "Receive 30 Premium days", description: "After team activation, enjoy 30 Premium days at no cost." },
    ],
    note: "Free → 30 consecutive days → team alert → activation → 30 Premium days",
  },
  finalCta: {
    eyebrow: "YOUR PROCESS CAN START TODAY",
    title: "Start with the essentials",
    description: "Create your Free account, discover your rhythm and decide later whether Premium makes sense for you.",
  },
  faq: {
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    title: "Everything clear before you start",
    description: "Prices, features and activation explained without fine print.",
    items: [
      { question: "Does Free have a time limit?", answer: "No. Free costs USD 0 and does not expire. It includes Vision, Goals, Habits and logs, My Day and Dashboard." },
      { question: "Do I need a card to start?", answer: "No. You can create a Free account without registering a card or payment method." },
      { question: "What does Premium include?", answer: "Premium includes everything in Free, plus Fitness and nutrition, Finances, Advanced progress analysis and Recommendations for you." },
      { question: "How much does Premium cost?", answer: "Premium costs USD 2.99 per month or USD 29.99 per year. You choose the billing option before leaving for checkout." },
      { question: "How does the 30-day reward work?", answer: "You start on Free. After 30 consecutive days of use, the team receives an alert, reviews the milestone and may activate 30 Premium days at no cost. It does not activate at registration or automatically." },
      { question: "What counts as a day of use?", answer: "A date counts when, while signed in, you save a real action: create or update your Vision or a Goal, log a Habit, or create, update or complete a dated My Day action. Opening the app or visiting the landing page does not count." },
      { question: "What happens if I break the streak?", answer: "Your data and progress remain. The current sequence starts again on your next valid day; multiple records on the same day still count as one date." },
      { question: "When do my 30 Premium days begin?", answer: "They begin when the team reviews the alert and activates the benefit, not when you complete the requirement. You then receive 30 full days, once for this campaign." },
      { question: "Do the 30 Premium days renew automatically?", answer: "No. The reward does not create an automatic charge. When it ends, you can stay on Free or buy monthly or annual Premium." },
      { question: "How do I buy Premium?", answer: "Choose Buy monthly or Buy annual. Payment takes place in Mercado Pago and access updates only after its status is confirmed.", checkout: true },
      { question: "How do renewal and cancellation work?", answer: "When purchasing is enabled, Mercado Pago creates an automatic subscription for the interval you chose. Every new period requires a confirmed payment. You can review dates and status in My plan and request cancellation from Subscriptions and payments; a scheduled cancellation keeps access through the paid period." },
      { question: "Do my records sync across devices?", answer: "No. The detailed content of your space remains stored locally in this device's browser." },
    ],
  },
  footer: { tagline: "A LIFE THAT FEELS MORE YOURS", product: "Product", account: "Account", legal: "Legal", privacy: "Privacy", terms: "Terms", cookies: "Cookies", pqr: "Support", copyright: "© 2026 My Best Version. All rights reserved." },
  accessibility: { menuOpen: "Open menu", menuClose: "Close menu", purchaseOptions: "Premium purchase options", comparisonAvailable: "Included", comparisonUnavailable: "Not included", screenshotGroup: "Real product screenshots" },
};

export const landingContent = { es, en } satisfies Record<Language, LandingContent>;
