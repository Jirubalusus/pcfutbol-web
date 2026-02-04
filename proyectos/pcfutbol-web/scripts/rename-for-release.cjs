#!/usr/bin/env node
// ============================================================
// SCRIPT: Generación de nombres ficticios para publicación
// Nombres 100% inventados, sin parecido fonético con reales
// ============================================================

const fs = require('fs');
const path = require('path');

// ============================================================
// UTILIDADES
// ============================================================

// Hash determinista para consistencia
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

// ============================================================
// 1. NOMBRES DE EQUIPOS — 100% ficticios
// ============================================================
const TEAM_NAME_MAP = {
  // === LALIGA ===
  'Real Madrid CF': 'Royal Zenith CF',
  'FC Barcelona': 'Nova Blau FC',
  'Atletico Madrid': 'Rojo Atlético',
  'Atlético de Madrid': 'Rojo Atlético',
  'Athletic Club': 'Basque Lions AC',
  'Real Sociedad': 'Coastal Reale',
  'Real Betis': 'Verdi Seviglia',
  'Villarreal CF': 'Amarillo CF',
  'Sevilla FC': 'Triana FC',
  'Valencia CF': 'Levante Bay CF',
  'Girona FC': 'Terra Brava FC',
  'Real Valladolid': 'Meseta FC',
  'RCD Mallorca': 'Balear FC',
  'Celta de Vigo': 'Galicia FC',
  'CA Osasuna': 'Navarra CA',
  'Rayo Vallecano': 'Barrio FC',
  'RCD Espanyol': 'Periquito FC',
  'Deportivo Alavés': 'Rioja Deportivo',
  'CD Leganés': 'Sur Villa CD',
  'Getafe CF': 'Centauro CF',
  'UD Las Palmas': 'Islas Canaria UD',
  'Real Zaragoza': 'Aragón FC',

  // === SEGUNDA ===
  'RC Deportivo': 'Oceanus Deportivo',
  'Sporting de Gijón': 'Ember Sporting',
  'Racing de Santander': 'Sentinel Racing',
  'Racing Santander': 'Sentinel Racing',
  'CD Mirandés': 'CD Redoak',
  'SD Eibar': 'SD Cobalt',
  'CD Tenerife': 'CD Volcanic',
  'Albacete Balompié': 'Opal Balompié',
  'Real Oviedo': 'Ashfield FC',
  'Levante UD': 'Sunrise UD',
  'SD Huesca': 'SD Stonewall',
  'Elche CF': 'Palm Grove CF',
  'FC Cartagena': 'FC Harbour',
  'Burgos CF': 'Citadel CF',
  'CD Castellón': 'CD Rampart',
  'Granada CF': 'Alhambra CF',
  'Málaga CF': 'Coastline CF',
  'Córdoba CF': 'Mosaic CF',
  'CD Eldense': 'CD Pinewood',
  'Racing de Ferrol': 'Anchor Racing',

  // === PREMIER LEAGUE ===
  'Manchester City': 'Azure United',
  'Arsenal': 'Cannon Athletic',
  'Liverpool': 'Scarlet Port FC',
  'Manchester United': 'Old Reds United',
  'Chelsea': 'Royal Blues FC',
  'Tottenham Hotspur': 'Ivory Hotspur',
  'Tottenham': 'Ivory Hotspur',
  'Newcastle United': 'Tyne United',
  'Newcastle': 'Tyne United',
  'Aston Villa': 'Claret Villa',
  'Brighton': 'Seagull Albion',
  'Brighton & Hove Albion': 'Seagull Albion',
  'West Ham United': 'Iron Hammers United',
  'West Ham': 'Iron Hammers United',
  'Bournemouth': 'Cherry Town FC',
  'AFC Bournemouth': 'Cherry Town FC',
  'Crystal Palace': 'Palace Eagles FC',
  'Fulham': 'Craven FC',
  'Wolverhampton': 'Golden Wolves FC',
  'Wolverhampton Wanderers': 'Golden Wolves FC',
  'Everton': 'Toffee Blues FC',
  'Brentford': 'Hive City FC',
  'Nottingham Forest': 'Sherwood Forest FC',
  'Leicester City': 'Fox City FC',
  'Ipswich Town': 'Suffolk Town FC',
  'Southampton': 'Saints Port FC',

  // === SERIE A ===
  'Inter de Milán': 'Nerazzurri FC',
  'Inter Milan': 'Nerazzurri FC',
  'AC Milan': 'Rossoneri AC',
  'Juventus': 'Torino Legacy',
  'SSC Napoli': 'Vesuvio SC',
  'Napoli': 'Vesuvio SC',
  'AS Roma': 'Lupa Roma AS',
  'SS Lazio': 'Aquila Celeste SS',
  'Atalanta': 'Orobici FC',
  'ACF Fiorentina': 'Giglio Viola ACF',
  'Fiorentina': 'Giglio Viola ACF',
  'Bologna FC': 'Rossoblu FC',
  'Torino': 'Granata FC',
  'Udinese': 'Friuli FC',
  'Cagliari': 'Isolani FC',
  'Empoli': 'Azzurri Toscani FC',
  'Genoa': 'Grifone CFC',
  'Hellas Verona': 'Scaligeri FC',
  'US Lecce': 'Salentini FC',
  'Monza': 'Brianza FC',
  'Parma': 'Ducali FC',
  'Venezia FC': 'Laguna FC',
  'Como 1907': 'Lariani FC',

  // === BUNDESLIGA ===
  'Bayern Múnich': 'Rot-Weiß Bayern',
  'Bayern München': 'Rot-Weiß Bayern',
  'Borussia Dortmund': 'Gelbe Wand BV',
  'Bayer Leverkusen': 'Rhein Werkself',
  'RB Leipzig': 'Sachsen Stier',
  'VfB Stuttgart': 'Schwaben VfB',
  'Eintracht Frankfurt': 'Adler Eintracht',
  'SC Freiburg': 'Schwarzwald SC',
  'TSG Hoffenheim': 'Kraichgau TSG',
  'Wolfsburg': 'Wölfe VfL',
  'Borussia M\'gladbach': 'Fohlen BV',
  'Borussia Mönchengladbach': 'Fohlen BV',
  'Union Berlin': 'Eisern Berlin FC',
  'Werder Bremen': 'Hanse Bremen FC',
  'FC Augsburg': 'Fugger FC',
  'Mainz 05': 'Fastnacht 05',
  '1. FC Heidenheim': 'Brenz FC',
  'FC St. Pauli': 'Hafen FC',
  'Holstein Kiel': 'Ostsee FC',

  // === LIGUE 1 ===
  'Paris Saint-Germain': 'Capital Saints FC',
  'PSG': 'Capital Saints FC',
  'Olympique Marseille': 'Olympique Phocéen',
  'AS Monaco': 'Riviera AS',
  'Olympique Lyon': 'Olympique Rhodanien',
  'LOSC Lille': 'Dogues du Nord',
  'Stade Rennais': 'Stade Breton',
  'RC Lens': 'Sang et Or RC',
  'OGC Nice': 'Côte d\'Azur OGC',
  'Strasbourg': 'Alsace FC',
  'Toulouse FC': 'Occitanie FC',
  'Montpellier': 'Hérault FC',
  'Nantes': 'Canaris FC',
  'Stade Brestois': 'Finistère FC',
  'Stade de Reims': 'Champagne FC',

  // === EREDIVISIE ===
  'Ajax': 'Canal FC',
  'PSV Eindhoven': 'Lumen FC',
  'PSV': 'Lumen FC',
  'Feyenoord': 'Harbor Rotterdam',
  'AZ Alkmaar': 'Tulip AZ',
  'FC Twente': 'Twente FC',
  'FC Utrecht': 'Utrecht FC',
  'Vitesse': 'Arnhem FC',
  'SC Heerenveen': 'Frisian SC',
  'FC Groningen': 'Northern FC',
  'Sparta Rotterdam': 'Sparta FC',
  'NEC Nijmegen': 'Eagle NEC',
  'Go Ahead Eagles': 'Pioneer Eagles',
  'Heracles Almelo': 'Heracles FC',
  'RKC Waalwijk': 'RKC FC',
  'PEC Zwolle': 'Overijssel FC',
  'FC Volendam': 'Polder FC',
  'Excelsior': 'Excelsior FC',

  // === PRIMEIRA LIGA ===
  'SL Benfica': 'Eagle SL',
  'Benfica': 'Eagle SL',
  'FC Porto': 'Dragon FC',
  'Sporting CP': 'Lion CP',
  'Sporting Lisboa': 'Lion CP',
  'Sporting de Lisboa': 'Lion CP',
  'SC Braga': 'Minho SC',

  // === SCOTTISH ===
  'Celtic FC': 'Emerald FC',
  'Rangers': 'Crown Rangers',
  'Aberdeen': 'Granite FC',
  'Hearts': 'Maroon Hearts',
  'Hibernian': 'Leith Hibs',
  'Kilmarnock': 'Ayrshire FC',
  'Dundee United': 'Tangerine United',
  'St Mirren': 'Paisley FC',
  'Dundee': 'Dark Blue FC',
  'Motherwell': 'Steeltown FC',
  'Ross County': 'Highland FC',
  'Livingston': 'West Lothian FC',

  // === SUPER LIG ===
  'Galatasaray': 'Golden Horn FC',
  'Fenerbahçe': 'Bosphorus FC',
  'Beşiktaş': 'Black Eagle FC',
  'Trabzonspor': 'Pontus FC',
  'Başakşehir': 'Crescent FC',

  // === BELGIAN ===
  'Club Brugge': 'Flemish Crown',
  'Club Brujas KV': 'Flemish Crown',
  'RSC Anderlecht': 'Mauve RSC',
  'Union Saint-Gilloise': 'Union SG',
  'KRC Genk': 'Limburg KRC',
  'Royal Antwerp': 'Royal Antwerp FC',
  'Standard Liège': 'Meuse Standard',
  'AA Gent': 'Buffalo AA',

  // === MLS ===
  'Inter Miami CF': 'Tropics Miami CF',
  'LA Galaxy': 'Pacific Galaxy',
  'LAFC': 'Sunset FC',
  'New York Red Bulls': 'Metro Red Bulls',
  'Atlanta United': 'Peach United',
  'Seattle Sounders': 'Cascade Sounders',
  'FC Cincinnati': 'Queen City FC',
  'Nashville SC': 'Music City SC',
  'Columbus Crew': 'Buckeye Crew',
  'Philadelphia Union': 'Liberty Union',
  'FC Dallas': 'Lone Star FC',
  'Austin FC': 'Capital Verde FC',
  'Portland Timbers': 'Timber Ridge FC',
  'Minnesota United': 'North Star United',
  'New York City FC': 'Empire City FC',
  'Orlando City SC': 'Sunshine City SC',
  'Real Salt Lake': 'Lakeshore FC',
  'Charlotte FC': 'Crown City FC',
  'Houston Dynamo': 'Bayou Dynamo',
  'Sporting Kansas City': 'Heartland Sporting',
  'D.C. United': 'Federal United',
  'St. Louis City SC': 'Gateway City SC',
  'San Jose Earthquakes': 'Valley Earthquakes',
  'CF Montréal': 'CF Mont-Royal',
  'Toronto FC': 'Maple FC',
  'Vancouver Whitecaps': 'Pacific Whitecaps',
  'Colorado Rapids': 'Mountain Rapids',
  'Chicago Fire FC': 'Windy City FC',
  'New England Revolution': 'Patriot Revolution',
  'San Diego FC': 'Coastal FC',

  // === LIGA MX ===
  'Club América': 'Águila Dorada FC',
  'UNAM Pumas': 'Puma Azul FC',
  'Cruz Azul': 'Cruz Celeste',
  'Guadalajara': 'Tapatío FC',
  'Chivas': 'Tapatío FC',
  'Tigres UANL': 'Tigre Regio FC',
  'CF Monterrey': 'Sierra FC',
  'Santos Laguna': 'Laguna Verde FC',
  'León': 'Esmeralda FC',
  'Toluca': 'Volcán Rojo FC',
  'Atlas': 'Rojinegro FC',
  'Pachuca': 'Minero FC',
  'Necaxa': 'Rayo Eléctrico FC',
  'Querétaro': 'Gallos FC',
  'Puebla': 'Camoteros FC',
  'Mazatlán FC': 'Puerto FC',
  'Juárez FC': 'Frontera FC',
  'Tijuana': 'Xolos FC',
};

