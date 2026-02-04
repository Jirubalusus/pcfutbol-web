#!/usr/bin/env node
// ============================================================
// Rename ALL public/data/*.json files with fictional names
// Applies same logic as rename-for-release.cjs but to JSON data
// ============================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// ============================================================
// TEAM NAME MAP (same as rename-for-release.cjs)
// ============================================================
const TEAM_NAME_MAP = {
  // === LALIGA ===
  'Real Madrid CF': 'Royal Zenith CF', 'Real Madrid': 'Royal Zenith CF',
  'FC Barcelona': 'Nova Blau FC', 'Barcelona': 'Nova Blau FC',
  'Atletico Madrid': 'Rojo Atlético', 'Atlético de Madrid': 'Rojo Atlético', 'Atlético Madrid': 'Rojo Atlético',
  'Athletic Club': 'Basque Lions AC', 'Athletic Bilbao': 'Basque Lions AC', 'Athletic Club de Bilbao': 'Basque Lions AC',
  'Real Sociedad': 'Coastal Reale',
  'Real Betis': 'Verdi Seviglia', 'Real Betis Balompié': 'Verdi Seviglia',
  'Villarreal CF': 'Amarillo CF', 'Villarreal': 'Amarillo CF',
  'Sevilla FC': 'Triana FC', 'Sevilla': 'Triana FC',
  'Valencia CF': 'Levante Bay CF', 'Valencia': 'Levante Bay CF',
  'Girona FC': 'Terra Brava FC', 'Girona': 'Terra Brava FC',
  'Real Valladolid': 'Meseta FC', 'Real Valladolid CF': 'Meseta FC',
  'RCD Mallorca': 'Balear FC', 'Mallorca': 'Balear FC',
  'Celta de Vigo': 'Galicia FC', 'RC Celta': 'Galicia FC', 'Celta Vigo': 'Galicia FC', 'RC Celta de Vigo': 'Galicia FC',
  'CA Osasuna': 'Navarra CA', 'Osasuna': 'Navarra CA',
  'Rayo Vallecano': 'Barrio FC',
  'RCD Espanyol': 'Periquito FC', 'Espanyol': 'Periquito FC',
  'Deportivo Alavés': 'Rioja Deportivo', 'Alavés': 'Rioja Deportivo',
  'CD Leganés': 'Sur Villa CD', 'Leganés': 'Sur Villa CD',
  'Getafe CF': 'Centauro CF', 'Getafe': 'Centauro CF',
  'UD Las Palmas': 'Islas Canaria UD', 'Las Palmas': 'Islas Canaria UD',
  'Real Zaragoza': 'Aragón FC',

  // === SEGUNDA ===
  'RC Deportivo': 'Oceanus Deportivo', 'Deportivo de La Coruña': 'Oceanus Deportivo', 'Deportivo La Coruña': 'Oceanus Deportivo',
  'Sporting de Gijón': 'Ember Sporting', 'Sporting Gijón': 'Ember Sporting',
  'Racing de Santander': 'Sentinel Racing', 'Racing Santander': 'Sentinel Racing',
  'CD Mirandés': 'CD Redoak', 'Mirandés': 'CD Redoak',
  'SD Eibar': 'SD Cobalt', 'Eibar': 'SD Cobalt',
  'CD Tenerife': 'CD Volcanic', 'Tenerife': 'CD Volcanic',
  'Albacete Balompié': 'Opal Balompié', 'Albacete': 'Opal Balompié',
  'Real Oviedo': 'Ashfield FC',
  'Levante UD': 'Sunrise UD', 'Levante': 'Sunrise UD',
  'SD Huesca': 'SD Stonewall', 'Huesca': 'SD Stonewall',
  'Elche CF': 'Palm Grove CF', 'Elche': 'Palm Grove CF',
  'FC Cartagena': 'FC Harbour', 'Cartagena': 'FC Harbour',
  'Burgos CF': 'Citadel CF', 'Burgos': 'Citadel CF',
  'CD Castellón': 'CD Rampart', 'Castellón': 'CD Rampart',
  'Granada CF': 'Alhambra CF', 'Granada': 'Alhambra CF',
  'Málaga CF': 'Coastline CF', 'Málaga': 'Coastline CF',
  'Córdoba CF': 'Mosaic CF', 'Córdoba': 'Mosaic CF',
  'CD Eldense': 'CD Pinewood', 'Eldense': 'CD Pinewood',
  'Racing de Ferrol': 'Anchor Racing', 'Racing Ferrol': 'Anchor Racing',

  // === PREMIER LEAGUE ===
  'Manchester City': 'Azure United',
  'Arsenal': 'Cannon Athletic',
  'Liverpool': 'Scarlet Port FC',
  'Manchester United': 'Old Reds United',
  'Chelsea': 'Royal Blues FC', 'Chelsea FC': 'Royal Blues FC',
  'Tottenham Hotspur': 'Ivory Hotspur', 'Tottenham': 'Ivory Hotspur', 'Spurs': 'Ivory Hotspur',
  'Newcastle United': 'Tyne United', 'Newcastle': 'Tyne United',
  'Aston Villa': 'Claret Villa',
  'Brighton & Hove Albion': 'Seagull Albion', 'Brighton': 'Seagull Albion',
  'West Ham United': 'Iron Hammers United', 'West Ham': 'Iron Hammers United',
  'AFC Bournemouth': 'Cherry Town FC', 'Bournemouth': 'Cherry Town FC',
  'Crystal Palace': 'Palace Eagles FC',
  'Fulham FC': 'Craven FC', 'Fulham': 'Craven FC',
  'Wolverhampton Wanderers': 'Golden Wolves FC', 'Wolverhampton': 'Golden Wolves FC', 'Wolves': 'Golden Wolves FC',
  'Everton': 'Toffee Blues FC', 'Everton FC': 'Toffee Blues FC',
  'Brentford': 'Hive City FC', 'Brentford FC': 'Hive City FC',
  'Nottingham Forest': 'Sherwood Forest FC',
  'Leicester City': 'Fox City FC', 'Leicester': 'Fox City FC',
  'Ipswich Town': 'Suffolk Town FC', 'Ipswich': 'Suffolk Town FC',
  'Southampton': 'Saints Port FC', 'Southampton FC': 'Saints Port FC',

  // === CHAMPIONSHIP ===
  'Leeds United': 'Roses United', 'Leeds': 'Roses United',
  'Burnley': 'Moor Town FC', 'Burnley FC': 'Moor Town FC',
  'Sheffield United': 'Steel City United', 'Sheffield Utd': 'Steel City United',
  'Sunderland': 'Wearside FC', 'Sunderland AFC': 'Wearside FC',
  'Norwich City': 'Canary City FC', 'Norwich': 'Canary City FC',
  'Middlesbrough': 'Tees Valley FC',
  'West Bromwich Albion': 'Throstle Albion', 'West Brom': 'Throstle Albion',
  'Coventry City': 'Sky Blue City FC', 'Coventry': 'Sky Blue City FC',
  'Bristol City': 'Avon City FC', 'Bristol': 'Avon City FC',
  'Watford': 'Hornet FC', 'Watford FC': 'Hornet FC',
  'Swansea City': 'Swan City FC', 'Swansea': 'Swan City FC',
  'Stoke City': 'Pottery FC', 'Stoke': 'Pottery FC',
  'Millwall': 'Lion Wall FC', 'Millwall FC': 'Lion Wall FC',
  'Blackburn Rovers': 'Rover FC', 'Blackburn': 'Rover FC',
  'Hull City': 'Tiger City FC', 'Hull': 'Tiger City FC',
  'Queens Park Rangers': 'Hoop Rangers', 'QPR': 'Hoop Rangers',
  'Preston North End': 'North End FC', 'Preston': 'North End FC',
  'Cardiff City': 'Bluebird City FC', 'Cardiff': 'Bluebird City FC',
  'Plymouth Argyle': 'Pilgrim FC', 'Plymouth': 'Pilgrim FC',
  'Sheffield Wednesday': 'Owlerton FC', 'Sheffield Wed': 'Owlerton FC',
  'Luton Town': 'Hatter Town FC', 'Luton': 'Hatter Town FC',
  'Derby County': 'Ram County FC', 'Derby': 'Ram County FC',
  'Oxford United': 'Scholar United', 'Oxford': 'Scholar United',
  'Portsmouth': 'Dockyard FC', 'Portsmouth FC': 'Dockyard FC',

  // === SERIE A ===
  'Inter Milan': 'Nerazzurri FC', 'Inter de Milán': 'Nerazzurri FC', 'Inter': 'Nerazzurri FC', 'FC Internazionale': 'Nerazzurri FC',
  'AC Milan': 'Rossoneri AC', 'Milan': 'Rossoneri AC',
  'Juventus': 'Torino Legacy', 'Juventus FC': 'Torino Legacy',
  'SSC Napoli': 'Vesuvio SC', 'Napoli': 'Vesuvio SC',
  'AS Roma': 'Lupa Roma AS', 'Roma': 'Lupa Roma AS',
  'SS Lazio': 'Aquila Celeste SS', 'Lazio': 'Aquila Celeste SS',
  'Atalanta': 'Orobici FC', 'Atalanta BC': 'Orobici FC',
  'ACF Fiorentina': 'Giglio Viola ACF', 'Fiorentina': 'Giglio Viola ACF',
  'Bologna FC': 'Rossoblu FC', 'Bologna': 'Rossoblu FC', 'Bologna FC 1909': 'Rossoblu FC',
  'Torino FC': 'Granata FC', 'Torino': 'Granata FC',
  'Udinese': 'Friuli FC', 'Udinese Calcio': 'Friuli FC',
  'Cagliari': 'Isolani FC', 'Cagliari Calcio': 'Isolani FC',
  'Empoli': 'Azzurri Toscani FC', 'Empoli FC': 'Azzurri Toscani FC',
  'Genoa CFC': 'Grifone CFC', 'Genoa': 'Grifone CFC',
  'Hellas Verona': 'Scaligeri FC', 'Verona': 'Scaligeri FC',
  'US Lecce': 'Salentini FC', 'Lecce': 'Salentini FC',
  'AC Monza': 'Brianza FC', 'Monza': 'Brianza FC',
  'Parma Calcio': 'Ducali FC', 'Parma': 'Ducali FC', 'Parma Calcio 1913': 'Ducali FC',
  'Venezia FC': 'Laguna FC', 'Venezia': 'Laguna FC',
  'Como 1907': 'Lariani FC', 'Como': 'Lariani FC',

  // === SERIE B ===
  'US Sassuolo': 'Neroverde FC', 'Sassuolo': 'Neroverde FC',
  'US Cremonese': 'Grigiorossi FC', 'Cremonese': 'Grigiorossi FC',
  'Sampdoria': 'Blucerchiati FC', 'UC Sampdoria': 'Blucerchiati FC',
  'Palermo': 'Rosanero FC', 'US Città di Palermo': 'Rosanero FC',
  'Brescia': 'Leonessa FC', 'Brescia Calcio': 'Leonessa FC',
  'Spezia': 'Aquilotti FC', 'Spezia Calcio': 'Aquilotti FC',
  'Modena': 'Canarini FC', 'Modena FC': 'Canarini FC',
  'Frosinone': 'Ciociari FC', 'Frosinone Calcio': 'Ciociari FC',
  'Salernitana': 'Granata Campani', 'US Salernitana': 'Granata Campani',
  'Catanzaro': 'Giallorossi Calabria', 'US Catanzaro': 'Giallorossi Calabria',
  'Bari': 'Galletti FC', 'SSC Bari': 'Galletti FC',
  'Pisa': 'Nerazzurri Toscani', 'Pisa SC': 'Nerazzurri Toscani', 'AC Pisa': 'Nerazzurri Toscani',
  'Reggiana': 'Granata Emilia', 'AC Reggiana': 'Granata Emilia',
  'Südtirol': 'Alpen FC', 'FC Südtirol': 'Alpen FC',
  'Cittadella': 'Granata Veneti', 'AS Cittadella': 'Granata Veneti',
  'Cosenza': 'Lupi Calabresi', 'Cosenza Calcio': 'Lupi Calabresi',
  'Mantova': 'Virgiliani FC', 'Mantova FC': 'Virgiliani FC',
  'Juve Stabia': 'Vespe Campane', 'SS Juve Stabia': 'Vespe Campane',
  'Cesena': 'Cavallucci FC', 'Cesena FC': 'Cavallucci FC',
  'Carrarese': 'Marmo FC', 'Carrarese Calcio': 'Marmo FC',

  // === BUNDESLIGA ===
  'Bayern Munich': 'Rot-Weiß Bayern', 'Bayern München': 'Rot-Weiß Bayern', 'FC Bayern Munich': 'Rot-Weiß Bayern', 'FC Bayern München': 'Rot-Weiß Bayern', 'Bayern Múnich': 'Rot-Weiß Bayern',
  'Borussia Dortmund': 'Gelbe Wand BV', 'BVB': 'Gelbe Wand BV',
  'Bayer Leverkusen': 'Rhein Werkself', 'Bayer 04 Leverkusen': 'Rhein Werkself',
  'RB Leipzig': 'Sachsen Stier',
  'VfB Stuttgart': 'Schwaben VfB', 'Stuttgart': 'Schwaben VfB',
  'Eintracht Frankfurt': 'Adler Eintracht', 'Frankfurt': 'Adler Eintracht',
  'SC Freiburg': 'Schwarzwald SC', 'Freiburg': 'Schwarzwald SC',
  'TSG Hoffenheim': 'Kraichgau TSG', 'Hoffenheim': 'Kraichgau TSG', 'TSG 1899 Hoffenheim': 'Kraichgau TSG',
  'VfL Wolfsburg': 'Wölfe VfL', 'Wolfsburg': 'Wölfe VfL',
  'Borussia Mönchengladbach': 'Fohlen BV', "Borussia M'gladbach": 'Fohlen BV', 'Gladbach': 'Fohlen BV',
  'Union Berlin': 'Eisern Berlin FC', '1. FC Union Berlin': 'Eisern Berlin FC',
  'Werder Bremen': 'Hanse Bremen FC', 'SV Werder Bremen': 'Hanse Bremen FC',
  'FC Augsburg': 'Fugger FC', 'Augsburg': 'Fugger FC',
  'Mainz 05': 'Fastnacht 05', '1. FSV Mainz 05': 'Fastnacht 05',
  '1. FC Heidenheim': 'Brenz FC', 'Heidenheim': 'Brenz FC',
  'FC St. Pauli': 'Hafen FC', 'St. Pauli': 'Hafen FC',
  'Holstein Kiel': 'Ostsee FC',

  // === 2. BUNDESLIGA ===
  'Hamburger SV': 'Elbe SV', 'HSV': 'Elbe SV',
  'Hertha BSC': 'Berliner BSC',
  '1. FC Köln': 'Dom FC', 'Köln': 'Dom FC', 'FC Köln': 'Dom FC',
  'Hannover 96': 'Niedersachsen 96', 'Hannover': 'Niedersachsen 96',
  'Fortuna Düsseldorf': 'Rhein Fortuna', 'Düsseldorf': 'Rhein Fortuna',
  'SC Paderborn': 'Ostwestfalen SC', 'Paderborn': 'Ostwestfalen SC', 'SC Paderborn 07': 'Ostwestfalen SC',
  'SV Darmstadt 98': 'Lilien SV', 'Darmstadt': 'Lilien SV', 'Darmstadt 98': 'Lilien SV',
  '1. FC Nürnberg': 'Franken FC', 'Nürnberg': 'Franken FC',
  'Karlsruher SC': 'Baden SC', 'Karlsruhe': 'Baden SC',
  'SpVgg Greuther Fürth': 'Kleeblatt SpVgg', 'Greuther Fürth': 'Kleeblatt SpVgg',
  'SV Elversberg': 'Saar SV', 'Elversberg': 'Saar SV',
  '1. FC Kaiserslautern': 'Pfalz FC', 'Kaiserslautern': 'Pfalz FC',
  'FC Schalke 04': 'Knappen FC', 'Schalke 04': 'Knappen FC', 'Schalke': 'Knappen FC',
  'SSV Jahn Regensburg': 'Donau SSV', 'Jahn Regensburg': 'Donau SSV',
  'Preußen Münster': 'Westfalen Preußen', 'SC Preußen Münster': 'Westfalen Preußen',
  'Eintracht Braunschweig': 'Löwen Eintracht', 'Braunschweig': 'Löwen Eintracht',
  'SSV Ulm 1846': 'Spatzen SSV', 'Ulm': 'Spatzen SSV',
  '1. FC Magdeburg': 'Sachsen-Anhalt FC', 'Magdeburg': 'Sachsen-Anhalt FC',

  // === LIGUE 1 ===
  'Paris Saint-Germain': 'Capital Saints FC', 'PSG': 'Capital Saints FC', 'Paris SG': 'Capital Saints FC',
  'Olympique de Marseille': 'Olympique Phocéen', 'Olympique Marseille': 'Olympique Phocéen', 'Marseille': 'Olympique Phocéen', 'OM': 'Olympique Phocéen',
  'AS Monaco': 'Riviera AS', 'Monaco': 'Riviera AS',
  'Olympique Lyonnais': 'Olympique Rhodanien', 'Olympique Lyon': 'Olympique Rhodanien', 'Lyon': 'Olympique Rhodanien', 'OL': 'Olympique Rhodanien',
  'LOSC Lille': 'Dogues du Nord', 'Lille': 'Dogues du Nord', 'Lille OSC': 'Dogues du Nord',
  'Stade Rennais': 'Stade Breton', 'Rennes': 'Stade Breton', 'Stade Rennais FC': 'Stade Breton',
  'RC Lens': 'Sang et Or RC', 'Lens': 'Sang et Or RC',
  'OGC Nice': 'Côte d\'Azur OGC', 'Nice': 'Côte d\'Azur OGC',
  'RC Strasbourg': 'Alsace FC', 'Strasbourg': 'Alsace FC', 'RC Strasbourg Alsace': 'Alsace FC',
  'Toulouse FC': 'Occitanie FC', 'Toulouse': 'Occitanie FC',
  'Montpellier HSC': 'Hérault FC', 'Montpellier': 'Hérault FC',
  'FC Nantes': 'Canaris FC', 'Nantes': 'Canaris FC',
  'Stade Brestois 29': 'Finistère FC', 'Stade Brestois': 'Finistère FC', 'Brest': 'Finistère FC',
  'Stade de Reims': 'Champagne FC', 'Reims': 'Champagne FC',
  'AJ Auxerre': 'Bourgogne FC', 'Auxerre': 'Bourgogne FC',
  'Le Havre AC': 'Normand AC', 'Le Havre': 'Normand AC',
  'AS Saint-Étienne': 'Loire AS', 'Saint-Étienne': 'Loire AS',
  'Angers SCO': 'Anjou SCO', 'Angers': 'Anjou SCO',

  // === LIGUE 2 ===
  'FC Lorient': 'Morbihan FC', 'Lorient': 'Morbihan FC',
  'FC Metz': 'Lorraine FC', 'Metz': 'Lorraine FC',
  'SM Caen': 'Calvados SM', 'Caen': 'Calvados SM',
  'Clermont Foot': 'Auvergne Foot', 'Clermont': 'Auvergne Foot',
  'Paris FC': 'Île-de-France FC',
  'Grenoble Foot 38': 'Alpes Foot', 'Grenoble': 'Alpes Foot',
  'Amiens SC': 'Picardie SC', 'Amiens': 'Picardie SC',
  'Guingamp': 'Armor Guingamp', 'EA Guingamp': 'Armor Guingamp',
  'SC Bastia': 'Corse SC', 'Bastia': 'Corse SC',
  'Rodez AF': 'Aveyron AF', 'Rodez': 'Aveyron AF',
  'Laval': 'Mayenne FC', 'Stade Lavallois': 'Mayenne FC',
  'US Dunkerque': 'Flandre US', 'Dunkerque': 'Flandre US',
  'AC Ajaccio': 'Corse AC', 'Ajaccio': 'Corse AC',
  'Pau FC': 'Béarn FC', 'Pau': 'Béarn FC',
  'Troyes': 'Aube FC', 'ESTAC Troyes': 'Aube FC',
  'Red Star FC': 'Étoile Rouge FC', 'Red Star': 'Étoile Rouge FC',
  'Martigues': 'Provence FC', 'FC Martigues': 'Provence FC',

  // === EREDIVISIE ===
  'Ajax': 'Canal FC', 'AFC Ajax': 'Canal FC',
  'PSV Eindhoven': 'Lumen FC', 'PSV': 'Lumen FC',
  'Feyenoord': 'Harbor Rotterdam', 'Feyenoord Rotterdam': 'Harbor Rotterdam',
  'AZ Alkmaar': 'Tulip AZ', 'AZ': 'Tulip AZ',
  'FC Twente': 'Twente FC', 'Twente': 'Twente FC',
  'FC Utrecht': 'Utrecht FC', 'Utrecht': 'Utrecht FC',
  'Vitesse': 'Arnhem FC',
  'SC Heerenveen': 'Frisian SC', 'Heerenveen': 'Frisian SC',
  'FC Groningen': 'Northern FC', 'Groningen': 'Northern FC',
  'Sparta Rotterdam': 'Sparta FC',
  'NEC Nijmegen': 'Eagle NEC', 'NEC': 'Eagle NEC',
  'Go Ahead Eagles': 'Pioneer Eagles',
  'Heracles Almelo': 'Heracles FC', 'Heracles': 'Heracles FC',
  'RKC Waalwijk': 'RKC FC',
  'PEC Zwolle': 'Overijssel FC',
  'FC Volendam': 'Polder FC',
  'Excelsior': 'Excelsior FC',
  'Willem II': 'Tilburg FC',
  'NAC Breda': 'Breda FC',
  'Almere City FC': 'Almere FC',

  // === PRIMEIRA LIGA ===
  'SL Benfica': 'Eagle SL', 'Benfica': 'Eagle SL',
  'FC Porto': 'Dragon FC', 'Porto': 'Dragon FC',
  'Sporting CP': 'Lion CP', 'Sporting': 'Lion CP', 'Sporting Lisboa': 'Lion CP',
  'SC Braga': 'Minho SC', 'Braga': 'Minho SC', 'Sporting de Braga': 'Minho SC',
  'Vitória SC': 'Vitória Guimarães FC', 'Vitória de Guimarães': 'Vitória Guimarães FC',
  'Casa Pia AC': 'Pátio AC',
  'Moreirense FC': 'Minho Verde FC', 'Moreirense': 'Minho Verde FC',
  'Santa Clara': 'Açores FC',
  'Rio Ave FC': 'Rio FC', 'Rio Ave': 'Rio FC',
  'Gil Vicente FC': 'Galo FC', 'Gil Vicente': 'Galo FC',
  'Famalicão': 'Minho Branco FC', 'FC Famalicão': 'Minho Branco FC',
  'Arouca': 'Serra FC', 'FC Arouca': 'Serra FC',
  'Boavista FC': 'Pantera FC', 'Boavista': 'Pantera FC',
  'Estoril Praia': 'Costa Sol FC', 'Estoril': 'Costa Sol FC',
  'Nacional': 'Ilha FC', 'CD Nacional': 'Ilha FC',
  'AVS': 'Alto Minho FC',
  'Estrela Amadora': 'Estrela FC', 'CF Estrela da Amadora': 'Estrela FC',
  'Farense': 'Algarve FC', 'SC Farense': 'Algarve FC',

  // === SCOTTISH ===
  'Celtic': 'Emerald FC', 'Celtic FC': 'Emerald FC',
  'Rangers': 'Crown Rangers', 'Rangers FC': 'Crown Rangers',
  'Aberdeen': 'Granite FC', 'Aberdeen FC': 'Granite FC',
  'Hearts': 'Maroon Hearts', 'Heart of Midlothian': 'Maroon Hearts',
  'Hibernian': 'Leith Hibs', 'Hibernian FC': 'Leith Hibs',
  'Kilmarnock': 'Ayrshire FC', 'Kilmarnock FC': 'Ayrshire FC',
  'Dundee United': 'Tangerine United',
  'St Mirren': 'Paisley FC',
  'Dundee FC': 'Dark Blue FC', 'Dundee': 'Dark Blue FC',
  'Motherwell': 'Steeltown FC', 'Motherwell FC': 'Steeltown FC',
  'Ross County': 'Highland FC',
  'St Johnstone': 'Perth Saints',

  // === SUPER LIG ===
  'Galatasaray': 'Golden Horn FC', 'Galatasaray SK': 'Golden Horn FC',
  'Fenerbahçe': 'Bosphorus FC', 'Fenerbahçe SK': 'Bosphorus FC',
  'Beşiktaş': 'Black Eagle FC', 'Beşiktaş JK': 'Black Eagle FC',
  'Trabzonspor': 'Pontus FC',
  'İstanbul Başakşehir': 'Crescent FC', 'Başakşehir': 'Crescent FC',
  'Sivasspor': 'Anatolia FC',
  'Kasımpaşa': 'Beyoğlu FC',
  'Antalyaspor': 'Riviera Turk FC',
  'Alanyaspor': 'Costa Turk FC',
  'Konyaspor': 'Mevlana FC',
  'Adana Demirspor': 'Çukurova FC',
  'Samsunspor': 'Kızılırmak FC',
  'Kayserispor': 'Erciyes FC',
  'Gaziantep FK': 'Zeugma FK',
  'Hatayspor': 'Antioch FC',
  'Pendikspor': 'Marmara FC',
  'Rizespor': 'Çay FC', 'Çaykur Rizespor': 'Çay FC',
  'Bodrum FK': 'Aegean FK',

  // === BELGIAN ===
  'Club Brugge KV': 'Flemish Crown', 'Club Brugge': 'Flemish Crown', 'Club Bruges': 'Flemish Crown',
  'RSC Anderlecht': 'Mauve RSC', 'Anderlecht': 'Mauve RSC',
  'Union Saint-Gilloise': 'Union SG', 'Union SG': 'Union SG',
  'KRC Genk': 'Limburg KRC', 'Genk': 'Limburg KRC',
  'Royal Antwerp FC': 'Royal Antwerp FC', 'Antwerp': 'Royal Antwerp FC',
  'Standard Liège': 'Meuse Standard', 'Standard': 'Meuse Standard', 'Standard de Liège': 'Meuse Standard',
  'KAA Gent': 'Buffalo AA', 'AA Gent': 'Buffalo AA', 'Gent': 'Buffalo AA',
  'Cercle Brugge': 'Cercle Vert',
  'KV Mechelen': 'Dijle KV', 'Mechelen': 'Dijle KV',
  'OH Leuven': 'Hageland OH',
  'Charleroi': 'Hainaut SC', 'Sporting Charleroi': 'Hainaut SC',
  'Westerlo': 'Kempen FC', 'KVC Westerlo': 'Kempen FC',
  'Sint-Truiden': 'Limburg ST', 'STVV': 'Limburg ST',
  'FCV Dender EH': 'Dender FC', 'Dender': 'Dender FC',
  'Beerschot': 'Kiel FC', 'Beerschot VA': 'Kiel FC',
  'KV Kortrijk': 'Leie KV', 'Kortrijk': 'Leie KV',

  // === SWISS ===
  'BSC Young Boys': 'Bern FC', 'Young Boys': 'Bern FC',
  'FC Basel': 'Rhein FC', 'Basel': 'Rhein FC',
  'FC Zürich': 'Limmat FC', 'Zürich': 'Limmat FC',
  'Servette FC': 'Genève FC', 'Servette': 'Genève FC',
  'FC Lugano': 'Ticino FC', 'Lugano': 'Ticino FC',
  'FC St. Gallen': 'Ostschweiz FC', 'St. Gallen': 'Ostschweiz FC',
  'FC Luzern': 'Vierwaldstätter FC', 'Luzern': 'Vierwaldstätter FC',
  'FC Sion': 'Valais FC', 'Sion': 'Valais FC',
  'Grasshopper Club': 'Zürich GC', 'Grasshoppers': 'Zürich GC', 'GC Zürich': 'Zürich GC',
  'FC Winterthur': 'Eulach FC', 'Winterthur': 'Eulach FC',
  'Lausanne-Sport': 'Léman FC', 'Lausanne': 'Léman FC',
  'Yverdon Sport': 'Jura FC', 'Yverdon': 'Jura FC',

  // === AUSTRIAN ===
  'Red Bull Salzburg': 'Salzach FC', 'RB Salzburg': 'Salzach FC',
  'SK Rapid Wien': 'Rapid Wien', 'Rapid Wien': 'Rapid Wien',
  'SK Sturm Graz': 'Steiermark FC', 'Sturm Graz': 'Steiermark FC',
  'Austria Wien': 'Donau Wien', 'FK Austria Wien': 'Donau Wien',
  'LASK': 'Oberösterreich FC', 'LASK Linz': 'Oberösterreich FC',
  'Wolfsberger AC': 'Kärnten AC', 'WAC': 'Kärnten AC',
  'TSV Hartberg': 'Hartberg TSV',
  'SCR Altach': 'Vorarlberg SCR', 'Altach': 'Vorarlberg SCR',
  'FC Blau-Weiß Linz': 'Linz BW', 'Blau-Weiß Linz': 'Linz BW',
  'Austria Klagenfurt': 'Wörthersee FC', 'SK Austria Klagenfurt': 'Wörthersee FC',
  'Grazer AK': 'Graz AK',
  'SV Ried': 'Innviertel SV', 'Ried': 'Innviertel SV',

  // === MLS ===
  'Inter Miami CF': 'Tropics Miami CF', 'Inter Miami': 'Tropics Miami CF',
  'LA Galaxy': 'Pacific Galaxy', 'Los Angeles Galaxy': 'Pacific Galaxy',
  'LAFC': 'Sunset FC', 'Los Angeles FC': 'Sunset FC',
  'New York Red Bulls': 'Metro Red Bulls', 'NY Red Bulls': 'Metro Red Bulls',
  'Atlanta United': 'Peach United', 'Atlanta United FC': 'Peach United',
  'Seattle Sounders FC': 'Cascade Sounders', 'Seattle Sounders': 'Cascade Sounders',
  'FC Cincinnati': 'Queen City FC', 'Cincinnati': 'Queen City FC',
  'Nashville SC': 'Music City SC',
  'Columbus Crew': 'Buckeye Crew',
  'Philadelphia Union': 'Liberty Union',
  'FC Dallas': 'Lone Star FC',
  'Austin FC': 'Capital Verde FC',
  'Portland Timbers': 'Timber Ridge FC',
  'Minnesota United FC': 'North Star United', 'Minnesota United': 'North Star United',
  'New York City FC': 'Empire City FC', 'NYCFC': 'Empire City FC',
  'Orlando City SC': 'Sunshine City SC', 'Orlando City': 'Sunshine City SC',
  'Real Salt Lake': 'Lakeshore FC',
  'Charlotte FC': 'Crown City FC',
  'Houston Dynamo': 'Bayou Dynamo', 'Houston Dynamo FC': 'Bayou Dynamo',
  'Sporting Kansas City': 'Heartland Sporting',
  'D.C. United': 'Federal United', 'DC United': 'Federal United',
  'St. Louis City SC': 'Gateway City SC', 'St Louis City': 'Gateway City SC',
  'San Jose Earthquakes': 'Valley Earthquakes',
  'CF Montréal': 'CF Mont-Royal', 'Montreal': 'CF Mont-Royal',
  'Toronto FC': 'Maple FC',
  'Vancouver Whitecaps FC': 'Pacific Whitecaps', 'Vancouver Whitecaps': 'Pacific Whitecaps',
  'Colorado Rapids': 'Mountain Rapids',
  'Chicago Fire FC': 'Windy City FC', 'Chicago Fire': 'Windy City FC',
  'New England Revolution': 'Patriot Revolution',
  'San Diego FC': 'Coastal FC',

  // === LIGA MX ===
  'Club América': 'Águila Dorada FC', 'América': 'Águila Dorada FC',
  'UNAM Pumas': 'Puma Azul FC', 'Pumas UNAM': 'Puma Azul FC',
  'Cruz Azul': 'Cruz Celeste',
  'Guadalajara': 'Tapatío FC', 'CD Guadalajara': 'Tapatío FC', 'Chivas': 'Tapatío FC',
  'Tigres UANL': 'Tigre Regio FC', 'Tigres': 'Tigre Regio FC',
  'CF Monterrey': 'Sierra FC', 'Monterrey': 'Sierra FC',
  'Santos Laguna': 'Laguna Verde FC',
  'Club León': 'Esmeralda FC', 'León': 'Esmeralda FC',
  'Deportivo Toluca': 'Volcán Rojo FC', 'Toluca': 'Volcán Rojo FC',
  'Atlas FC': 'Rojinegro FC', 'Atlas': 'Rojinegro FC',
  'CF Pachuca': 'Minero FC', 'Pachuca': 'Minero FC',
  'Club Necaxa': 'Rayo Eléctrico FC', 'Necaxa': 'Rayo Eléctrico FC',
  'Querétaro FC': 'Gallos FC', 'Querétaro': 'Gallos FC',
  'Club Puebla': 'Camoteros FC', 'Puebla': 'Camoteros FC',
  'Mazatlán FC': 'Puerto FC',
  'FC Juárez': 'Frontera FC', 'Juárez': 'Frontera FC',
  'Club Tijuana': 'Xolos FC', 'Tijuana': 'Xolos FC',
  'San Luis': 'Tuneros FC', 'Atlético de San Luis': 'Tuneros FC',

  // === J-LEAGUE ===
  'Vissel Kobe': 'Hyōgo FC',
  'Yokohama F. Marinos': 'Bay Marinos',
  'Kawasaki Frontale': 'Frontale FC',
  'Urawa Red Diamonds': 'Crimson Diamonds',
  'Kashima Antlers': 'Stag FC',
  'FC Tokyo': 'Capital FC',
  'Sanfrecce Hiroshima': 'Hiroshima Arrows',
  'Cerezo Osaka': 'Osaka Cerezo',
  'Gamba Osaka': 'Osaka Gamba',
  'Nagoya Grampus': 'Nagoya FC',
  'Kashiwa Reysol': 'Sol Reysol',
  'Sagan Tosu': 'Tosu FC',
  'Consadole Sapporo': 'Sapporo FC',
  'Avispa Fukuoka': 'Fukuoka FC',
  'Shimizu S-Pulse': 'Shimizu Pulse',
  'Albirex Niigata': 'Niigata FC',
  'Jubilo Iwata': 'Iwata FC',
  'Kyoto Sanga': 'Kyoto FC',
  'Tokyo Verdy': 'Verdy FC',
  'Machida Zelvia': 'Zelvia FC',

  // === SAUDI PRO LEAGUE ===
  'Al-Hilal': 'Crescent SC',
  'Al-Nassr': 'Victory FC',
  'Al-Ahli': 'National SFC',
  'Al-Ittihad': 'Unity FC',
  'Al-Shabab': 'Youth FC',
  'Al-Fateh': 'Conquest FC',
  'Al-Raed': 'Pioneer FC',
  'Al-Taawoun': 'Solidarity FC',
  'Al-Ettifaq': 'Accord FC',
  'Al-Feiha': 'Oasis FC',
  'Al-Riyadh': 'Capital SC',
  'Al-Wehda': 'United SC',
  'Abha Club': 'Highland Club',
  'Al-Khaleej': 'Gulf FC',
  'Al-Hazm': 'Resolve FC',
  'Al-Akhdoud': 'Trench FC',
  'Damac FC': 'Southern FC',
  'Al-Qadisiyah': 'Legacy FC',

  // === SOUTH AMERICAN ===
  // Argentina
  'River Plate': 'Río FC', 'CA River Plate': 'Río FC',
  'Boca Juniors': 'Xeneize FC', 'CA Boca Juniors': 'Xeneize FC',
  'Racing Club': 'Academia Racing',
  'Independiente': 'Rojo Independiente', 'CA Independiente': 'Rojo Independiente',
  'San Lorenzo': 'Ciclón FC', 'CA San Lorenzo': 'Ciclón FC',
  'Vélez Sársfield': 'Fortín FC', 'Vélez Sarsfield': 'Fortín FC', 'Club Atlético Vélez Sarsfield': 'Fortín FC',
  'Estudiantes de La Plata': 'Pincha FC', 'Estudiantes': 'Pincha FC', 'Estudiantes LP': 'Pincha FC',
  'Defensa y Justicia': 'Halcón FC',
  'Talleres de Córdoba': 'Talismán FC', 'Talleres': 'Talismán FC',
  'Argentinos Juniors': 'Bicho FC',
  'Lanús': 'Granate FC', 'CA Lanús': 'Granate FC',
  'Banfield': 'Taladro FC', 'CA Banfield': 'Taladro FC',
  'Huracán': 'Globo FC', 'CA Huracán': 'Globo FC',
  'Rosario Central': 'Canalla FC',
  "Newell's Old Boys": 'Lepra FC', 'Newells Old Boys': 'Lepra FC',
  'Godoy Cruz': 'Tomba FC',
  'Central Córdoba': 'Ferroviario FC', 'Central Córdoba (SdE)': 'Ferroviario FC',
  'Unión de Santa Fe': 'Tatengue FC', 'Unión': 'Tatengue FC',
  'Colón de Santa Fe': 'Sabalero FC', 'Colón': 'Sabalero FC',
  'Tigre': 'Matador FC', 'CA Tigre': 'Matador FC',
  'Gimnasia La Plata': 'Lobo FC', 'Gimnasia y Esgrima': 'Lobo FC',
  'Platense': 'Calamar FC', 'CA Platense': 'Calamar FC',
  'Barracas Central': 'Guapo FC',
  'Sarmiento de Junín': 'Verde FC', 'Sarmiento': 'Verde FC',
  'Instituto': 'Gloria FC', 'Instituto ACC': 'Gloria FC',
  'Belgrano': 'Pirata FC', 'Belgrano de Córdoba': 'Pirata FC',
  'Atlético Tucumán': 'Decano FC',

  // Brazil
  'Palmeiras': 'Verdão FC', 'SE Palmeiras': 'Verdão FC',
  'Flamengo': 'Rubro-Negro FC', 'CR Flamengo': 'Rubro-Negro FC',
  'Fluminense': 'Tricolor Carioca FC', 'Fluminense FC': 'Tricolor Carioca FC',
  'Grêmio': 'Tricolor Gaúcho FC', 'Grêmio FBPA': 'Tricolor Gaúcho FC',
  'Internacional': 'Colorado FC', 'SC Internacional': 'Colorado FC',
  'Atlético Mineiro': 'Galo FC', 'Atlético-MG': 'Galo FC', 'Clube Atlético Mineiro': 'Galo FC',
  'São Paulo': 'Tricolor Paulista FC', 'São Paulo FC': 'Tricolor Paulista FC',
  'Corinthians': 'Timão FC', 'SC Corinthians': 'Timão FC',
  'Santos FC': 'Peixe FC', 'Santos': 'Peixe FC',
  'Botafogo': 'Fogão FC', 'Botafogo FR': 'Fogão FC',
  'Cruzeiro': 'Raposa FC', 'Cruzeiro EC': 'Raposa FC',
  'Vasco da Gama': 'Almirante FC', 'CR Vasco da Gama': 'Almirante FC',
  'Bahia': 'Tricolor Baiano FC', 'EC Bahia': 'Tricolor Baiano FC',
  'Fortaleza': 'Leão do Pici', 'Fortaleza EC': 'Leão do Pici',

  // Colombia
  'Atlético Nacional': 'Verdolaga FC',
  'Millonarios': 'Azul Embajador',
  'América de Cali': 'Escarlata FC',
  'Deportivo Cali': 'Azucarero FC',

  // Chile
  'Colo-Colo': 'Cacique FC', 'Colo Colo': 'Cacique FC',
  'Universidad de Chile': 'Azul Universitario',
  'Universidad Católica': 'Cruzados FC',
  'Unión Española': 'Hispano FC',
  'Cobreloa': 'Minero Loíno',
  'Coquimbo Unido': 'Pirata del Norte',

  // Uruguay
  'Club Nacional': 'Bolso FC', 'Nacional': 'Bolso FC',
  'Peñarol': 'Aurinegro FC', 'CA Peñarol': 'Aurinegro FC',
  'Defensor Sporting': 'Violeta FC',
  'Liverpool FC Uruguay': 'Negriazul FC',
  'Montevideo Wanderers': 'Bohemio FC',

  // More
  'Liga Deportiva Universitaria': 'Universitarios FC', 'LDU Quito': 'Universitarios FC',
  'Barcelona SC': 'Torero SC',
  'Independiente del Valle': 'Valle FC',
  'Emelec': 'Eléctrico FC', 'CS Emelec': 'Eléctrico FC',
  'Deportivo Quito': 'Capitalino FC',
  'Olimpia': 'Franjeado FC', 'Club Olimpia': 'Franjeado FC',
  'Cerro Porteño': 'Ciclón Azulgrana',
  'Libertad': 'Gumarelo FC',
  'Guaraní': 'Aborigen FC', 'Club Guaraní': 'Aborigen FC',
  'Sol de América': 'Danzarín FC',
  'Alianza Lima': 'Íntimo FC',
  'Universitario de Deportes': 'Crema FC', 'Universitario': 'Crema FC',
  'Sporting Cristal': 'Celeste Rimense',
  'Melgar': 'Dominó FC', 'FBC Melgar': 'Dominó FC',
  'Cienciano': 'Imperial FC',
  'Municipal': 'Edil FC', 'Deportivo Municipal': 'Edil FC',
  'The Strongest': 'Tigre Altiplano',
  'Bolívar': 'Académico FC', 'Club Bolívar': 'Académico FC',
  'Jorge Wilstermann': 'Aviador FC',
  'Oriente Petrolero': 'Refinero FC',
  'Caracas FC': 'Capitalino Rojo',
  'Deportivo Táchira': 'Aurinegro Andino',
  'Monagas SC': 'Oriental SC',
  'Zamora FC': 'Llanero FC',
};

