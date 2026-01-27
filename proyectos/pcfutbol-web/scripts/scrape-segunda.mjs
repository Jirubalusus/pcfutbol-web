// Scraper de Segunda División 25/26
// Los equipos se scrapean de Transfermarkt

const SEGUNDA_TEAMS = [
  { id: 'deportivo', name: 'RC Deportivo', tmId: 897 },
  { id: 'racing_santander', name: 'Racing de Santander', tmId: 630 },
  { id: 'almeria', name: 'UD Almería', tmId: 3302 },
  { id: 'valladolid', name: 'Real Valladolid', tmId: 366 },
  { id: 'sporting_gijon', name: 'Sporting de Gijón', tmId: 2448 },
  { id: 'cadiz', name: 'Cádiz CF', tmId: 2687 },
  { id: 'zaragoza', name: 'Real Zaragoza', tmId: 142 },
  { id: 'granada', name: 'Granada CF', tmId: 16795 },
  { id: 'burgos', name: 'Burgos CF', tmId: 1536 },
  { id: 'malaga', name: 'Málaga CF', tmId: 1084 },
  { id: 'castellon', name: 'CD Castellón', tmId: 2502 },
  { id: 'andorra', name: 'FC Andorra', tmId: 10718 },
  { id: 'eibar', name: 'SD Eibar', tmId: 1533 },
  { id: 'mirandes', name: 'CD Mirandés', tmId: 13222 },
  { id: 'cordoba', name: 'Córdoba CF', tmId: 993 },
  { id: 'albacete', name: 'Albacete Balompié', tmId: 1532 },
  { id: 'huesca', name: 'SD Huesca', tmId: 5358 },
  { id: 'ceuta', name: 'AD Ceuta FC', tmId: 8568 },
  { id: 'cultural_leonesa', name: 'Cultural Leonesa', tmId: 4542 },
  { id: 'real_sociedad_b', name: 'Real Sociedad B', tmId: 9899 },
  { id: 'tenerife', name: 'CD Tenerife', tmId: 416 },
  { id: 'cartagena', name: 'FC Cartagena', tmId: 7077 }
];

console.log('📋 Equipos de Segunda División 25/26:');
SEGUNDA_TEAMS.forEach((t, i) => {
  console.log(`${i+1}. ${t.name} → https://www.transfermarkt.es/x/kader/verein/${t.tmId}/saison_id/2025`);
});

export { SEGUNDA_TEAMS };