// === ESTADIOS — nombres abstractos/creativos ===
const STADIUM_NAME_MAP = {
  'Santiago Bernabéu': 'Crown Arena',
  'Spotify Camp Nou': 'Grand Coliseum',
  'Camp Nou': 'Grand Coliseum',
  'Civitas Metropolitano': 'Titan Arena',
  'Wanda Metropolitano': 'Titan Arena',
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
  'Allianz Arena': 'Lion\'s Den Arena',
  'Signal Iduna Park': 'Signal Wall Stadium',
  'San Siro': 'Twin Towers Stadium',
  'Stadio Giuseppe Meazza': 'Twin Towers Stadium',
  'Parc des Princes': 'Étoile Park',
  'Stade Vélodrome': 'Phocéen Arena',
  'Estádio da Luz': 'Eagle\'s Nest',
  'Estádio do Dragão': 'Dragon\'s Lair',
  'Johan Cruyff Arena': 'Canal Arena',
  'Philips Stadion': 'Lumen Park',
  'Juventus Stadium': 'Zebra Arena',
  'Allianz Stadium': 'Zebra Arena',
  'Stadio Diego Armando Maradona': 'Vesuvio Stadium',
  'Stadio Olimpico': 'Gladiator Stadium',
};

// === LIGAS ===
const LEAGUE_NAME_MAP = {
  'LaLiga': 'Liga Ibérica',
  'La Liga': 'Liga Ibérica',
  'LaLiga EA Sports': 'Liga Ibérica',
  'La Liga Hypermotion': 'Segunda Ibérica',
  'LaLiga Hypermotion': 'Segunda Ibérica',
  'Premier League': 'First League',
  'Serie A': 'Calcio League',
  'Bundesliga': 'Erste Liga',
  'Ligue 1': 'Division Première',
  'Eredivisie': 'Dutch First',
  'Primeira Liga': 'Liga Lusitana',
  'Liga Portugal': 'Liga Lusitana',
  'Scottish Premiership': 'Highland League',
  'Pro League': 'Belgian First',
  'Super Lig': 'Anatolian League',
  'Süper Lig': 'Anatolian League',
  'Swiss Super League': 'Alpine League',
  'Championship': 'Second League',
  'Serie B': 'Calcio B',
  '2. Bundesliga': 'Zweite Liga',
  'Ligue 2': 'Division Seconde',
  'MLS': 'American League',
  'Liga MX': 'Azteca League',
  'J1 League': 'Sakura League',
  'Saudi Pro League': 'Arabian League',
  'Austrian Bundesliga': 'Danube League',
  'HNL': 'Adriatic League',
  'Fortuna Liga': 'Bohemian League',
  'Superligaen': 'Nordic League',
  'Super League': 'Hellenic League',
  'Champions League': 'Continental Champions Cup',
  'Europa League': 'Continental Shield',
  'Conference League': 'Continental Trophy',
  'Copa del Rey': 'National Cup',
  'Copa Libertadores': 'South American Champions Cup',
};