// ============================================================
// STADIUM MAP
// ============================================================
const STADIUM_NAME_MAP = {
  'Santiago Bernabéu': 'Crown Arena',
  'Spotify Camp Nou': 'Grand Coliseum', 'Camp Nou': 'Grand Coliseum',
  'Civitas Metropolitano': 'Titan Arena', 'Wanda Metropolitano': 'Titan Arena',
  'San Mamés': 'Coliseo del Norte',
  'Reale Arena': 'Silver Dome',
  'Benito Villamarín': 'Estadio Solar',
  'Estadio de la Cerámica': 'Hawk Stadium',
  'Ramón Sánchez-Pizjuán': 'Crimson Grounds',
  'Mestalla': 'Tidal Stadium',
  'Old Trafford': 'Fortress Ground',
  'Anfield': 'Scarlet Field',
  'Emirates Stadium': 'Cannon Park Stadium',
  'Etihad Stadium': 'Nova Stadium',
  'Stamford Bridge': 'Bridge Arena',
  'Tottenham Hotspur Stadium': 'Whitecrest Arena',
  'Allianz Arena': "Lion's Den Arena",
  'Signal Iduna Park': 'Signal Wall Stadium',
  'San Siro': 'Twin Towers Stadium', 'Stadio Giuseppe Meazza': 'Twin Towers Stadium',
  'Parc des Princes': 'Étoile Park',
  'Stade Vélodrome': 'Phocéen Arena',
  'Estádio da Luz': "Eagle's Nest",
  'Estádio do Dragão': "Dragon's Lair",
  'Johan Cruyff Arena': 'Canal Arena',
  'Philips Stadion': 'Lumen Park',
  'Juventus Stadium': 'Zebra Arena', 'Allianz Stadium': 'Zebra Arena',
  'Stadio Diego Armando Maradona': 'Vesuvio Stadium',
  'Stadio Olimpico': 'Gladiator Stadium',
  'Monumental de Núñez': 'Grand Monumental', 'Estadio Monumental': 'Grand Monumental',
  'La Bombonera': 'El Caldero', 'Alberto J. Armando': 'El Caldero',
  'Maracanã': 'Grande Arena', 'Estádio Maracanã': 'Grande Arena',
};

