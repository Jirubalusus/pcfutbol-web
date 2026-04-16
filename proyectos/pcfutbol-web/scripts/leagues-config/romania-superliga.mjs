// Romanian SuperLiga 2025-26 — 16 clubs
export default {
  leagueKey: 'romaniaSuperliga',
  fakeLeagueName: 'Carpathian League',
  realLeagueName: 'SuperLiga Romania',
  country: 'Rumania',
  tier: 3,
  clubs: [
    {
      id: 'fcsb', realName: 'FCSB', realShortName: 'FCS', realStadium: 'Arena Națională',
      fakeName: 'Steaua Capitala FC', shortName: 'STC', fakeStadium: 'Arena Capitala',
      city: 'Bucarest', colors: { primary: '#D50000', secondary: '#003DA5' },
      stadiumCapacity: 54000, reputation: 4
    },
    {
      id: 'cfr-cluj', realName: 'CFR Cluj', realShortName: 'CFR', realStadium: 'Dr. Constantin Rădulescu',
      fakeName: 'Feroviar FC', shortName: 'FER', fakeStadium: 'Arena Feroviară',
      city: 'Cluj-Napoca', colors: { primary: '#6B1B1B', secondary: '#FFFFFF' },
      stadiumCapacity: 23500, reputation: 4
    },
    {
      id: 'universitatea-craiova', realName: 'Universitatea Craiova', realShortName: 'UCR', realStadium: 'Ion Oblemenco',
      fakeName: 'Oltenia FC', shortName: 'OLT', fakeStadium: 'Oblemenco Arena',
      city: 'Craiova', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 30983, reputation: 3
    },
    {
      id: 'rapid-bucuresti', realName: 'FC Rapid București', realShortName: 'RAP', realStadium: 'Rapid-Giulești',
      fakeName: 'Giulești FC', shortName: 'GIU', fakeStadium: 'Giulești Stadion',
      city: 'Bucarest', colors: { primary: '#6B1B1B', secondary: '#FFFFFF' },
      stadiumCapacity: 14047, reputation: 3
    },
    {
      id: 'dinamo-bucuresti', realName: 'Dinamo București', realShortName: 'DIN', realStadium: 'Arena Națională',
      fakeName: 'Red Dogs FC', shortName: 'RDG', fakeStadium: 'Dinamo Arena',
      city: 'Bucarest', colors: { primary: '#D50000', secondary: '#FFFFFF' },
      stadiumCapacity: 54000, reputation: 3
    },
    {
      id: 'farul-constanta', realName: 'Farul Constanța', realShortName: 'FAR', realStadium: 'Central Stadion',
      fakeName: 'Black Sea Coast FC', shortName: 'BSC', fakeStadium: 'Coastal Arena',
      city: 'Constanza', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 15520, reputation: 3
    },
    {
      id: 'sepsi-sfantu', realName: 'Sepsi OSK Sfântu Gheorghe', realShortName: 'SEP', realStadium: 'Sepsi Arena',
      fakeName: 'Szekely FC', shortName: 'SZK', fakeStadium: 'Sepsi Arena',
      city: 'Sfântu Gheorghe', colors: { primary: '#00853E', secondary: '#FFFFFF' },
      stadiumCapacity: 8400, reputation: 3
    },
    {
      id: 'hermannstadt', realName: 'AFC Hermannstadt', realShortName: 'HER', realStadium: 'Municipal Sibiu',
      fakeName: 'Transilvania FC', shortName: 'TRN', fakeStadium: 'Sibiu Arena',
      city: 'Sibiu', colors: { primary: '#D50000', secondary: '#000000' },
      stadiumCapacity: 12425, reputation: 2
    },
    {
      id: 'petrolul-ploiesti', realName: 'Petrolul Ploiești', realShortName: 'PET', realStadium: 'Ilie Oană',
      fakeName: 'Oil Wells FC', shortName: 'OIL', fakeStadium: 'Ilie Oană Arena',
      city: 'Ploiești', colors: { primary: '#FFD500', secondary: '#003DA5' },
      stadiumCapacity: 15073, reputation: 2
    },
    {
      id: 'unirea-slobozia', realName: 'Unirea Slobozia', realShortName: 'UNI', realStadium: 'Municipal Slobozia',
      fakeName: 'Ialomița FC', shortName: 'IAL', fakeStadium: 'Slobozia Arena',
      city: 'Slobozia', colors: { primary: '#00853E', secondary: '#FFFFFF' },
      stadiumCapacity: 7000, reputation: 2
    },
    {
      id: 'uta-arad', realName: 'UTA Arad', realShortName: 'UTA', realStadium: 'Francisc von Neuman',
      fakeName: 'Mureș FC', shortName: 'MUR', fakeStadium: 'Arad Arena',
      city: 'Arad', colors: { primary: '#D50000', secondary: '#FFFFFF' },
      stadiumCapacity: 12500, reputation: 2
    },
    {
      id: 'otelul-galati', realName: 'ASC Oțelul Galați', realShortName: 'OTE', realStadium: 'Oțelul Stadion',
      fakeName: 'Steel FC', shortName: 'STL', fakeStadium: 'Oțelul Arena',
      city: 'Galați', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 11000, reputation: 2
    },
    {
      id: 'politehnica-iasi', realName: 'FC Politehnica Iași', realShortName: 'POL', realStadium: 'Emil Alexandrescu',
      fakeName: 'Moldavia FC', shortName: 'MLD', fakeStadium: 'Emil Arena',
      city: 'Iași', colors: { primary: '#003DA5', secondary: '#FFD500' },
      stadiumCapacity: 11390, reputation: 2
    },
    {
      id: 'botosani', realName: 'FC Botoșani', realShortName: 'BOT', realStadium: 'Municipal Botoșani',
      fakeName: 'Botoșani FC', shortName: 'BTS', fakeStadium: 'Municipal Arena',
      city: 'Botoșani', colors: { primary: '#D50000', secondary: '#000000' },
      stadiumCapacity: 7782, reputation: 2
    },
    {
      id: 'csikszereda', realName: 'FK Csíkszereda Miercurea Ciuc', realShortName: 'CSI', realStadium: 'Municipal Miercurea',
      fakeName: 'Harghita FC', shortName: 'HRG', fakeStadium: 'Miercurea Arena',
      city: 'Miercurea Ciuc', colors: { primary: '#FFD500', secondary: '#00853E' },
      stadiumCapacity: 5600, reputation: 2
    },
    {
      id: 'metaloglobus', realName: 'CS Metaloglobus București', realShortName: 'MET', realStadium: 'Metaloglobus Stadion',
      fakeName: 'Capital Metals FC', shortName: 'CPM', fakeStadium: 'Metaloglobus Arena',
      city: 'Bucarest', colors: { primary: '#FFD500', secondary: '#000000' },
      stadiumCapacity: 3000, reputation: 2
    }
  ]
};