// ============================================================
// 2. GENERADOR DE NOMBRES DE JUGADORES — 100% ficticios
// Por nacionalidad, usando pools de nombres comunes
// ============================================================

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

// Detectar "nacionalidad" por el contexto del archivo
function guessNationality(fileName, playerName) {
  const h = hash(playerName);
  if (fileName.includes('teams.js') || fileName.includes('segunda')) return pick(['spanish','spanish','spanish','portuguese','french','argentinian','brazilian'], h);
  if (fileName.includes('premier') || fileName.includes('championship')) return pick(['english','english','english','french','dutch','african','brazilian','spanish'], h);
  if (fileName.includes('seriea') || fileName.includes('serie-b')) return pick(['italian','italian','italian','argentinian','brazilian','french','african'], h);
  if (fileName.includes('bundesliga')) return pick(['german','german','german','french','dutch','african','japanese'], h);
  if (fileName.includes('ligue')) return pick(['french','french','french','african','african','brazilian','portuguese'], h);
  if (fileName.includes('eredivisie')) return pick(['dutch','dutch','dutch','african','brazilian','german'], h);
  if (fileName.includes('primeira')) return pick(['portuguese','portuguese','portuguese','brazilian','african','spanish'], h);
  if (fileName.includes('scottish')) return pick(['english','english','english','generic'], h);
  if (fileName.includes('belgian')) return pick(['french','dutch','african','generic'], h);
  if (fileName.includes('super-lig')) return pick(['generic','generic','african','brazilian','french'], h);
  if (fileName.includes('mls')) return pick(['english','english','mexican','argentinian','brazilian','african'], h);
  if (fileName.includes('ligamx')) return pick(['mexican','mexican','mexican','argentinian','brazilian'], h);
  if (fileName.includes('jleague')) return pick(['japanese','japanese','japanese','brazilian','generic'], h);
  if (fileName.includes('saudi')) return pick(['generic','african','brazilian','french','portuguese','spanish'], h);
  if (fileName.includes('austrian') || fileName.includes('swiss')) return pick(['german','german','generic','african'], h);
  if (fileName.includes('croatian') || fileName.includes('czech') || fileName.includes('danish') || fileName.includes('greek')) return pick(['generic','generic','generic','african'], h);
  return pick(['generic','spanish','english','french','german','italian'], h);
}