// ============================================================
// PLAYER NAME GENERATOR (same hash logic as rename-for-release.cjs)
// ============================================================
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

const FIRST_NAMES = {
  spanish: ['Adrián','Carlos','Diego','Ernesto','Fabián','Gonzalo','Héctor','Iván','Jorge','Luis','Manuel','Nicolás','Óscar','Pablo','Rafael','Sergio','Tomás','Valentín','Xavier','Álvaro','Bruno','César','Daniel','Emilio','Fernando','Gabriel','Hugo','Ismael','Jaime','Kevin','Lorenzo','Marcos','Néstor','Orlando','Pedro','Ramón','Salvador','Teodoro','Ulises','Víctor'],
  english: ['Aaron','Ben','Charlie','Dylan','Edward','Freddie','George','Harvey','Isaac','Jake','Kyle','Liam','Mason','Noah','Oliver','Patrick','Quinn','Ryan','Sam','Tyler','Victor','Wayne','Zack','Adam','Bradley','Craig','Declan','Elliot','Frank','Grant','Harry','Ian','Jamie','Keegan','Lewis','Morgan','Nathan','Owen','Perry','Ricky','Shane','Theo','Wyatt'],
  french: ['Adrien','Baptiste','Clément','Damien','Étienne','Florian','Gaston','Hervé','Jacques','Kévin','Laurent','Mathieu','Nicolas','Olivier','Philippe','Quentin','Rémi','Sébastien','Thierry','Valentin','Xavier','Yannick','Aurélien','Bastien','Cédric','Dorian','Émile','Fabrice','Gaspard','Henri'],
  german: ['Alexander','Benjamin','Christian','David','Erik','Felix','Georg','Hans','Jan','Klaus','Lukas','Markus','Niklas','Otto','Philipp','Ralf','Stefan','Thomas','Ulrich','Wolfgang','Andreas','Bastian','Christoph','Dominik','Florian','Heinrich','Jonas','Kevin','Leon','Moritz','Nils','Tobias'],
  italian: ['Alessandro','Bruno','Claudio','Davide','Emanuele','Fabio','Giacomo','Lorenzo','Marco','Nicola','Paolo','Riccardo','Stefano','Tommaso','Vincenzo','Alberto','Benedetto','Carlo','Daniele','Enrico','Franco','Gianluca','Luca','Matteo','Renzo','Silvio'],
  portuguese: ['André','Bernardo','Cristiano','Duarte','Eduardo','Francisco','Gonçalo','Henrique','Igor','João','Leonardo','Miguel','Nuno','Pedro','Rodrigo','Tiago','Vasco','Alexandre','Bruno','Diogo','Fábio','Gustavo','Hugo','Ivan','Kevin','Leandro','Matheus','Otávio','Rafael','Sérgio'],
  brazilian: ['Adriano','Bernardo','Caio','Davi','Enzo','Felipe','Guilherme','Heitor','Ícaro','Jonas','Kaique','Luciano','Murilo','Nícolas','Otávio','Paulo','Raí','Samuel','Thiago','Vinícius','Wallace','Yago','Anderson','Breno','Cássio','Douglas','Emanuel','Fabrício','Geraldo','Henrique'],
  dutch: ['Arjen','Bas','Casper','Daan','Edwin','Freek','Gijs','Henk','Ivo','Joost','Koen','Lars','Matthijs','Niels','Oscar','Pieter','Remco','Sander','Thijs','Vincent','Willem','Youri','Bram','Derk','Finn','Guus','Hugo','Jaap','Kevin','Lennart','Maarten'],
  argentinian: ['Agustín','Bautista','Camilo','Darío','Esteban','Franco','Gastón','Hernán','Ignacio','Joaquín','Leandro','Martín','Nahuel','Osvaldo','Patricio','Ramiro','Santiago','Tobías','Ulises','Valentín','Waldo','Ximeno','Aurelio','Benicio','Claudio','Diego','Elías','Facundo','Germán','Iñaki'],
  african: ['Amadou','Bakary','Cheick','Diallo','Emmanuel','Fousseni','Gueye','Hassan','Ibrahim','Juma','Kofi','Lamine','Moussa','Ndaye','Oumar','Pape','Rachid','Souleyman','Tidiane','Usman','Wilfried','Youssef','Abdou','Boubacar','Cissé','Drissa','Elia','Fode','Habib','Ismaël'],
  japanese: ['Akira','Daichi','Eiji','Fumiya','Gaku','Haruto','Itsuki','Jun','Kaito','Leo','Masato','Naoki','Riku','Shota','Takumi','Yuto','Kenji','Ryota','Sora','Hiro','Kenta','Minato','Ren','Shin','Taro','Yuki','Aoi','Hayato','Kohei','Ryo'],
  mexican: ['Alejandro','Braulio','César','Donaldo','Ernesto','Felipe','Gerardo','Horacio','Isaac','Javier','Kevin','León','Mauricio','Norberto','Octavio','Patricio','Raúl','Saúl','Tadeo','Uriel','Valentín','Wilfredo','Ximeno','Yahir','Alonso','Bernardo','Cristóbal','Dante','Efraín','Francisco'],
  generic: ['Adam','Alex','Anton','Artem','Boris','Dario','Emil','Filip','Ivan','Jan','Karl','Leo','Max','Milan','Niko','Patrik','Roman','Sven','Tomas','Viktor','Yuri','Zoran','Andrei','Denis','Emir','Gregor','Jakov','Luka','Matej','Nikola','Petar','Samir'],
};

