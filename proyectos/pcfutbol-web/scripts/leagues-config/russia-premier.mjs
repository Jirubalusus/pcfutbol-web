// Russian Premier Liga 2025-26 — 16 clubs
export default {
  leagueKey: 'russiaPremier',
  fakeLeagueName: 'Volga League',
  realLeagueName: 'Russian Premier League',
  country: 'Rusia',
  tier: 3,
  clubs: [
    {
      id: 'zenit-saint-petersburg', realName: 'FC Zenit Saint Petersburg', realShortName: 'ZEN', realStadium: 'Gazprom Arena',
      fakeName: 'Neva FC', shortName: 'NEV', fakeStadium: 'Neva Arena',
      city: 'San Petersburgo', colors: { primary: '#0A2D6E', secondary: '#00B2E3' },
      stadiumCapacity: 67800, reputation: 4
    },
    {
      id: 'spartak-moscow', realName: 'FC Spartak Moscow', realShortName: 'SPA', realStadium: 'Lukoil Arena',
      fakeName: 'Red Diamonds FC', shortName: 'RDM', fakeStadium: 'Diamond Arena',
      city: 'Moscú', colors: { primary: '#D50000', secondary: '#FFFFFF' },
      stadiumCapacity: 45360, reputation: 4
    },
    {
      id: 'cska-moscow', realName: 'CSKA Moscow', realShortName: 'CSK', realStadium: 'VEB Arena',
      fakeName: 'Army Stars FC', shortName: 'ARS', fakeStadium: 'Stars Arena',
      city: 'Moscú', colors: { primary: '#D50000', secondary: '#003DA5' },
      stadiumCapacity: 30000, reputation: 4
    },
    {
      id: 'lokomotiv-moscow', realName: 'Lokomotiv Moscow', realShortName: 'LOK', realStadium: 'RZD Arena',
      fakeName: 'Railway FC', shortName: 'RLW', fakeStadium: 'Railway Arena',
      city: 'Moscú', colors: { primary: '#D00000', secondary: '#00853E' },
      stadiumCapacity: 27320, reputation: 4
    },
    {
      id: 'dynamo-moscow', realName: 'Dynamo Moscow', realShortName: 'DYN', realStadium: 'VTB Arena',
      fakeName: 'Blue Thunder FC', shortName: 'BLT', fakeStadium: 'Thunder Arena',
      city: 'Moscú', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 26319, reputation: 3
    },
    {
      id: 'krasnodar', realName: 'FC Krasnodar', realShortName: 'KRA', realStadium: 'Ozon Arena',
      fakeName: 'Kuban Wolves FC', shortName: 'KUB', fakeStadium: 'Kuban Arena',
      city: 'Krasnodar', colors: { primary: '#000000', secondary: '#00A651' },
      stadiumCapacity: 34291, reputation: 4
    },
    {
      id: 'rubin-kazan', realName: 'FC Rubin Kazan', realShortName: 'RUB', realStadium: 'Ak Bars Arena',
      fakeName: 'Tatar Ruby FC', shortName: 'TRB', fakeStadium: 'Ak Bars Stadion',
      city: 'Kazán', colors: { primary: '#006633', secondary: '#D00000' },
      stadiumCapacity: 45379, reputation: 3
    },
    {
      id: 'rostov', realName: 'FC Rostov', realShortName: 'ROS', realStadium: 'Rostov Arena',
      fakeName: 'Don River FC', shortName: 'DON', fakeStadium: 'Don Arena',
      city: 'Rostov del Don', colors: { primary: '#FFD500', secondary: '#003DA5' },
      stadiumCapacity: 45000, reputation: 3
    },
    {
      id: 'dinamo-makhachkala', realName: 'Dynamo Makhachkala', realShortName: 'DMK', realStadium: 'Anzhi Arena',
      fakeName: 'Caspian FC', shortName: 'CAS', fakeStadium: 'Caspian Arena',
      city: 'Majachkalá', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 28500, reputation: 2
    },
    {
      id: 'akhmat-grozny', realName: 'FC Akhmat Grozny', realShortName: 'AKH', realStadium: 'Akhmat Arena',
      fakeName: 'Caucasus FC', shortName: 'CAU', fakeStadium: 'Caucasus Arena',
      city: 'Grozni', colors: { primary: '#00853E', secondary: '#FFFFFF' },
      stadiumCapacity: 30597, reputation: 2
    },
    {
      id: 'krylia-sovetov', realName: 'Krylia Sovetov Samara', realShortName: 'KRY', realStadium: 'Solidarnost Arena',
      fakeName: 'Wings of Volga FC', shortName: 'WOV', fakeStadium: 'Volga Arena',
      city: 'Samara', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 45918, reputation: 3
    },
    {
      id: 'fakel-voronezh', realName: 'FC Fakel Voronezh', realShortName: 'FAK', realStadium: 'Stadion Fakel',
      fakeName: 'Torch FC', shortName: 'TRC', fakeStadium: 'Torch Stadion',
      city: 'Vorónezh', colors: { primary: '#FFFFFF', secondary: '#003DA5' },
      stadiumCapacity: 32750, reputation: 2
    },
    {
      id: 'nizhny-novgorod', realName: 'Pari Nizhny Novgorod', realShortName: 'NIZ', realStadium: 'Nizhny Novgorod Stadion',
      fakeName: 'Volga Delta FC', shortName: 'VLD', fakeStadium: 'Nizhny Arena',
      city: 'Nizhni Nóvgorod', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 44899, reputation: 2
    },
    {
      id: 'orenburg', realName: 'FC Orenburg', realShortName: 'ORE', realStadium: 'Gazovik Arena',
      fakeName: 'Steppe FC', shortName: 'STP', fakeStadium: 'Steppe Arena',
      city: 'Oremburgo', colors: { primary: '#003DA5', secondary: '#FFD500' },
      stadiumCapacity: 10500, reputation: 2
    },
    {
      id: 'khimki', realName: 'FC Khimki', realShortName: 'KHI', realStadium: 'Arena Khimki',
      fakeName: 'Podmoscov FC', shortName: 'PDM', fakeStadium: 'Arena Podmoscov',
      city: 'Jimki', colors: { primary: '#D50000', secondary: '#000000' },
      stadiumCapacity: 18636, reputation: 2
    },
    {
      id: 'sochi', realName: 'PFC Sochi', realShortName: 'SOC', realStadium: 'Fisht Olympic Stadion',
      fakeName: 'Coastline FC', shortName: 'COA', fakeStadium: 'Fisht Arena',
      city: 'Sochi', colors: { primary: '#000000', secondary: '#00A651' },
      stadiumCapacity: 47659, reputation: 2
    }
  ]
};