function generateFictionalName(originalName, fileName) {
  const h = hash(originalName + fileName);
  const nat = guessNationality(fileName, originalName);
  
  const firstPool = FIRST_NAMES[nat] || FIRST_NAMES.generic;
  const lastPool = LAST_NAMES[nat] || LAST_NAMES.generic;
  
  // Extraer iniciales del nombre original
  const parts = originalName.split(' ').filter(p => p.length > 1);
  const firstInitial = parts[0] ? parts[0][0].toUpperCase() : '';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
  
  // Buscar nombre con misma inicial (o similar)
  const matchingFirsts = firstPool.filter(n => n[0].toUpperCase() === firstInitial);
  const matchingLasts = lastPool.filter(n => n[0].toUpperCase() === (lastInitial || firstInitial));
  
  const firstName = matchingFirsts.length > 0 
    ? pick(matchingFirsts, h) 
    : pick(firstPool, h);
  const lastName = matchingLasts.length > 0 
    ? pick(matchingLasts, hash(originalName + 'last'))
    : pick(lastPool, hash(originalName + 'last'));
  
  // Si el original es nombre único (Pedri, Rodrygo), devolver uno solo
  if (parts.length === 1) {
    return firstName;
  }
  
  // Estilo similar al original: si original usa inicial, nosotros también
  const origHasInitial = parts.some(p => p.length <= 2 && p.includes('.'));
  const style = h % 5;
  if (origHasInitial || style === 3) return `${firstName[0]}. ${lastName}`;
  return `${firstName} ${lastName}`;
}