const LAST_NAMES = {
  spanish: ['Aguirre','Bermejo','Castaño','Domínguez','Escalante','Figueroa','Gallardo','Hidalgo','Ibarra','Jurado','Laínez','Medrano','Navarrete','Ocampo','Palacios','Quintero','Robledo','Salcedo','Torralba','Uriarte','Valderrama','Zabaleta','Arévalo','Belmonte','Carrasco','Delgado','Estrada','Fuentes','Giraldo','Heredia'],
  english: ['Ashford','Blackwell','Crawford','Dawson','Ellwood','Fletcher','Greenwood','Hammond','Irving','Jennings','Kingsley','Lambert','Morrison','Norwood','Osborne','Prescott','Radford','Shelton','Thornton','Underwood','Vernon','Whitfield','Barrett','Caldwell','Dixon','Emerson','Gifford','Hayward','Keating','Lawson'],
  french: ['Arnaud','Beaumont','Chevalier','Dubois','Fontaine','Girard','Hubert','Joubert','Lacroix','Moreau','Pelletier','Renard','Saunier','Tessier','Vasseur','Beauchamp','Carpentier','Delacroix','Favre','Gauthier','Lefevre','Masson','Perrin','Roche','Thibault'],
  german: ['Albrecht','Baumann','Cramer','Dietrich','Engel','Fischer','Gruber','Hartmann','Jäger','Kessler','Lehmann','Meister','Naumann','Oehler','Pfeiffer','Richter','Schreiber','Tiedemann','Ullrich','Vogt','Wagner','Brandt','Drescher','Falk','Geiger','Heider','Kirchner','Lindner','Merkel','Neubauer'],
  italian: ['Amato','Barbieri','Colombo','Donati','Esposito','Ferrara','Galli','Lombardi','Marchetti','Napoli','Orsini','Pagano','Rinaldi','Santoro','Trevisan','Vitale','Barone','Caruso','DeLuca','Falcone','Greco','Leone','Moretti','Palmieri','Romano','Sorrentino'],
  portuguese: ['Almeida','Baptista','Cardoso','Domingues','Esteves','Faria','Guerreiro','Henriques','Leitão','Magalhães','Neves','Oliveira','Peixoto','Quaresma','Rocha','Saraiva','Tavares','Valente','Azevedo','Borges','Coelho','Duarte','Fernandes','Gaspar','Machado','Nogueira','Pinto','Ramos','Sousa'],
  brazilian: ['Alcântara','Barbosa','Cardoso','Drummond','Esperança','Ferreira','Gonçalves','Holanda','Junqueira','Lacerda','Monteiro','Nascimento','Olímpio','Pereira','Queiroz','Rezende','Silveira','Teixeira','Ventura','Zanetti','Alencar','Braga','Campos','Dutra','Fontes','Guedes','Linhares','Moraes','Novaes','Pacheco'],
  dutch: ['Bakker','Dekker','Evers','Hendriks','Janssen','Kuiper','Mulder','Peeters','Smit','VanDijk','Visser','Willems','Aalbers','Bos','Claassen','Driessen','Geerts','Hoekstra','Jansen','Koster','Meijer','Nijhuis','Pieters','Scholten','Timmermans','Veenstra','Wolters'],
  argentinian: ['Acosta','Bustos','Córdoba','Delgado','Echeverría','Funes','Guzmán','Herrera','Iturbe','Juárez','Lovera','Mendoza','Navarro','Orozco','Peralta','Quiroga','Ríos','Saavedra','Tolosa','Urquiza','Vázquez','Zamora','Arroyo','Bravo','Ceballos','Dorrego','Escobar','Franco','Giménez','Ledesma'],
  african: ['Aboubakar','Bamba','Coulibaly','Diawara','Fofana','Gnamba','Haidara','Kanté','Konaté','Maïga','Ndiaye','Ouédraogo','Sangaré','Touré','Diop','Keita','Sylla','Traoré','Mensah','Appiah','Frimpong','Boateng','Tetteh','Opoku','Kamara','Sesay','Koroma','Bangura'],
  japanese: ['Fujimoto','Hasegawa','Inoue','Kimura','Matsuda','Nakagawa','Ogawa','Sakamoto','Taniguchi','Ueda','Watanabe','Yamashita','Aoki','Chiba','Endo','Furukawa','Goto','Honda','Ishida','Kato','Morita','Nishida','Okada','Sato','Takahashi','Uchida','Yoshida'],
  mexican: ['Alcalá','Barrera','Cisneros','Dávila','Elizondo','Fierro','Garza','Hinojosa','Ibarra','Jaramillo','Lozano','Madrigal','Olivas','Padilla','Quezada','Rentería','Salinas','Treviño','Urrutia','Villalobos','Zapata','Andrade','Balderas','Camacho','Duarte','Espinoza','Flores','Garibay','León','Monroy'],
  generic: ['Aleksic','Babic','Cvetkovic','Djordjevic','Filipovic','Grujic','Horvat','Ivanovic','Jankovic','Kovac','Lazarevic','Markovic','Novak','Obradovic','Pavlovic','Radic','Simic','Todorovic','Vukadinovic','Zivkovic','Andric','Brkic','Cerovic','Dragovic','Gaspar','Ilic','Krstic','Lukic','Milic','Petrovic'],
};

