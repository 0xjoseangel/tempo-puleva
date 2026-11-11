// Clips de stock para cada escena con personas.
// mixkit: número del clip de Mixkit (mixkit.co). Basta con descargarlo en public/stock/ con su nombre
//   original (o como <escena>.mp4) y ejecutar npm run stock.
// query: búsqueda en Pexels, solo si hay PEXELS_API_KEY. start: segundo de inicio del clip.
// Mezcla de edades a propósito: el público principal tiene 50+, pero Tempo no es "de mayores".
export const stock = {
  hook: { mixkit: 46792, query: 'mature man pills table' }, // ~60, el problema
  manana: { mixkit: 31407, query: 'woman morning stretching window' }, // 35-40
  dia: { mixkit: 33198, query: 'mature woman gardening' }, // ~60, activa
  mix: { mixkit: 44413, query: 'man woman dumbbells gym' }, // 35-45
  noche: { mixkit: 42981, query: 'couple sleeping night bed' }, // 35-45
  cierre: { mixkit: 23135, query: 'family dinner garden three generations' }, // todas las edades
};
