import { Publication, EducationItem, ExperienceItem, Course, ResearchLine } from './types';

export const personalInfo = {
  name: 'Erick Radaí Rojas Maldonado',
  title: 'Doctor en Educación',
  role: 'Profesor-Investigador Titular (28 años de trayectoria)',
  institution: 'Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)',
  faculty: 'Invitado en el Programa Institucional de Licenciatura en Biotecnología',
  location: 'Morelia, Michoacán, México',
  email: 'radai.rojas@umich.mx',
  orcid: '0000-0003-2521-5107',
  scholar: 'https://scholar.google.com/citations?user=radai_rojas',
  researchGate: 'https://www.researchgate.net/profile/Erick_Radai_Maldonado2?ev=hdr_xprf',
  phone: '+52 (443) 322-3500 ext. 4102',
  avatar: '/avatar.png',
  bio: 'Profesor e Investigador Titular de la Universidad Michoacana de San Nicolás de Hidalgo (UMSNH), invitado en el Programa Institucional de Licenciatura en Biotecnología. Cuenta con más de 28 años de trayectoria docente, habiendo impartido más de 140 cursos a nivel medio superior, superior y posgrado. Es reconocido como Investigador Estatal Honorífico por el Instituto de Ciencia, Tecnología e Innovación (ICTI) del Gobierno del Estado de Michoacán de 2022 a la fecha.',
  objective: 'Desarrollar mi experiencia hacia la coordinación y organización de gestión académica mejorando los proyectos educativos institucionales y los procesos formativos que se vinculen con la sociedad y con los parámetros de la evaluación educativa internacional.',
  aptitudes: [
    'Capacidad de análisis y observación',
    'Proactivo y dinámico',
    'Elevado conocimiento para la tecnología',
    'Trabajo colaborativo y de dirección',
    'Capacidad para lograr objetivos',
    'Autonomía para trabajar'
  ]
};

export const researchLines: ResearchLine[] = [
  {
    id: 'didactica-calculo',
    title: 'Didáctica del Cálculo y el Análisis Matemático',
    description: 'Análisis de los obstáculos conceptuales en el aprendizaje del límite, cálculo diferencial e integral y ecuaciones diferenciales (EDOs), diseñando recursos visuales interactivos.',
    icon: 'TrendingUp',
    projectsCount: 16,
    publicationsCount: 43,
  },
  {
    id: 'tecnologia-educativa',
    title: 'Tecnología e Interactividad en Ciencias Exactas',
    description: 'Implementación didáctica de simulaciones digitales, laboratorios de Google Colab, GeoGebra y Desmos para el sobreaprendizaje adaptativo de las matemáticas.',
    icon: 'Cpu',
    projectsCount: 12,
    publicationsCount: 35,
  },
  {
    id: 'modelacion-matematica',
    title: 'Modelación de Fenómenos y EDOs en Ciencias',
    description: 'Integración transdisciplinar utilizando analogías físicas, flujos mecánicos y correlaciones (como la transdisciplina entre cálculo y música) para dotar de sentido a los conceptos abstractos.',
    icon: 'Settings',
    projectsCount: 8,
    publicationsCount: 22,
  },
];