// ============================================================
// Detect nationality from JSON filename
// ============================================================
function guessNationality(jsonFile, playerName) {
  const h = hash(playerName);
  const f = jsonFile.toLowerCase();
  if (f.includes('laliga') || f.includes('segunda') || f.includes('primera-rfef') || f.includes('segunda-rfef')) return pick(['spanish','spanish','spanish','portuguese','french','argentinian','brazilian'], h);
  if (f.includes('premier') || f.includes('championship')) return pick(['english','english','english','french','dutch','african','brazilian','spanish'], h);
  if (f.includes('seriea') || f.includes('serieb') || f.includes('serie')) return pick(['italian','italian','italian','argentinian','brazilian','french','african'], h);
  if (f.includes('bundesliga')) return pick(['german','german','german','french','dutch','african','japanese'], h);
  if (f.includes('ligue')) return pick(['french','french','french','african','african','brazilian','portuguese'], h);
  if (f.includes('eredivisie')) return pick(['dutch','dutch','dutch','african','brazilian','german'], h);
  if (f.includes('primeira') && !f.includes('rfef')) return pick(['portuguese','portuguese','portuguese','brazilian','african','spanish'], h);
  if (f.includes('scottish')) return pick(['english','english','english','generic'], h);
  if (f.includes('belgian')) return pick(['french','dutch','african','generic'], h);
  if (f.includes('superlig') || f.includes('super-lig')) return pick(['generic','generic','african','brazilian','french'], h);
  if (f.includes('mls') || f.includes('american')) return pick(['english','english','mexican','argentinian','brazilian','african'], h);
  if (f.includes('ligamx') || f.includes('azteca')) return pick(['mexican','mexican','mexican','argentinian','brazilian'], h);
  if (f.includes('jleague') || f.includes('sakura')) return pick(['japanese','japanese','japanese','brazilian','generic'], h);
  if (f.includes('saudi') || f.includes('arabian')) return pick(['generic','african','brazilian','french','portuguese','spanish'], h);
  if (f.includes('austrian') || f.includes('swiss') || f.includes('danube') || f.includes('alpine')) return pick(['german','german','generic','african'], h);
  if (f.includes('croatian') || f.includes('czech') || f.includes('danish') || f.includes('greek')) return pick(['generic','generic','generic','african'], h);
  if (f.includes('argentin')) return pick(['argentinian','argentinian','argentinian','brazilian','spanish'], h);
  if (f.includes('brasil')) return pick(['brazilian','brazilian','brazilian','argentinian','portuguese'], h);
  if (f.includes('colomb')) return pick(['spanish','spanish','argentinian','brazilian'], h);
  if (f.includes('chile') || f.includes('uruguay') || f.includes('paraguay') || f.includes('peru') || f.includes('bolivia') || f.includes('ecuador') || f.includes('venezuel')) return pick(['spanish','spanish','argentinian','brazilian'], h);
  return pick(['generic','spanish','english','french','german','italian'], h);
}

