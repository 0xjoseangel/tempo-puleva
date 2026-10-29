// Única fuente de datos de la web. Edita aquí textos, precios y valores.
// IMPORTANTE: los claims e ingredientes son literales del brief; no añadir otros
// sin validación regulatoria.

export const brand = {
  name: 'Tempo',
  endorsement: 'by Puleva',
  slogan: 'A tu ritmo.',
};

export const products = [
  {
    id: 'impulso',
    name: 'Tempo Impulso',
    range: 'Impulso',
    moment: 'Mañana',
    benefit: 'Energía',
    ingredients: 'Magnesio + vitaminas B6 y B12',
    size: '100 ml',
    claim:
      'El magnesio y las vitaminas B6 y B12 contribuyen a disminuir el cansancio y la fatiga.',
    storage: 'Ambiente',
    usage: null,
    price: 'Por definir',
    icon: 'sunrise',
    color: '#F2A33A',
    liquid: '#F6C77A',
  },
  {
    id: 'fuerza',
    name: 'Tempo Fuerza',
    range: 'Fuerza',
    moment: 'Día',
    benefit: 'Músculo',
    ingredients: 'Proteína láctea (~15 g) + vitamina D',
    size: '100 ml',
    claim:
      'La proteína contribuye a conservar la masa muscular. La vitamina D contribuye al funcionamiento normal de los músculos.',
    storage: 'Refrigerado',
    usage: null,
    price: 'Por definir',
    icon: 'sun',
    color: '#E4572E',
    liquid: '#F4EDE2',
  },
  {
    id: 'firme',
    name: 'Tempo Firme',
    range: 'Firme',
    moment: 'Día',
    benefit: 'Huesos',
    ingredients: 'Base láctea con calcio + vitamina D',
    size: '100 ml',
    claim:
      'El calcio y la vitamina D son necesarios para el mantenimiento de los huesos en condiciones normales.',
    storage: 'Refrigerado',
    usage: null,
    price: 'Por definir',
    icon: 'sunBone',
    color: '#3A7CA5',
    liquid: '#F7F3EC',
  },
  {
    id: 'activo',
    name: 'Tempo Activo',
    range: 'Activo',
    moment: 'Mediodía y tarde',
    benefit: 'Músculo y huesos',
    ingredients: 'Proteína láctea + calcio + vitamina D. Creatina (3 g) en polvo en el tapón',
    size: '100 ml',
    claim:
      'La proteína contribuye a conservar la masa muscular. El calcio y la vitamina D son necesarios para el mantenimiento de los huesos en condiciones normales. La ingesta diaria de creatina puede potenciar el efecto del entrenamiento de resistencia sobre la fuerza muscular en adultos mayores de 55 años.',
    // Claim de creatina: Reg. (UE) 2017/672 (3 g/día + entrenamiento de resistencia). PENDIENTE DE VALIDAR.
    claimStatus: 'Claim de creatina pendiente de validar',
    storage: 'Refrigerado',
    usage: 'Pulsa el tapón, agita y tómalo.',
    price: 'Por definir',
    icon: 'sunBonePlus',
    color: '#2A9D8F',
    liquid: '#EFE3CF',
    // Tapón dosificador: la creatina va en polvo en una cámara y se libera al pulsar
    cap: 'powder',
  },
  {
    id: 'pausa',
    name: 'Tempo Pausa',
    range: 'Pausa',
    moment: 'Noche',
    benefit: 'Descanso',
    ingredients: 'Melatonina (<2 mg)',
    size: '100 ml',
    claim:
      'La melatonina contribuye a disminuir el tiempo necesario para conciliar el sueño (1 mg antes de acostarse).',
    storage: 'Ambiente',
    usage: 'Para las noches que lo necesites.',
    price: 'Por definir',
    icon: 'moon',
    color: '#3D348B',
    liquid: '#8C83C9',
  },
];

export const productById = Object.fromEntries(products.map((p) => [p.id, p]));

// Packs de 4 shots (Tempo Activo va aparte: es el mix). Precios por definir.
export const coreRange = ['impulso', 'fuerza', 'firme', 'pausa'];

export const packs = [
  {
    id: 'ritmo',
    label: 'Pack Ritmo',
    subtitle: 'Mañana · Día · Noche',
    items: coreRange, // uno de cada
    price: 'Por definir',
  },
  {
    id: 'single',
    label: 'Pack ×4',
    units: 4, // cuatro shots de una misma gama (de coreRange)
    price: 'Por definir',
  },
];

// Sección "Una rutina pensada como sistema".
// Todos los valores son EDITABLES y están PENDIENTES DE VALIDAR.
// dose: cantidad aportada por la rutina diaria completa (null = por definir).
// limit: límite máximo de referencia EFSA (null = sin límite establecido / por confirmar).
export const routineNutrients = [
  { nutrient: 'Magnesio', unit: 'mg', source: 'impulso', dose: null, limit: 250, status: 'pendiente de validar' },
  { nutrient: 'Vitamina B6', unit: 'mg', source: 'impulso', dose: null, limit: 12, status: 'pendiente de validar' },
  { nutrient: 'Vitamina B12', unit: 'µg', source: 'impulso', dose: null, limit: null, status: 'pendiente de validar' },
  { nutrient: 'Proteína', unit: 'g', source: 'fuerza', dose: 15, limit: null, status: 'pendiente de validar' },
  { nutrient: 'Calcio', unit: 'mg', source: 'firme', dose: null, limit: 2500, status: 'pendiente de validar' },
  { nutrient: 'Vitamina D', unit: 'µg', source: 'fuerza + firme + activo', dose: null, limit: 100, status: 'pendiente de validar' },
  { nutrient: 'Creatina', unit: 'g', source: 'activo', dose: 3, limit: null, status: 'pendiente de validar' },
  { nutrient: 'Melatonina', unit: 'mg', source: 'pausa', dose: 1, limit: null, status: 'pendiente de validar' },
];