export const publications: Publication[] = [
  {
    id: 'pub1',
    title: 'Personalización del Aprendizaje del Concepto de Límite mediante Redes Neuronales y Visualización Interactiva en Google Colab',
    authors: 'Erick Radaí Rojas Maldonado',
    journal: 'Revista Dilemas Contemporáneos: Educación, Política y Valores',
    year: 2025,
    volume: 'Año XII',
    pages: 'Art. 41',
    abstract: 'Investigación orientada al desarrollo de redes neuronales aplicadas de forma secuencial interactiva en Google Colab para la visualización dinámica del límite, adaptando la retroalimentación de acuerdo al ritmo conceptual del alumno.',
    tags: ['Límites', 'Redes Neuronales', 'Google Colab', 'Visualización'],
    link: 'https://dilemascontemporaneoseducacionpoliticayvalores.com/',
    citations: 18,
  },
  {
    id: 'pub3',
    title: 'Impacto de los conocimientos previos de álgebra y aritmética en el aprendizaje de funciones de cálculo diferencial',
    authors: 'Erick Radaí Rojas Maldonado',
    journal: 'RIDE Revista Iberoamericana para la Investigación y el Desarrollo Educativo',
    year: 2023,
    volume: 'Vol. 10',
    pages: 'e493',
    doi: '10.23913/ride.v10i19.493',
    abstract: 'Estudio pormenorizado sobre el rezago en operaciones elementales y aritmética de bachillerato, analizando de qué manera estas barreras lingüísticas obstaculizan la asimilación del concepto analítico formal de la derivada y su aplicación.',
    tags: ['Cálculo', 'Álgebra', 'Educación Superior', 'RIDE'],
    link: 'https://www.ride.org.mx/',
    citations: 28,
  },
  {
    id: 'pub4',
    title: 'El Límite que no es restricción: Un motivo por el que repruebas Cálculo',
    authors: 'Erick Radaí Rojas Maldonado',
    journal: 'Saber Más (UMSNH)',
    year: 2023,
    volume: 'Año 12, N. 71',
    pages: '22-29',
    abstract: 'Un análisis exhaustivo del choque entre el lenguaje coloquial (el límite como una frontera infranqueable) y el formalismo matemático de la topología analítica, recomendando recursos gráficos digitales para desarmar dicha confusión semántica.',
    tags: ['Límites', 'Comprensión', 'Saber Más', 'Didáctica'],
    link: 'https://www.sabermas.umich.mx/',
    citations: 9,
  },
  {
    id: 'pub5',
    title: 'La comprensión de conceptos fundamentales del cálculo mediante Desmos. Una intervención en bachillerato',
    authors: 'Erick Radaí Rojas Maldonado',
    journal: 'Revista Iberoamericana para la Investigación y el Desarrollo Educativo',
    year: 2020,
    volume: 'Vol. 11',
    pages: '54-62',
    abstract: 'Estudio que cuantifica la ganancia conceptual al aplicar cuadernos dinámicos en Desmos en el reconocimiento de la recta tangente y la tasa de cambio, permitiendo a los alumnos interactuar visualmente con el límite de las secantes.',
    tags: ['Desmos', 'Cálculo Diferencial', 'Gráfica', 'Plataformas'],
    link: 'https://www.ride.org.mx/',
    citations: 21,
  },
  {
    id: 'pub6',
    title: 'Procedimientos quirúrgicos para extirpar integrales',
    authors: 'Erick Radaí Rojas Maldonado',
    journal: 'Colección de Libros Educativos Directos IBooks',
    year: 2013,
    volume: 'Edición Nacional',
    pages: 'ISBN 647609426',
    abstract: 'Libro educativo enfocado a desmitificar los métodos de integración a través de analogías directas y un desglose intuitivo paso a paso, convirtiéndose en un manual de referencia didáctica para docentes de ingeniería.',
    tags: ['Libros', 'Integrales', 'Cálculo', 'Metáforas'],
    citations: 35,
  }
];

export const education: EducationItem[] = [
  {
    id: 'edu1',
    degree: 'Doctor en Educación',
    institution: 'Universidad de Durango',
    period: '2012 - 2016',
    location: 'México',
    details: [
      'Estudios de Posgrado de nivel Doctorado con enfoque en investigación y procesos de gestión educativa.',
      'Sustentación de tesis doctoral orientada al análisis e integración de tecnologías didácticas interactivas.'
    ],
  },
  {
    id: 'edu2',
    degree: 'Maestro en Ciencias en Enseñanza de las Ciencias',
    institution: 'Centro Interdisciplinario de Investigación y Docencia en Educación Técnica (CIIDET)',
    period: '2004 - 2006',
    location: 'Querétaro, México',
    details: [
      'Especialización fundamentada en didáctica general científica, matemáticas aplicadas y docencia de nivel superior.',
      'Desarrollo e implementación de metodologías innovadoras y recursos interactivos de aprendizaje.'
    ],
  },
  {
    id: 'edu3',
    degree: 'Licenciado Físico Matemático',
    institution: 'Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)',
    period: '1998 - 2002',
    location: 'Morelia, Michoacán',
    details: [
      'Formación rigurosa en mecánica clásica, análisis numérico avanzado, ecuaciones ordinarias y física teórica.',
      'Orientación fundamentada a la docencia superior de las ciencias exactas.'
    ],
  },
];