function generateFictionalName(originalName, jsonFile) {
  const h = hash(originalName + jsonFile);
  const nat = guessNationality(jsonFile, originalName);
  
  const firstPool = FIRST_NAMES[nat] || FIRST_NAMES.generic;
  const lastPool = LAST_NAMES[nat] || LAST_NAMES.generic;
  
  const parts = originalName.split(' ').filter(p => p.length > 1);
  const firstInitial = parts[0] ? parts[0][0].toUpperCase() : '';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
  
  const matchingFirsts = firstPool.filter(n => n[0].toUpperCase() === firstInitial);
  const matchingLasts = lastPool.filter(n => n[0].toUpperCase() === (lastInitial || firstInitial));
  
  const firstName = matchingFirsts.length > 0 ? pick(matchingFirsts, h) : pick(firstPool, h);
  const lastName = matchingLasts.length > 0 ? pick(matchingLasts, hash(originalName + 'last')) : pick(lastPool, hash(originalName + 'last'));
  
  if (parts.length === 1) return firstName;
  
  const origHasInitial = parts.some(p => p.length <= 2 && p.includes('.'));
  const style = h % 5;
  if (origHasInitial || style === 3) return `${firstName[0]}. ${lastName}`;
  return `${firstName} ${lastName}`;
}

// ============================================================
// PROCESS ALL JSON FILES
// ============================================================

