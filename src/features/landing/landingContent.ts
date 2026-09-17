import type { Language } from "@/src/stores/useUiStore";

export type LandingIconName = "leaf" | "home" | "target" | "chart" | "eye" | "calendar" | "repeat" | "check" | "journal" | "wallet" | "fitness" | "sparkles" | "brain";
export type FeatureAvailability = "available" | "coming_soon";

export interface LandingFeature {
  title: string;
  description: string;
  icon: LandingIconName;
}

export interface PremiumLandingFeature extends LandingFeature {
  availability: FeatureAvailability;
  detail: string;
}

export interface ComparisonRow {
  feature: string;
  trial: boolean | "coming_soon";
  premium: boolean | "coming_soon";
}

export interface LandingContent {
  promo: string;
  navigation: Array<{ id: "como-funciona" | "que-incluye" | "beneficios" | "planes" | "faq"; label: string }>;
  actions: { start: string; login: string; included: string; openSpace: string; checkout: string };
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
  premium: { eyebrow: string; title: string; description: string; availableLabel: string; comingSoonLabel: string; items: PremiumLandingFeature[] };
  pricing: {
    eyebrow: string;
    title: string;
    description: string;
    monthly: string;
    annual: string;
    trialName: string;
    trialPrice: string;
    trialPeriod: string;
    trialDescription: string;
    trialIncludesLabel: string;
    trialExcludesLabel: string;
    trialIncludes: string[];
    trialExcludes: string[];
    trialTrust: string;
    premiumName: string;
    premiumDescription: string;
    monthlyPrice: string;
    annualPrice: string;
    premiumIncludesLabel: string;
    premiumIncludes: Array<{ title: string; detail?: string }>;
    premiumComingSoonLabel: string;
    premiumComingSoon: string[];
    checkoutNote: string;
  };
  comparison: { eyebrow: string; title: string; description: string; featureLabel: string; trialLabel: string; premiumLabel: string; comingSoon: string; rows: ComparisonRow[] };
  afterTrial: { eyebrow: string; title: string; paragraphs: string[]; note: string };
  finalCta: { eyebrow: string; title: string; description: string };
  faq: { eyebrow: string; title: string; description: string; items: Array<{ question: string; answer: string; checkout?: boolean }> };
  footer: { tagline: string; product: string; account: string; legal: string; privacy: string; terms: string; cookies: string; pqr: string; copyright: string };
  accessibility: { menuOpen: string; menuClose: string; pricingSelector: string; comparisonAvailable: string; comparisonUnavailable: string; screenshotGroup: string };
}