// ============================================================
// 3. PROCESAR ARCHIVOS
// ============================================================

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

function processFile(filePath) {
  const fileName = path.basename(filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;
  
  // Track para evitar duplicados en el mismo archivo
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
  
  // 1. Equipos
  for (const [real, fake] of Object.entries(TEAM_NAME_MAP)) {
    const escaped = real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`'${escaped}'`, 'g');
    const before = content;
    content = content.replace(regex, `'${fake}'`);
    if (content !== before) changes++;
  }
  
  // 2. Estadios
  for (const [real, fake] of Object.entries(STADIUM_NAME_MAP)) {
    const escaped = real.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`'${escaped}'`, 'g');
    const before = content;
    content = content.replace(regex, `'${fake}'`);
    if (content !== before) changes++;
  }
  
  // 3. Jugadores createPlayer('Nombre', ...)
  content = content.replace(/createPlayer\('([^']+)'/g, (match, name) => {
    const newName = getUniqueName(name);
    changes++;
    return `createPlayer('${newName}'`;
  });
  
  // 4. Jugadores { name: 'Nombre', ...
  content = content.replace(/\{\s*name:\s*'([^']+)',\s*position:/g, (match, name) => {
    const newName = getUniqueName(name);
    changes++;
    return `{ name: '${newName}', position:`;
  });
  
  return { content, changes };
}

// ============================================================
// 4. EJECUTAR
// ============================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PREVIEW = args.includes('--preview');

console.log('🏟️  PC Fútbol Web — Nombres ficticios para publicación');
console.log('======================================================');
console.log(DRY_RUN ? '🔍 MODO DRY-RUN\n' : '✏️  MODO ESCRITURA\n');

const teamFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('teams') && f.endsWith('.js'));

let totalChanges = 0;

for (const file of teamFiles) {
  const filePath = path.join(DATA_DIR, file);
  const { content, changes } = processFile(filePath);
  
  if (changes > 0) {
    console.log(`📝 ${file}: ${changes} cambios`);
    
    if (PREVIEW) {
      const lines = content.split('\n');
      const nameLines = lines.filter(l => l.includes("name:") || l.includes("createPlayer(")).slice(0, 5);
      nameLines.forEach(l => console.log(`   ${l.trim()}`));
      console.log('   ...\n');
    }
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    totalChanges += changes;
  }
}

console.log(`\n✅ Total: ${totalChanges} cambios en ${teamFiles.length} archivos`);
if (DRY_RUN) console.log('\n💡 Ejecuta sin --dry-run para aplicar.');

// Ejemplos
if (PREVIEW || DRY_RUN) {
  console.log('\n📋 Ejemplos de nombres ficticios:');
  const examples = [
    'Kylian Mbappé', 'Vinícius Júnior', 'Jude Bellingham',
    'Pedri', 'Lamine Yamal', 'Erling Haaland',
    'Mohamed Salah', 'Robert Lewandowski', 'Harry Kane',
  ];
  examples.forEach(name => {
    console.log(`   ${name} → ${generateFictionalName(name, 'teams.js')}`);
  });
}