const SKIP_FILES = new Set(['index.json', 'free-agents.json', 'segundaRfefG5.json']);

function processJsonFile(filePath) {
  const fileName = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.log(`  ⚠️ Cannot parse ${fileName}: ${e.message}`);
    return { changes: 0 };
  }
  
  let changes = 0;
  const usedNames = new Set();
  
  function getUniqueName(original) {
    let name = generateFictionalName(original, fileName);
    let attempt = 0;
    while (usedNames.has(name) && attempt < 10) {
      name = generateFictionalName(original + attempt.toString(), fileName);
      attempt++;
    }
    usedNames.add(name);
    return name;
  }
  
  function renameTeam(team) {
    if (!team) return;
    
    // Rename team name
    if (team.name) {
      const mapped = TEAM_NAME_MAP[team.name];
      if (mapped) {
        team.name = mapped;
        changes++;
      }
    }
    
    // Rename stadium
    if (team.stadium) {
      const mapped = STADIUM_NAME_MAP[team.stadium];
      if (mapped) {
        team.stadium = mapped;
        changes++;
      }
    }
    
    // Rename players
    if (team.players && Array.isArray(team.players)) {
      for (const player of team.players) {
        if (player.name) {
          const newName = getUniqueName(player.name);
          player.name = newName;
          changes++;
        }
      }
    }
  }
  
  // Handle different JSON structures
  if (Array.isArray(data)) {
    // Most files: array of teams
    for (const team of data) {
      renameTeam(team);
    }
  } else if (data.allTeams && Array.isArray(data.allTeams)) {
    // RFEF files: { groups: {...}, allTeams: [...] }
    for (const team of data.allTeams) {
      renameTeam(team);
    }
    if (data.groups) {
      for (const groupTeams of Object.values(data.groups)) {
        if (Array.isArray(groupTeams)) {
          for (const team of groupTeams) {
            renameTeam(team);
          }
        }
      }
    }
  } else if (typeof data === 'object') {
    // Object with team entries
    for (const val of Object.values(data)) {
      if (val && typeof val === 'object' && val.players) {
        renameTeam(val);
      }
    }
  }
  
  // Write back (minified)
  fs.writeFileSync(filePath, JSON.stringify(data));
  return { changes };
}

