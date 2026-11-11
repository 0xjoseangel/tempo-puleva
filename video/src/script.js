// Guion del anuncio: una escena por bloque de voz en off.
// `vo` es lo que lee ElevenLabs (números en letra para que los pronuncie bien).
// `minSeconds` es la duración mínima de la escena si no hay audio o es más corto.
// Las escenas con clip de stock (personas) están en src/stock.js.
export const scenes = [
  { id: 'hook', minSeconds: 3.5, vo: 'Cuidarte no debería ser complicado.' },
  { id: 'manana', minSeconds: 5, vo: 'Con Tempo, solo eliges el momento. Por la mañana, Impulso, para tu energía.' },
  { id: 'dia', minSeconds: 4.5, vo: 'Durante el día, Fuerza y Ritmo, para tus músculos y tus huesos.' },
  { id: 'mix', minSeconds: 5.5, vo: '¿Las dos a la vez? Fuerza más Ritmo. Pulsa el tapón, agita, y listo.' },
  { id: 'noche', minSeconds: 3.5, vo: 'Y por la noche, Pausa, para descansar.' },
  {
    id: 'promo',
    minSeconds: 6,
    vo: 'Y ahora, el Pack Cronos: cuatro shots, un día entero, por solo cinco con veintinueve euros.',
  },
  { id: 'cierre', minSeconds: 4, vo: 'Tempo, bai Puleva. A tu ritmo.' },
];

export const musicPrompt =
  'Warm, optimistic acoustic pop jingle for a TV commercial, light piano and ukulele, soft claps, gentle and uplifting, no vocals';
