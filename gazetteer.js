// Gazetteer for the origin map: places that appear in people's birth/death places.
// Coordinates are approximate (village centre, ±2 km). The map shows every place that people
// in data.js refer to automatically – add a place here when validate.js lists it as missing.
// a = aliases matched as substrings of b.place / d.place (longest match wins); off = outside the map frame.
window.RODOKMEN_GAZ = [
  { n: 'Vítkov', a: ['Vítkov'], lat: 49.774, lon: 17.749 },
  { n: 'Beroun', a: ['Beroun'], lat: 49.964, lon: 14.072 },
  { n: 'Suchomasty', a: ['Suchomasty'], lat: 49.896, lon: 14.058 },
  { n: 'Most', a: ['Most'], lat: 50.503, lon: 13.636 },
  { n: 'Chomutov', a: ['Chomutov'], lat: 50.46, lon: 13.418 },
  { n: 'Jirkov', a: ['Jirkov'], lat: 50.5, lon: 13.448 },
  { n: 'Karviná', a: ['Karviná'], lat: 49.856, lon: 18.55 },
  // Polouvsí = part of Bernartice nad Odrou, okr. Nový Jičín (position ±3 km, to be verified)
  { n: 'Polouvsí', a: ['Polouvsí'], lat: 49.6, lon: 17.96 },
  { n: 'Heršpice', a: ['Heršpice'], lat: 49.118, lon: 16.914 }
];