// ============================================================
// MAIN
// ============================================================

console.log('🏟️  Renaming all public/data/*.json files with fictional names');
console.log('================================================================\n');

const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !SKIP_FILES.has(f));
let totalChanges = 0;
let filesProcessed = 0;

for (const file of jsonFiles.sort()) {
  const filePath = path.join(DATA_DIR, file);
  const { changes } = processJsonFile(filePath);
  if (changes > 0) {
    console.log(`  ✅ ${file}: ${changes} changes`);
    totalChanges += changes;
  } else {
    console.log(`  ⏭️  ${file}: no changes needed`);
  }
  filesProcessed++;
}

// Also update free-agents.json
const freeAgentsPath = path.join(DATA_DIR, 'free-agents.json');
if (fs.existsSync(freeAgentsPath)) {
  const fa = JSON.parse(fs.readFileSync(freeAgentsPath, 'utf-8'));
  let faChanges = 0;
  const usedNames = new Set();
  if (Array.isArray(fa)) {
    for (const player of fa) {
      if (player.name) {
        let name = generateFictionalName(player.name, 'free-agents.json');
        let attempt = 0;
        while (usedNames.has(name) && attempt < 10) {
          name = generateFictionalName(player.name + attempt.toString(), 'free-agents.json');
          attempt++;
        }
        usedNames.add(name);
        player.name = name;
        faChanges++;
      }
    }
  }
  fs.writeFileSync(freeAgentsPath, JSON.stringify(fa));
  console.log(`  ✅ free-agents.json: ${faChanges} changes`);
  totalChanges += faChanges;
}

console.log(`\n✅ DONE! ${totalChanges} total changes across ${filesProcessed + 1} files`);
