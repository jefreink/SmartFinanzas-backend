/**
 * Seeds de Ideas de Prosperidad
 * 50+ ideas para generar ingresos extra y ahorrar dinero
 */

const prosperityIdeas = [
  // FREELANCE & TRABAJO REMOTO
  {
    title: "Diseño Gráfico Freelance",
    description: "Crea logos, banners y contenido visual para negocios en plataformas como Fiverr o Upwork.",
    category: "Freelance",
    requiredSkills: ["diseño", "creatividad", "photoshop"],
    estimatedEarnings: "$300-$1000 / proyecto",
    difficulty: "medium"
  },
  {
    title: "Desarrollo Web Freelance",
    description: "Construye sitios web y aplicaciones para clientes remotos.",
    category: "Freelance",
    requiredSkills: ["programación", "web", "javascript"],
    estimatedEarnings: "$500-$3000 / proyecto",
    difficulty: "hard"
  },
  {
    title: "Redacción de Contenido",
    description: "Escribe artículos, blogs y copy para empresas que necesitan contenido digital.",
    category: "Freelance",
    requiredSkills: ["escritura", "comunicación"],
    estimatedEarnings: "$50-$200 / artículo",
    difficulty: "easy"
  },
  {
    title: "Traducción de Documentos",
    description: "Traduce textos entre idiomas para empresas internacionales.",
    category: "Freelance",
    requiredSkills: ["idiomas", "traducción"],
    estimatedEarnings: "$30-$100 / página",
    difficulty: "medium"
  },
  {
    title: "Community Manager",
    description: "Gestiona redes sociales para pequeños negocios.",
    category: "Freelance",
    requiredSkills: ["redes sociales", "marketing", "comunicación"],
    estimatedEarnings: "$200-$800 / mes",
    difficulty: "easy"
  },

  // VENTA & COMERCIO
  {
    title: "Vender en Mercado Libre",
    description: "Revende productos de segunda mano o dropshipping.",
    category: "Venta",
    requiredSkills: ["ventas", "fotografía"],
    estimatedEarnings: "$100-$500 / mes",
    difficulty: "easy"
  },
  {
    title: "Artesanías Personalizadas",
    description: "Crea y vende productos artesanales en Etsy o localmente.",
    category: "Venta",
    requiredSkills: ["manualidades", "creatividad"],
    estimatedEarnings: "$150-$600 / mes",
    difficulty: "medium"
  },
  {
    title: "Repostería a Pedido",
    description: "Hornea pasteles, galletas y postres para eventos.",
    category: "Venta",
    requiredSkills: ["cocina", "repostería"],
    estimatedEarnings: "$200-$800 / mes",
    difficulty: "medium"
  },
  {
    title: "Vender Fotos en Stock",
    description: "Sube tus fotos a Shutterstock, Adobe Stock y genera ingresos pasivos.",
    category: "Venta",
    requiredSkills: ["fotografía", "edición"],
    estimatedEarnings: "$50-$300 / mes",
    difficulty: "easy"
  },
  {
    title: "Productos Digitales",
    description: "Crea y vende plantillas, presets o ebooks online.",
    category: "Venta",
    requiredSkills: ["diseño", "marketing"],
    estimatedEarnings: "$100-$1000 / mes",
    difficulty: "medium"
  },

  // AHORRO & OPTIMIZACIÓN
  {
    title: "Cocinar en Casa",
    description: "Reduce gastos hasta $200/mes dejando de pedir delivery.",
    category: "Ahorro",
    requiredSkills: [],
    estimatedEarnings: "-$200 / mes",
    difficulty: "easy"
  },
  {
    title: "Cancelar Suscripciones Inactivas",
    description: "Revisa tus suscripciones y cancela las que no uses. Ahorra $50-$150/mes.",
    category: "Ahorro",
    requiredSkills: [],
    estimatedEarnings: "-$100 / mes",
    difficulty: "easy"
  },
  {
    title: "Transporte Público",
    description: "Usa transporte público en vez de auto o Uber para ahorrar combustible.",
    category: "Ahorro",
    requiredSkills: [],
    estimatedEarnings: "-$150 / mes",
    difficulty: "easy"
  },
  {
    title: "Comprar en Lista",
    description: "Planifica tus compras semanales con lista para evitar gastos hormiga.",
    category: "Ahorro",
    requiredSkills: ["organización"],
    estimatedEarnings: "-$100 / mes",
    difficulty: "easy"
  },
  {
    title: "DIY en Casa",
    description: "Aprende reparaciones básicas para evitar llamar técnicos.",
    category: "Ahorro",
    requiredSkills: ["manualidades"],
    estimatedEarnings: "-$80 / mes",
    difficulty: "medium"
  },

  // INVERSIÓN & FINANZAS
  {
    title: "Inversión en CEDEs",
    description: "Invierte en certificados de depósito con rendimiento fijo.",
    category: "Inversión",
    requiredSkills: ["finanzas"],
    estimatedEarnings: "3-7% anual",
    difficulty: "easy"
  },
  {
    title: "Fondo de Inversión",
    description: "Invierte en fondos indexados de bajo riesgo.",
    category: "Inversión",
    requiredSkills: ["finanzas", "investigación"],
    estimatedEarnings: "5-10% anual",
    difficulty: "medium"
  },
  {
    title: "Rentar una Habitación",
    description: "Renta una habitación extra en tu casa o departamento.",
    category: "Inversión",
    requiredSkills: [],
    estimatedEarnings: "$200-$600 / mes",
    difficulty: "medium"
  },
  {
    title: "Cashback y Recompensas",
    description: "Usa tarjetas con cashback y programas de puntos.",
    category: "Ahorro",
    requiredSkills: [],
    estimatedEarnings: "$30-$100 / mes",
    difficulty: "easy"
  },

  // SIDE HUSTLE & SERVICIOS
  {
    title: "Clases Particulares",
    description: "Enseña lo que sabes: idiomas, música, matemáticas, etc.",
    category: "Side Hustle",
    requiredSkills: ["enseñanza", "paciencia"],
    estimatedEarnings: "$15-$40 / hora",
    difficulty: "easy"
  },
  {
    title: "Pasear Perros",
    description: "Ofrece servicio de paseo de perros en tu vecindario.",
    category: "Side Hustle",
    requiredSkills: ["animales"],
    estimatedEarnings: "$10-$25 / paseo",
    difficulty: "easy"
  },
  {
    title: "Delivery Part-Time",
    description: "Trabaja para apps de delivery en tu tiempo libre.",
    category: "Side Hustle",
    requiredSkills: ["conducir"],
    estimatedEarnings: "$300-$800 / mes",
    difficulty: "easy"
  },
  {
    title: "Limpieza de Casas",
    description: "Ofrece servicio de limpieza profunda para hogares u oficinas.",
    category: "Side Hustle",
    requiredSkills: ["limpieza", "organización"],
    estimatedEarnings: "$200-$600 / mes",
    difficulty: "easy"
  },
  {
    title: "Bartending en Eventos",
    description: "Trabaja como bartender en fiestas y eventos.",
    category: "Side Hustle",
    requiredSkills: ["bartending", "social"],
    estimatedEarnings: "$50-$150 / evento",
    difficulty: "medium"
  },
  {
    title: "Fotografía de Eventos",
    description: "Fotografía bodas, cumpleaños y eventos sociales.",
    category: "Side Hustle",
    requiredSkills: ["fotografía", "edición"],
    estimatedEarnings: "$200-$800 / evento",
    difficulty: "medium"
  },

  // TECNOLOGÍA & DIGITAL
  {
    title: "YouTube Channel",
    description: "Crea contenido en video y monetiza con ads y patrocinios.",
    category: "Side Hustle",
    requiredSkills: ["video", "edición", "creatividad"],
    estimatedEarnings: "$100-$2000 / mes",
    difficulty: "hard"
  },
  {
    title: "Podcast Patrocinado",
    description: "Inicia un podcast y busca patrocinadores.",
    category: "Side Hustle",
    requiredSkills: ["audio", "comunicación"],
    estimatedEarnings: "$50-$500 / mes",
    difficulty: "medium"
  },
  {
    title: "Curso Online",
    description: "Crea un curso en Udemy o Teachable sobre tu expertise.",
    category: "Freelance",
    requiredSkills: ["enseñanza", "video"],
    estimatedEarnings: "$100-$1000 / mes",
    difficulty: "hard"
  },
  {
    title: "App o SaaS",
    description: "Desarrolla una aplicación o servicio web con suscripción.",
    category: "Inversión",
    requiredSkills: ["programación", "emprendimiento"],
    estimatedEarnings: "$0-$5000+ / mes",
    difficulty: "hard"
  },
  {
    title: "Testing de Apps",
    description: "Prueba aplicaciones y sitios web para empresas.",
    category: "Freelance",
    requiredSkills: ["tecnología"],
    estimatedEarnings: "$10-$50 / test",
    difficulty: "easy"
  },

  // CREATIVIDAD & ARTE
  {
    title: "Ilustración Digital",
    description: "Crea ilustraciones personalizadas para clientes.",
    category: "Freelance",
    requiredSkills: ["dibujo", "digital art"],
    estimatedEarnings: "$50-$300 / pieza",
    difficulty: "medium"
  },
  {
    title: "Música en Streaming",
    description: "Sube tu música a Spotify y genera regalías.",
    category: "Side Hustle",
    requiredSkills: ["música", "producción"],
    estimatedEarnings: "$20-$200 / mes",
    difficulty: "medium"
  },
  {
    title: "Voice Over",
    description: "Graba voces para comerciales, audiolibros y videos.",
    category: "Freelance",
    requiredSkills: ["voz", "audio"],
    estimatedEarnings: "$50-$300 / proyecto",
    difficulty: "medium"
  },
  {
    title: "Diseño de Tatuajes",
    description: "Crea diseños personalizados para estudios de tatuajes.",
    category: "Freelance",
    requiredSkills: ["dibujo", "diseño"],
    estimatedEarnings: "$30-$200 / diseño",
    difficulty: "medium"
  },

  // CONSULTORÍA & ASESORÍA
  {
    title: "Consultor Financiero",
    description: "Asesora a personas en planificación financiera personal.",
    category: "Freelance",
    requiredSkills: ["finanzas", "contabilidad"],
    estimatedEarnings: "$50-$150 / hora",
    difficulty: "hard"
  },
  {
    title: "Coach de Vida",
    description: "Ofrece sesiones de coaching para desarrollo personal.",
    category: "Freelance",
    requiredSkills: ["psicología", "comunicación"],
    estimatedEarnings: "$40-$120 / sesión",
    difficulty: "medium"
  },
  {
    title: "Asesor de Marketing",
    description: "Ayuda a pequeños negocios con estrategias de marketing.",
    category: "Freelance",
    requiredSkills: ["marketing", "estrategia"],
    estimatedEarnings: "$300-$1000 / mes",
    difficulty: "hard"
  },

  // SALUD & BIENESTAR
  {
    title: "Instructor de Yoga",
    description: "Dicta clases de yoga online o presenciales.",
    category: "Side Hustle",
    requiredSkills: ["yoga", "enseñanza"],
    estimatedEarnings: "$20-$50 / clase",
    difficulty: "medium"
  },
  {
    title: "Entrenador Personal",
    description: "Ofrece planes de entrenamiento personalizados.",
    category: "Side Hustle",
    requiredSkills: ["fitness", "nutrición"],
    estimatedEarnings: "$30-$80 / sesión",
    difficulty: "medium"
  },
  {
    title: "Meal Prep Service",
    description: "Prepara comidas saludables para la semana y véndelas.",
    category: "Side Hustle",
    requiredSkills: ["cocina", "nutrición"],
    estimatedEarnings: "$200-$600 / mes",
    difficulty: "medium"
  },

  // EDUCACIÓN & TUTORÍA
  {
    title: "Tutor de Inglés Online",
    description: "Enseña inglés a estudiantes en plataformas como iTalki.",
    category: "Freelance",
    requiredSkills: ["inglés", "enseñanza"],
    estimatedEarnings: "$15-$40 / hora",
    difficulty: "easy"
  },
  {
    title: "Tutor de Programación",
    description: "Enseña código a principiantes por videollamada.",
    category: "Freelance",
    requiredSkills: ["programación", "enseñanza"],
    estimatedEarnings: "$25-$80 / hora",
    difficulty: "medium"
  },
  {
    title: "Corrector de Tesis",
    description: "Corrige y edita trabajos académicos para estudiantes.",
    category: "Freelance",
    requiredSkills: ["escritura", "gramática"],
    estimatedEarnings: "$50-$200 / trabajo",
    difficulty: "medium"
  },

  // REPARACIÓN & MANTENIMIENTO
  {
    title: "Reparación de Celulares",
    description: "Aprende a reparar pantallas y baterías de smartphones.",
    category: "Side Hustle",
    requiredSkills: ["tecnología", "manualidades"],
    estimatedEarnings: "$30-$100 / reparación",
    difficulty: "medium"
  },
  {
    title: "Mantenimiento de Jardines",
    description: "Ofrece servicio de poda y cuidado de plantas.",
    category: "Side Hustle",
    requiredSkills: ["jardinería"],
    estimatedEarnings: "$150-$400 / mes",
    difficulty: "easy"
  },
  {
    title: "Pintura de Casas",
    description: "Pinta interiores y exteriores de casas.",
    category: "Side Hustle",
    requiredSkills: ["pintura", "manualidades"],
    estimatedEarnings: "$300-$800 / proyecto",
    difficulty: "medium"
  },

  // OTROS
  {
    title: "Rentar tu Auto",
    description: "Renta tu auto en plataformas cuando no lo uses.",
    category: "Inversión",
    requiredSkills: [],
    estimatedEarnings: "$200-$500 / mes",
    difficulty: "easy"
  },
  {
    title: "Participar en Encuestas",
    description: "Completa encuestas online pagadas en tu tiempo libre.",
    category: "Side Hustle",
    requiredSkills: [],
    estimatedEarnings: "$20-$80 / mes",
    difficulty: "easy"
  },
  {
    title: "Organizador Profesional",
    description: "Ayuda a personas a organizar sus casas y espacios.",
    category: "Side Hustle",
    requiredSkills: ["organización", "diseño"],
    estimatedEarnings: "$40-$100 / sesión",
    difficulty: "easy"
  },
  {
    title: "Transcripción de Audio",
    description: "Transcribe entrevistas y podcasts para creadores de contenido.",
    category: "Freelance",
    requiredSkills: ["escritura rápida"],
    estimatedEarnings: "$20-$60 / hora audio",
    difficulty: "easy"
  },
  {
    title: "Mystery Shopper",
    description: "Evalúa servicios de tiendas y restaurantes siendo cliente anónimo.",
    category: "Side Hustle",
    requiredSkills: ["observación"],
    estimatedEarnings: "$15-$50 / visita",
    difficulty: "easy"
  }
];

module.exports = prosperityIdeas;