const es: LandingContent = {
  promo: "15 días gratis · Sin tarjeta · Sin cobros automáticos",
  navigation: [
    { id: "como-funciona", label: "Cómo funciona" },
    { id: "que-incluye", label: "Qué incluye" },
    { id: "beneficios", label: "Beneficios" },
    { id: "planes", label: "Planes" },
    { id: "faq", label: "FAQ" },
  ],
  actions: { start: "Comienza tu prueba gratis", login: "Iniciar sesión", included: "Ver qué incluye", openSpace: "Ir a mi espacio", checkout: "Activar Premium" },
  hero: {
    eyebrow: "PLANIFICA · CREA HÁBITOS · AVANZA CON INTENCIÓN",
    title: "Tu mejor versión",
    accent: "empieza aquí",
    paragraphs: [
      "My Best Version conecta tus metas, hábitos y planificación diaria en un solo lugar.",
      "Una forma más clara y amable de avanzar en la vida que quieres construir.",
    ],
    trust: "15 días gratis · Sin tarjeta · Sin cobros automáticos",
    visualAlt: "Vista real de My Best Version en computador y móvil",
  },
  benefits: {
    eyebrow: "MÁS QUE UNA HERRAMIENTA, UNA FORMA DE AVANZAR",
    title: "Todo lo que necesitas, en un solo lugar",
    description: "De la visión a la acción, con herramientas simples para avanzar sin convertir tu vida en otra lista interminable.",
    items: [
      { title: "No es solo un habit tracker", description: "Conecta visión, objetivos, hábitos, planificación y progreso dentro del mismo sistema.", icon: "leaf" },
      { title: "Todo en un solo lugar", description: "Reduce la dispersión entre notas, calendarios, listas y trackers separados.", icon: "home" },
      { title: "De tu visión a tu día", description: "Convierte lo que quieres construir en acciones concretas que puedas sostener hoy.", icon: "target" },
      { title: "Progreso amable y sostenible", description: "Haz visible lo que sí avanzó, ajusta lo que no funcionó y continúa sin empezar de cero.", icon: "chart" },
    ],
  },
  problemSolution: {
    eyebrow: "DE LA DISPERSIÓN A UNA VIDA CON SENTIDO",
    title: "Menos herramientas, más vida real",
    description: "Organizarte debería darte claridad, no convertirse en otra tarea que mantener.",
    problemLabel: "EL PROBLEMA",
    problemTitle: "Demasiadas herramientas, poca claridad",
    problemItems: [
      "Usas diferentes apps para tareas, notas, hábitos y calendario.",
      "Tu información termina dispersa.",
      "Es difícil saber qué merece tu atención hoy.",
      "Mantener varios sistemas consume energía.",
      "Terminas organizando más de lo que avanzas.",
    ],
    solutionLabel: "LA SOLUCIÓN",
    solutionTitle: "My Best Version, todo en un solo lugar",
    solutionItems: [
      "Conecta tus metas con acciones concretas.",
      "Integra hábitos, tareas, planificación y progreso.",
      "Te ayuda a decidir qué importa hoy.",
      "Mantiene tus diferentes áreas de vida conectadas.",
      "Convierte intención en un sistema que puedes sostener.",
    ],
  },
  how: {
    eyebrow: "UN SISTEMA CONECTADO",
    title: "De tu gran visión a tus acciones diarias",
    description: "Lo que haces hoy tiene más sentido cuando sabes con qué lo estás conectando.",
    steps: [
      { title: "Visión", description: "Define la vida que quieres construir.", icon: "eye" },
      { title: "Objetivos", description: "Convierte tu visión en objetivos claros.", icon: "target" },
      { title: "Planificación", description: "Decide cuándo y cómo avanzar.", icon: "calendar" },
      { title: "Semanas", description: "Elige prioridades que realmente puedas sostener.", icon: "repeat" },
      { title: "Días", description: "Actúa sobre lo que importa hoy.", icon: "check" },
      { title: "Progreso", description: "Reconoce lo que avanzó y ajusta el camino.", icon: "chart" },
    ],
  },
  included: {
    eyebrow: "TODO CONECTA",
    title: "Más que tareas o hábitos",
    description: "Un sistema conectado para organizar lo que quieres construir y lo que realmente haces cada día.",
    items: [
      { title: "Visión", description: "Define lo que quieres construir y mantén el contexto de tus decisiones.", icon: "eye" },
      { title: "Objetivos", description: "Transforma tus intenciones en objetivos claros y accionables.", icon: "target" },
      { title: "Planificación", description: "Organiza tus próximos meses, semanas y días.", icon: "calendar" },
      { title: "Hábitos", description: "Construye acciones repetibles sin convertir una interrupción en fracaso.", icon: "repeat" },
      { title: "Tareas", description: "Captura, organiza y reprograma lo que necesitas hacer.", icon: "check" },
      { title: "Progreso", description: "Mira lo que sí avanzó y entiende qué conviene ajustar.", icon: "chart" },
      { title: "Journal y reflexión", description: "Registra aprendizajes, revisiones y momentos importantes.", icon: "journal" },
      { title: "Finanzas", description: "Organiza presupuestos, movimientos y metas financieras sin conectar tus bancos.", icon: "wallet" },
    ],
  },
  showcase: {
    eyebrow: "PRODUCTO REAL",
    title: "Conoce la experiencia de My Best Version",
    description: "Una interfaz serena para ver tu dirección, elegir lo importante y reconocer lo que sí avanzó.",
    dashboardAlt: "Dashboard real de My Best Version en escritorio",
    todayAlt: "Vista real de Mi día en móvil",
    habitsAlt: "Vista real de Hábitos en escritorio",
    labels: ["Dashboard", "Mi día", "Hábitos"],
  },
  premium: {
    eyebrow: "MÁS PROFUNDIDAD, CUANDO LA NECESITES",
    title: "Cuando quieras ir más lejos, Premium crece contigo",
    description: "No se trata de hacer más. Se trata de conectar más dimensiones de tu vida y entender mejor lo que estás construyendo.",
    availableLabel: "Disponible",
    comingSoonLabel: "Próximamente",
    items: [
      { title: "Fitness y alimentación", description: "Conecta tu bienestar físico y alimentación con el resto de tu planificación, hábitos y objetivos.", detail: "Para que cuidar de ti también forme parte del sistema que estás construyendo.", icon: "fitness", availability: "available" },
      { title: "Entiende mejor tu progreso", description: "Observa patrones, tendencias y avances para descubrir qué te está funcionando y qué conviene ajustar.", detail: "El análisis avanzado está en preparación y no se presenta todavía como una función activa.", icon: "chart", availability: "coming_soon" },
      { title: "Recomendaciones con contexto", description: "Recibe sugerencias basadas en tu progreso y en la información que eliges registrar dentro de My Best Version.", detail: "Las recomendaciones con IA están en preparación; no sustituyen orientación profesional.", icon: "brain", availability: "coming_soon" },
      { title: "Del próximo mes a los próximos años", description: "Conecta tus acciones actuales con una visión de 5 años sin perder de vista lo que importa hoy.", detail: "La planificación a 5 años ya está disponible para cuentas Premium.", icon: "sparkles", availability: "available" },
    ],
  },
  pricing: {
    eyebrow: "PLANES",
    title: "Elige el acceso que se adapta a ti",
    description: "Empieza durante 15 días sin costo. Después tú decides si quieres continuar con My Best Version Premium.",
    monthly: "Mensual",
    annual: "Anual",
    trialName: "Prueba gratis",
    trialPrice: "USD 0",
    trialPeriod: "durante 15 días",
    trialDescription: "Descubre cómo se siente organizar tus objetivos, hábitos y prioridades dentro de un mismo sistema.",
    trialIncludesLabel: "Incluye",
    trialExcludesLabel: "No incluye",
    trialIncludes: ["Dashboard", "Plan del día", "Objetivos", "Hábitos", "Tareas", "Progreso", "Journal y reflexión", "Planificación de hasta 3 meses", "Uso desde desktop, tablet y móvil"],
    trialExcludes: ["Fitness y alimentación", "Análisis avanzado del progreso", "Recomendaciones con IA", "Planificación de 1 año", "Planificación de 5 años"],
    trialTrust: "Sin tarjeta · Sin cobros automáticos",
    premiumName: "Premium",
    premiumDescription: "Amplía tu sistema para cuidar más áreas de tu vida, entender mejor tu progreso y planificar más lejos.",
    monthlyPrice: "USD 2,99 / mes",
    annualPrice: "USD 30,99 / año",
    premiumIncludesLabel: "Disponible hoy",
    premiumIncludes: [
      { title: "Todo lo incluido durante la prueba" },
      { title: "Fitness y alimentación", detail: "Conecta entrenamiento, bienestar y alimentación con tus objetivos y hábitos." },
      { title: "Planificación de 5 años", detail: "Conecta lo que haces hoy con una visión de largo plazo." },
      { title: "Acceso completo a las funciones Premium disponibles" },
    ],
    premiumComingSoonLabel: "En preparación",
    premiumComingSoon: ["Análisis avanzado del progreso", "Recomendaciones con IA", "Planificación específica de 1 año"],
    checkoutNote: "El pago se realiza en Mercado Pago. Volver del checkout no activa Premium automáticamente; el acceso depende de una validación confiable.",
  },
  comparison: {
    eyebrow: "COMPARACIÓN CLARA",
    title: "Compara lo que incluye cada acceso",
    description: "Lo disponible hoy se distingue de lo que todavía está en preparación.",
    featureLabel: "Característica",
    trialLabel: "Prueba 15 días",
    premiumLabel: "Premium",
    comingSoon: "Próximamente",
    rows: [
      { feature: "Dashboard", trial: true, premium: true },
      { feature: "Plan del día", trial: true, premium: true },
      { feature: "Objetivos", trial: true, premium: true },
      { feature: "Hábitos", trial: true, premium: true },
      { feature: "Tareas", trial: true, premium: true },
      { feature: "Progreso", trial: true, premium: true },
      { feature: "Journal y reflexión", trial: true, premium: true },
      { feature: "Planificación 3 meses", trial: true, premium: true },
      { feature: "Fitness y alimentación", trial: false, premium: true },
      { feature: "Análisis avanzado", trial: false, premium: "coming_soon" },
      { feature: "Recomendaciones con IA", trial: false, premium: "coming_soon" },
      { feature: "Planificación específica de 1 año", trial: false, premium: "coming_soon" },
      { feature: "Planificación 5 años", trial: false, premium: true },
    ],
  },
  afterTrial: {
    eyebrow: "TU PROGRESO PERMANECE",
    title: "¿Qué pasa después de los 15 días?",
    paragraphs: [
      "Al terminar tu prueba, tu acceso al tracker se pausará si no has activado Premium.",
      "Todo lo que hayas creado seguirá guardado localmente en este dispositivo para que puedas continuar desde donde quedaste cuando decidas volver.",
    ],
    note: "Tu prueba termina. Tu progreso sigue aquí.",
  },
  finalCta: {
    eyebrow: "TU MEJOR VIDA SE CONSTRUYE UN DÍA A LA VEZ",
    title: "Haz que hoy cuente",
    description: "No tienes que hacerlo todo. Empieza por organizar lo que realmente importa y construye desde ahí.",
  },
  faq: {
    eyebrow: "PREGUNTAS FRECUENTES",
    title: "Todo lo que necesitas saber",
    description: "Condiciones claras antes de empezar.",
    items: [
      { question: "¿Cuánto dura la prueba gratis?", answer: "15 días. Durante ese tiempo puedes utilizar las funciones principales de My Best Version y planificar hasta 3 meses." },
      { question: "¿Necesito tarjeta para comenzar?", answer: "No. No necesitas registrar una tarjeta ni un método de pago para empezar." },
      { question: "¿Me cobrarán automáticamente después de los 15 días?", answer: "No. No realizaremos ningún cobro automático al terminar tu prueba. Tú decides si quieres activar Premium." },
      { question: "¿Qué incluye la prueba?", answer: "La prueba incluye las funciones principales para organizar objetivos, hábitos, tareas, progreso, reflexión y planificación de hasta 3 meses." },
      { question: "¿Qué funciones requieren Premium?", answer: "Fitness y alimentación y la planificación a 5 años están disponibles con Premium. El análisis avanzado, las recomendaciones con IA y la planificación específica de 1 año están en preparación." },
      { question: "¿Fitness y alimentación está incluido durante la prueba?", answer: "No. Fitness y alimentación forma parte de My Best Version Premium." },
      { question: "¿Hasta cuánto puedo planificar durante la prueba?", answer: "Durante la prueba puedes planificar hasta 3 meses. Premium amplía el horizonte disponible hasta 5 años." },
      { question: "¿Qué pasa cuando terminan los 15 días?", answer: "Tu acceso al tracker se pausa. Lo que hayas creado permanece guardado localmente en este dispositivo para que continúes cuando actives Premium." },
      { question: "¿Pierdo mis datos si termina mi prueba?", answer: "No. El final de la prueba no elimina tu progreso local." },
      { question: "¿Cuánto cuesta Premium?", answer: "Premium cuesta USD 2,99 al mes o USD 30,99 al año." },
      { question: "¿Cómo activo Premium?", answer: "Puedes iniciar el pago de forma segura a través de Mercado Pago. El acceso se habilita sólo después de una validación confiable del pago.", checkout: true },
    ],
  },
  footer: {
    tagline: "PLANEA · ACCIONA · LOGRA",
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
    pricingSelector: "Modalidad de Premium",
    comparisonAvailable: "Incluido",
    comparisonUnavailable: "No incluido",
    screenshotGroup: "Capturas reales del producto",
  },
};