export const experience: ExperienceItem[] = [
  {
    id: 'exp1',
    role: 'Profesor e Investigador Titular (Invitado)',
    organization: 'Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)',
    period: 'Actualidad',
    location: 'Morelia, Michoacán',
    type: 'academic',
    description: [
      'Docente destacado con 28 años de trayectoria en la enseñanza de las ciencias exactas.',
      'Impartición de más de 140 cursos a nivel Medio Superior, Superior y Posgrado.',
      'Profesor Invitado en el Programa Institucional de Licenciatura en Biotecnología.',
      'Líder curricular en la actualización pedagógica de matemáticas y modelación experimental.'
    ],
  },
  {
    id: 'exp2',
    role: 'Revisor Científico y Evaluador Académico',
    organization: 'Revistas de Investigación y Evaluaciones Institucionales',
    period: '2015 - Actualidad',
    location: 'México',
    type: 'research',
    description: [
      'Miembro de comités editoriales y árbitro dictaminador en revistas científicas indexadas de alto impacto.',
      'Colaborador y revisor en el diseño técnico y metodológico de reactivos del certamen de ingreso EXAUM-I y EXAUM-II.',
      'Asesor metodológico y jurado examinador oficial en la sustentación de exámenes de grado de nivel medio superior y superior.'
    ],
  },
  {
    id: 'exp3',
    role: 'Coordinador de Academia de Físico Matemáticas',
    organization: 'Programa de Bachillerato PILB - UMSNH',
    period: '2022 - Actualidad',
    location: 'Morelia, Michoacán',
    type: 'management',
    description: [
      'Dirección académica y actualización curricular sistemática de programas de ciencias exactas.',
      'Coordinación de los planes para la Acreditación del Programa Institucional de Licenciatura en Biotecnología.',
      'Miembro activo de la Comisión de Reacreditación del PILB (24 de mayo de 2026).'
    ],
  },
  {
    id: 'exp4',
    role: 'Investigador Estatal Honorífico',
    organization: 'Instituto de Ciencia, Tecnología e Innovación (ICTI) del Gobierno de Michoacán',
    period: '2022 - Actualidad',
    location: 'Michoacán, México',
    type: 'research',
    description: [
      'Distinción y acreditación oficial honorífica por la trayectoria de aportación al desarrollo científico regional.',
      'Autor de más de 20 artículos indexados de alta calidad sobre didáctica matemática y aprendizaje de cálculo.',
      'Evaluador y dictaminador habitual para revistas de excelencia académica y de divulgación.'
    ],
  },
  {
    id: 'exp5',
    role: 'Secretario Académico',
    organization: 'Colegio Primitivo y Nacional de San Nicolás de Hidalgo - UMSNH',
    period: '2007 - 2012',
    location: 'Morelia, Michoacán',
    type: 'management',
    description: [
      'Gestión académica a nivel medio superior orientada al funcionamiento y mejoramiento del núcleo académico y estudiantil.',
      'Coordinador del programa de Acercamiento de Estudiantes del Bachillerato a la Investigación Científica (PIFIEMS 1.0, 2007).',
      'Postulado por los Consejeros Técnicos Alumnos para la condecoración de Trayectoria Destacada en Bachillerato a la Presea Vasco de Quiroga.'
    ],
  },
  {
    id: 'exp6',
    role: 'Representante Suplente Institucional del Bachillerato Nicolaíta',
    organization: 'Ante la Red ANUIES del Nivel Medio Superior',
    period: '2012 - 2013',
    location: 'México',
    type: 'management',
    description: [
      'Representación estratégica para fortalecer la vinculación en ámbitos de docencia, investigación y extensión cultural.',
      'Colaboración en mesas de mejora de programas de nivel medio superior en el ámbito de la red nacional.'
    ],
  }
];

export const courses: Course[] = [
  {
    id: 'c1',
    name: 'Cálculo Diferencial e Integral',
    code: 'CALD-101',
    level: 'Licenciatura (Biotecnología e Ingeniería)',
    semester: 'Anual / Semestral',
    description: 'Estudio formal profundo de límites continuos, razones de cambio instantánea, optimización de variables sencillas y derivación analítica o numérica con apoyo de software paramétrico.',
    topics: ['Límites analíticos e indeterminados', 'Derivación como tasa de cambio', 'Optimización clásica e integral de Riemann', 'Modelado físico e incremental en biotecnología'],
  },
  {
    id: 'c2',
    name: 'Ecuaciones Diferenciales',
    code: 'ECUD-301',
    level: 'Licenciatura (Segundo Año)',
    semester: 'Semestral',
    description: 'Aborda el modelado de dinámicas continuas (termodinámicas, fluidos o poblaciones) donde la rapidez de evolución responde a leyes diferenciales lineales y no lineales ordinarias.',
    topics: ['EDOs de Primer Orden y Separables', 'Modelos Lineales de Orden Superior', 'Campos de direcciones y de pendientes', 'Aproximaciones numéricas (Euler, Runge-Kutta)'],
  },
  {
    id: 'c3',
    name: 'Física / Introducción a las Ciencias Físicas',
    code: 'FISC-102',
    level: 'Licenciatura y PILB',
    semester: 'Semestral',
    description: 'Principios de mecánica newtoniana, vectores, conservación de momento y energía integrados mediante laboratorios virtuales interactivos para facilitar el aprendizaje visual.',
    topics: ['Cinemática Clásica y de Partículas', 'Leyes de Newton y Dinámica Vectorial', 'Trabajo, Potencia y Conservación de Energía', 'Simuladores digitales para experimentos biológicos'],
  },
];
