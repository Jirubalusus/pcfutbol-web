// Norwegian Eliteserien 2025 — 16 clubs
export default {
  leagueKey: 'eliteserien',
  fakeLeagueName: 'Fjord League',
  realLeagueName: 'Eliteserien',
  country: 'Noruega',
  tier: 3,
  clubs: [
    {
      id: 'bodo-glimt', realName: 'FK Bodø/Glimt', realShortName: 'BOD', realStadium: 'Aspmyra Stadion',
      fakeName: 'Nordlys FK', shortName: 'NOR', fakeStadium: 'Aspmyra Arena',
      city: 'Bodø', colors: { primary: '#FFD500', secondary: '#000000' },
      stadiumCapacity: 8270, reputation: 4
    },
    {
      id: 'molde-fk', realName: 'Molde FK', realShortName: 'MOL', realStadium: 'Aker Stadion',
      fakeName: 'Fjordbyen FK', shortName: 'MOL', fakeStadium: 'Fjord Stadion',
      city: 'Molde', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 11249, reputation: 4
    },
    {
      id: 'rosenborg-bk', realName: 'Rosenborg BK', realShortName: 'RBK', realStadium: 'Lerkendal Stadion',
      fakeName: 'Svartblå BK', shortName: 'SBK', fakeStadium: 'Lerkendal Arena',
      city: 'Trondheim', colors: { primary: '#FFFFFF', secondary: '#000000' },
      stadiumCapacity: 21166, reputation: 4
    },
    {
      id: 'brann', realName: 'SK Brann', realShortName: 'BRA', realStadium: 'Brann Stadion',
      fakeName: 'Rødstorm FK', shortName: 'RST', fakeStadium: 'Vestkysten Stadion',
      city: 'Bergen', colors: { primary: '#D60000', secondary: '#FFFFFF' },
      stadiumCapacity: 17824, reputation: 4
    },
    {
      id: 'viking-fk', realName: 'Viking FK', realShortName: 'VIK', realStadium: 'SR-Bank Arena',
      fakeName: 'Langskip FK', shortName: 'LSK', fakeStadium: 'Drakkar Arena',
      city: 'Stavanger', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 15900, reputation: 3
    },
    {
      id: 'valerenga', realName: 'Vålerenga Fotball', realShortName: 'VIF', realStadium: 'Intility Arena',
      fakeName: 'Oslobyen IF', shortName: 'OSL', fakeStadium: 'Intility Park',
      city: 'Oslo', colors: { primary: '#00529B', secondary: '#D60000' },
      stadiumCapacity: 16555, reputation: 3
    },
    {
      id: 'fredrikstad', realName: 'Fredrikstad FK', realShortName: 'FFK', realStadium: 'Fredrikstad Stadion',
      fakeName: 'Festungby FK', shortName: 'FES', fakeStadium: 'Festung Stadion',
      city: 'Fredrikstad', colors: { primary: '#D60000', secondary: '#FFFFFF' },
      stadiumCapacity: 12550, reputation: 3
    },
    {
      id: 'tromso-il', realName: 'Tromsø IL', realShortName: 'TIL', realStadium: 'Romssa Arena',
      fakeName: 'Polarlys IL', shortName: 'POL', fakeStadium: 'Nordpark Arena',
      city: 'Tromsø', colors: { primary: '#D60000', secondary: '#003DA5' },
      stadiumCapacity: 6859, reputation: 3
    },
    {
      id: 'lillestrom', realName: 'Lillestrøm SK', realShortName: 'LSK', realStadium: 'Åråsen Stadion',
      fakeName: 'Kanarifugl SK', shortName: 'KAN', fakeStadium: 'Åråsen Park',
      city: 'Lillestrøm', colors: { primary: '#FFD500', secondary: '#000000' },
      stadiumCapacity: 12000, reputation: 3
    },
    {
      id: 'sarpsborg-08', realName: 'Sarpsborg 08 FF', realShortName: 'SAR', realStadium: 'Sarpsborg Stadion',
      fakeName: 'Glomma FF', shortName: 'GLO', fakeStadium: 'Glomma Stadion',
      city: 'Sarpsborg', colors: { primary: '#002147', secondary: '#FFFFFF' },
      stadiumCapacity: 5000, reputation: 3
    },
    {
      id: 'haugesund', realName: 'FK Haugesund', realShortName: 'FKH', realStadium: 'Haugesund Stadion',
      fakeName: 'Kystby FK', shortName: 'KYS', fakeStadium: 'Kystbyen Stadion',
      city: 'Haugesund', colors: { primary: '#FFFFFF', secondary: '#000000' },
      stadiumCapacity: 8760, reputation: 3
    },
    {
      id: 'strømsgodset', realName: 'Strømsgodset IF', realShortName: 'SIF', realStadium: 'Marienlyst Stadion',
      fakeName: 'Marineblå IF', shortName: 'MBL', fakeStadium: 'Marinepark Stadion',
      city: 'Drammen', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 8930, reputation: 3
    },
    {
      id: 'ham-kam', realName: 'HamKam', realShortName: 'HAM', realStadium: 'Briskeby Gressbane',
      fakeName: 'Innlandet IL', shortName: 'INN', fakeStadium: 'Innlandet Gressbane',
      city: 'Hamar', colors: { primary: '#00854A', secondary: '#FFFFFF' },
      stadiumCapacity: 8150, reputation: 2
    },
    {
      id: 'kfum-oslo', realName: 'KFUM Oslo', realShortName: 'KFU', realStadium: 'Intility Arena',
      fakeName: 'Hovedstad KF', shortName: 'HVS', fakeStadium: 'Hovedstad Arena',
      city: 'Oslo', colors: { primary: '#FF9100', secondary: '#000000' },
      stadiumCapacity: 16555, reputation: 2
    },
    {
      id: 'sandefjord', realName: 'Sandefjord Fotball', realShortName: 'SAN', realStadium: 'Release Arena',
      fakeName: 'Kystland FK', shortName: 'KSL', fakeStadium: 'Vestfold Arena',
      city: 'Sandefjord', colors: { primary: '#003DA5', secondary: '#FFFFFF' },
      stadiumCapacity: 6500, reputation: 2
    },
    {
      id: 'kristiansund-bk', realName: 'Kristiansund BK', realShortName: 'KBK', realStadium: 'Kristiansund Stadion',
      fakeName: 'Havnebyen BK', shortName: 'HAV', fakeStadium: 'Havnebyen Stadion',
      city: 'Kristiansund', colors: { primary: '#003DA5', secondary: '#FFD500' },
      stadiumCapacity: 4444, reputation: 2
    }
  ]
};