const en: LandingContent = {
  ...es,
  promo: "15 days free · No card · No automatic charges",
  navigation: [
    { id: "como-funciona", label: "How it works" },
    { id: "que-incluye", label: "What's included" },
    { id: "beneficios", label: "Benefits" },
    { id: "planes", label: "Plans" },
    { id: "faq", label: "FAQ" },
  ],
  actions: { start: "Start your free trial", login: "Sign in", included: "See what's included", openSpace: "Open my space", checkout: "Activate Premium" },
  hero: {
    eyebrow: "PLAN · BUILD HABITS · MOVE FORWARD INTENTIONALLY",
    title: "Your best version",
    accent: "starts here",
    paragraphs: ["My Best Version brings your goals, habits and daily planning together in one place.", "A clearer, kinder way to move toward the life you want to build."],
    trust: "15 days free · No card · No automatic charges",
    visualAlt: "Real My Best Version views on desktop and mobile",
  },
  benefits: {
    eyebrow: "MORE THAN A TOOL, A WAY TO MOVE FORWARD",
    title: "Everything you need, in one place",
    description: "From vision to action, with simple tools that help you move forward without turning life into another endless list.",
    items: [
      { title: "More than a habit tracker", description: "Connect vision, goals, habits, planning and progress inside one system.", icon: "leaf" },
      { title: "Everything in one place", description: "Reduce the friction of separate notes, calendars, lists and trackers.", icon: "home" },
      { title: "From your vision to today", description: "Turn what you want to build into concrete actions you can sustain today.", icon: "target" },
      { title: "Kind, sustainable progress", description: "Make progress visible, adjust what did not work and continue without starting over.", icon: "chart" },
    ],
  },
  problemSolution: {
    eyebrow: "FROM SCATTERED TO MEANINGFUL",
    title: "Fewer tools, more real life",
    description: "Getting organized should create clarity, not become another system to maintain.",
    problemLabel: "THE PROBLEM",
    problemTitle: "Too many tools, too little clarity",
    problemItems: ["You use different apps for tasks, notes, habits and calendars.", "Your information ends up scattered.", "It is hard to know what deserves your attention today.", "Maintaining several systems takes energy.", "You spend more time organizing than moving forward."],
    solutionLabel: "THE SOLUTION",
    solutionTitle: "My Best Version, all in one place",
    solutionItems: ["Connect goals to concrete actions.", "Bring habits, tasks, planning and progress together.", "Decide what matters today.", "Keep different areas of life connected.", "Turn intention into a system you can sustain."],
  },
  how: {
    eyebrow: "A CONNECTED SYSTEM",
    title: "From your big vision to daily action",
    description: "What you do today feels more meaningful when you know what it connects to.",
    steps: [
      { title: "Vision", description: "Define the life you want to build.", icon: "eye" },
      { title: "Goals", description: "Turn your vision into clear goals.", icon: "target" },
      { title: "Planning", description: "Decide when and how to move forward.", icon: "calendar" },
      { title: "Weeks", description: "Choose priorities you can truly sustain.", icon: "repeat" },
      { title: "Days", description: "Act on what matters today.", icon: "check" },
      { title: "Progress", description: "Recognize what moved and adjust your path.", icon: "chart" },
    ],
  },
  included: {
    eyebrow: "EVERYTHING CONNECTS",
    title: "More than tasks or habits",
    description: "A connected system for organizing what you want to build and what you actually do each day.",
    items: [
      { title: "Vision", description: "Define what you want to build and keep context around your decisions.", icon: "eye" },
      { title: "Goals", description: "Turn intentions into clear, actionable goals.", icon: "target" },
      { title: "Planning", description: "Organize your next months, weeks and days.", icon: "calendar" },
      { title: "Habits", description: "Build repeatable actions without treating interruptions as failure.", icon: "repeat" },
      { title: "Tasks", description: "Capture, organize and reschedule what you need to do.", icon: "check" },
      { title: "Progress", description: "See what moved and understand what to adjust.", icon: "chart" },
      { title: "Journal and reflection", description: "Record insights, reviews and meaningful moments.", icon: "journal" },
      { title: "Finances", description: "Organize budgets, transactions and goals without connecting a bank account.", icon: "wallet" },
    ],
  },
  showcase: {
    eyebrow: "REAL PRODUCT",
    title: "Discover the My Best Version experience",
    description: "A calm interface to see your direction, choose what matters and recognize what moved forward.",
    dashboardAlt: "Real My Best Version dashboard on desktop",
    todayAlt: "Real My Day view on mobile",
    habitsAlt: "Real Habits view on desktop",
    labels: ["Dashboard", "My Day", "Habits"],
  },
  premium: {
    eyebrow: "MORE DEPTH, WHEN YOU NEED IT",
    title: "When you want to go further, Premium grows with you",
    description: "It is not about doing more. It is about connecting more dimensions of your life and understanding what you are building.",
    availableLabel: "Available",
    comingSoonLabel: "Coming soon",
    items: [
      { title: "Fitness and nutrition", description: "Connect physical wellbeing and nutrition to the rest of your planning, habits and goals.", detail: "So caring for yourself can belong to the system you are building.", icon: "fitness", availability: "available" },
      { title: "Understand your progress", description: "Observe patterns, trends and progress to discover what works and what to adjust.", detail: "Advanced analysis is in preparation and is not presented as active yet.", icon: "chart", availability: "coming_soon" },
      { title: "Context-aware recommendations", description: "Receive suggestions based on your progress and the information you choose to record in My Best Version.", detail: "AI recommendations are in preparation and do not replace professional guidance.", icon: "brain", availability: "coming_soon" },
      { title: "From next month to the coming years", description: "Connect current actions to a five-year vision without losing sight of today.", detail: "Five-year planning is available to Premium accounts.", icon: "sparkles", availability: "available" },
    ],
  },
  pricing: {
    ...es.pricing,
    eyebrow: "PLANS",
    title: "Choose the access that fits your life",
    description: "Start with 15 days at no cost. Then you decide whether to continue with My Best Version Premium.",
    monthly: "Monthly",
    annual: "Annual",
    trialName: "Free trial",
    trialPeriod: "for 15 days",
    trialDescription: "Discover what it feels like to organize goals, habits and priorities inside one system.",
    trialIncludesLabel: "Includes",
    trialExcludesLabel: "Does not include",
    trialIncludes: ["Dashboard", "Daily plan", "Goals", "Habits", "Tasks", "Progress", "Journal and reflection", "Planning up to 3 months", "Use on desktop, tablet and mobile"],
    trialExcludes: ["Fitness and nutrition", "Advanced progress analysis", "AI recommendations", "One-year planning", "Five-year planning"],
    trialTrust: "No card · No automatic charges",
    premiumDescription: "Expand your system to care for more areas of life, understand your progress and plan further ahead.",
    monthlyPrice: "USD 2.99 / month",
    annualPrice: "USD 30.99 / year",
    premiumIncludesLabel: "Available today",
    premiumIncludes: [
      { title: "Everything included during the trial" },
      { title: "Fitness and nutrition", detail: "Connect training, wellbeing and nutrition to your goals and habits." },
      { title: "Five-year planning", detail: "Connect what you do today to a long-term vision." },
      { title: "Full access to currently available Premium features" },
    ],
    premiumComingSoonLabel: "In preparation",
    premiumComingSoon: ["Advanced progress analysis", "AI recommendations", "Dedicated one-year planning"],
    checkoutNote: "Payment happens in Mercado Pago. Returning from checkout does not activate Premium automatically; access depends on trusted validation.",
  },
  comparison: {
    ...es.comparison,
    eyebrow: "CLEAR COMPARISON",
    title: "Compare what each access includes",
    description: "What is available today is clearly separated from what is still in preparation.",
    featureLabel: "Feature",
    trialLabel: "15-day trial",
    comingSoon: "Coming soon",
    rows: [
      { feature: "Dashboard", trial: true, premium: true }, { feature: "Daily plan", trial: true, premium: true }, { feature: "Goals", trial: true, premium: true }, { feature: "Habits", trial: true, premium: true }, { feature: "Tasks", trial: true, premium: true }, { feature: "Progress", trial: true, premium: true }, { feature: "Journal and reflection", trial: true, premium: true }, { feature: "Three-month planning", trial: true, premium: true }, { feature: "Fitness and nutrition", trial: false, premium: true }, { feature: "Advanced analysis", trial: false, premium: "coming_soon" }, { feature: "AI recommendations", trial: false, premium: "coming_soon" }, { feature: "Dedicated one-year planning", trial: false, premium: "coming_soon" }, { feature: "Five-year planning", trial: false, premium: true },
    ],
  },
  afterTrial: {
    eyebrow: "YOUR PROGRESS REMAINS",
    title: "What happens after 15 days?",
    paragraphs: ["When your trial ends, access to the tracker pauses if Premium has not been activated.", "Everything you created stays stored locally on this device so you can continue where you left off whenever you return."],
    note: "Your trial ends. Your progress stays here.",
  },
  finalCta: { eyebrow: "YOUR BEST LIFE IS BUILT ONE DAY AT A TIME", title: "Make today count", description: "You do not have to do everything. Start by organizing what truly matters and build from there." },
  faq: {
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    title: "Everything you need to know",
    description: "Clear conditions before you begin.",
    items: [
      { question: "How long is the free trial?", answer: "15 days. During that time you can use the main My Best Version features and plan up to 3 months ahead." },
      { question: "Do I need a card to begin?", answer: "No. You do not need to register a card or payment method to start." },
      { question: "Will I be charged automatically after 15 days?", answer: "No. There is no automatic charge when the trial ends. You decide whether to activate Premium." },
      { question: "What does the trial include?", answer: "The trial includes the main tools for goals, habits, tasks, progress, reflection and planning up to 3 months." },
      { question: "Which features require Premium?", answer: "Fitness and nutrition and five-year planning are available with Premium. Advanced analysis, AI recommendations and dedicated one-year planning are in preparation." },
      { question: "Is fitness and nutrition included in the trial?", answer: "No. Fitness and nutrition belongs to My Best Version Premium." },
      { question: "How far ahead can I plan during the trial?", answer: "The trial lets you plan up to 3 months. Premium expands the available horizon up to 5 years." },
      { question: "What happens when the 15 days end?", answer: "Access to the tracker pauses. What you created stays stored locally on this device so you can continue after activating Premium." },
      { question: "Do I lose my data when the trial ends?", answer: "No. The end of the trial does not delete your local progress." },
      { question: "How much does Premium cost?", answer: "Premium costs USD 2.99 per month or USD 30.99 per year." },
      { question: "How do I activate Premium?", answer: "You can start payment securely through Mercado Pago. Access is enabled only after trusted payment validation.", checkout: true },
    ],
  },
  footer: { tagline: "PLAN · ACT · ACHIEVE", product: "Product", account: "Account", legal: "Legal", privacy: "Privacy", terms: "Terms", cookies: "Cookies", pqr: "Support", copyright: "© 2026 My Best Version. All rights reserved." },
  accessibility: { menuOpen: "Open menu", menuClose: "Close menu", pricingSelector: "Premium billing option", comparisonAvailable: "Included", comparisonUnavailable: "Not included", screenshotGroup: "Real product screenshots" },
};

export const landingContent = { es, en } satisfies Record<Language, LandingContent>;
