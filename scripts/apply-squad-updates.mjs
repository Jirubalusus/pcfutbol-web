// Script para aplicar actualizaciones de plantillas automáticamente
import * as fs from 'fs';
import * as path from 'path';

// Los nuevos jugadores por equipo (generados por complete-squads.mjs)
const SQUAD_UPDATES = {
  'barcelona': [
    { name: 'Mikel Marín', position: 'GK', overall: 76, age: 21, value: 6500000, salary: 37000 },
    { name: 'Adrián Calvo', position: 'CB', overall: 78, age: 19, value: 7300000, salary: 51000 },
    { name: 'Iván García', position: 'RB', overall: 78, age: 25, value: 6000000, salary: 45000 },
    { name: 'Unai Núñez', position: 'LB', overall: 78, age: 19, value: 7600000, salary: 35000 },
    { name: 'Fernando Calvo', position: 'CDM', overall: 78, age: 19, value: 7500000, salary: 40000 },
    { name: 'Gorka Reyes', position: 'CAM', overall: 78, age: 20, value: 7800000, salary: 50000 },
    { name: 'David Rubio', position: 'LW', overall: 78, age: 24, value: 6100000, salary: 47000 },
    { name: 'Nacho Lozano', position: 'ST', overall: 78, age: 19, value: 7700000, salary: 48000 },
    { name: 'Marc Flores', position: 'ST', overall: 78, age: 22, value: 8000000, salary: 51000 }
  ],
  'atletico_madrid': [
    { name: 'Pau Rubio', position: 'GK', overall: 75, age: 20, value: 6000000, salary: 42000 },
    { name: 'Gavi Medina', position: 'GK', overall: 73, age: 26, value: 4000000, salary: 41000 },
    { name: 'Marc Pérez', position: 'CB', overall: 74, age: 23, value: 5600000, salary: 36000 },
    { name: 'Álex González', position: 'RB', overall: 78, age: 22, value: 8000000, salary: 54000 },
    { name: 'Víctor Calvo', position: 'LB', overall: 74, age: 26, value: 5100000, salary: 47000 },
    { name: 'Julen Garrido', position: 'CDM', overall: 77, age: 20, value: 6900000, salary: 42000 },
    { name: 'Raúl Peña', position: 'CDM', overall: 75, age: 25, value: 4800000, salary: 30000 },
    { name: 'Hugo Cabrera', position: 'CAM', overall: 77, age: 25, value: 5700000, salary: 50000 },
    { name: 'Dani García', position: 'RW', overall: 78, age: 25, value: 5600000, salary: 41000 },
    { name: 'Pablo Iglesias', position: 'RW', overall: 77, age: 26, value: 5800000, salary: 33000 },
    { name: 'Adrián Campos', position: 'LW', overall: 78, age: 24, value: 5600000, salary: 50000 },
    { name: 'Pablo Gil', position: 'ST', overall: 74, age: 20, value: 5600000, salary: 41000 }
  ],
  'sevilla': [
    { name: 'Iván Cano', position: 'GK', overall: 71, age: 25, value: 4200000, salary: 29000 },
    { name: 'Eric Cortés', position: 'GK', overall: 70, age: 23, value: 3900000, salary: 36000 },
    { name: 'Fernando Ruiz', position: 'CB', overall: 74, age: 25, value: 4700000, salary: 41000 },
    { name: 'Sergio Romero', position: 'CB', overall: 69, age: 19, value: 4500000, salary: 33000 },
    { name: 'Alberto Álvarez', position: 'RB', overall: 74, age: 24, value: 4800000, salary: 41000 },
    { name: 'Aitor Morales', position: 'LB', overall: 74, age: 26, value: 4900000, salary: 31000 },
    { name: 'Aitor Ruiz', position: 'CDM', overall: 73, age: 21, value: 5800000, salary: 52000 },
    { name: 'Aitor Calvo', position: 'CM', overall: 72, age: 25, value: 3600000, salary: 41000 },
    { name: 'Gonzalo Garrido', position: 'CAM', overall: 74, age: 19, value: 6300000, salary: 42000 },
    { name: 'Hugo Aguilar', position: 'CAM', overall: 75, age: 21, value: 6400000, salary: 47000 },
    { name: 'Pedri Muñoz', position: 'RW', overall: 69, age: 25, value: 3100000, salary: 40000 },
    { name: 'Miguel Cano', position: 'LW', overall: 74, age: 19, value: 6300000, salary: 49000 },
    { name: 'David Cano', position: 'LW', overall: 69, age: 21, value: 3700000, salary: 34000 },
    { name: 'Dani Garrido', position: 'ST', overall: 73, age: 25, value: 4600000, salary: 42000 }
  ],
  'real_betis': [
    { name: 'Mario Lozano', position: 'GK', overall: 66, age: 25, value: 2000000, salary: 28000 },
    { name: 'Diego Ramos', position: 'GK', overall: 70, age: 26, value: 3900000, salary: 46000 },
    { name: 'Carlos Fuentes', position: 'CB', overall: 70, age: 20, value: 4500000, salary: 43000 },
    { name: 'Víctor Medina', position: 'CB', overall: 72, age: 21, value: 5500000, salary: 34000 },
    { name: 'Jon Guerrero', position: 'RB', overall: 68, age: 24, value: 3200000, salary: 38000 },
    { name: 'Alejandro Sanz', position: 'LB', overall: 69, age: 23, value: 4300000, salary: 35000 },
    { name: 'Pablo Ortiz', position: 'CDM', overall: 70, age: 21, value: 4200000, salary: 43000 },
    { name: 'Hugo Cabrera', position: 'CM', overall: 66, age: 21, value: 2900000, salary: 28000 },
    { name: 'Ander Sánchez', position: 'CM', overall: 67, age: 26, value: 3000000, salary: 43000 },
    { name: 'Unai Domínguez', position: 'RW', overall: 68, age: 21, value: 3800000, salary: 32000 },
    { name: 'Pablo Martínez', position: 'LW', overall: 72, age: 26, value: 3900000, salary: 40000 },
    { name: 'Arnau Ortiz', position: 'ST', overall: 73, age: 20, value: 6000000, salary: 38000 },
    { name: 'Nacho González', position: 'ST', overall: 66, age: 20, value: 2400000, salary: 38000 }
  ],
  'villarreal': [
    { name: 'Jorge Carrasco', position: 'GK', overall: 68, age: 25, value: 2700000, salary: 44000 },
    { name: 'Óscar Gallego', position: 'GK', overall: 71, age: 25, value: 3900000, salary: 34000 },
    { name: 'Unai Martínez', position: 'CB', overall: 70, age: 24, value: 3500000, salary: 46000 },
    { name: 'Antonio Delgado', position: 'CB', overall: 72, age: 20, value: 5600000, salary: 45000 },
    { name: 'Jesús Ortega', position: 'RB', overall: 73, age: 24, value: 4100000, salary: 45000 },
    { name: 'Jon Torres', position: 'LB', overall: 74, age: 23, value: 6100000, salary: 48000 },
    { name: 'Alberto Ramos', position: 'CDM', overall: 70, age: 19, value: 4600000, salary: 46000 },
    { name: 'Daniel García', position: 'CDM', overall: 73, age: 23, value: 5700000, salary: 38000 },
    { name: 'Andoni Rubio', position: 'CM', overall: 69, age: 21, value: 4300000, salary: 40000 },
    { name: 'Sergio Muñoz', position: 'CAM', overall: 68, age: 25, value: 2900000, salary: 44000 },
    { name: 'Jesús Ortiz', position: 'RW', overall: 73, age: 20, value: 5200000, salary: 44000 },
    { name: 'Aitor Cortés', position: 'LW', overall: 71, age: 19, value: 5200000, salary: 35000 },
    { name: 'Javier Aguilar', position: 'ST', overall: 72, age: 22, value: 4900000, salary: 48000 }
  ],
  'real_sociedad': [
    { name: 'Pablo Prieto', position: 'GK', overall: 74, age: 26, value: 4400000, salary: 38000 },
    { name: 'Daniel Gallego', position: 'GK', overall: 68, age: 24, value: 3300000, salary: 35000 },
    { name: 'Javier Álvarez', position: 'CB', overall: 73, age: 22, value: 5500000, salary: 44000 },
    { name: 'Javier Vega', position: 'CB', overall: 76, age: 25, value: 5400000, salary: 50000 },
    { name: 'Pol Díaz', position: 'RB', overall: 69, age: 20, value: 4100000, salary: 42000 },
    { name: 'Víctor Álvarez', position: 'LB', overall: 71, age: 26, value: 4200000, salary: 33000 },
    { name: 'Marcos Núñez', position: 'CDM', overall: 76, age: 22, value: 6900000, salary: 50000 },
    { name: 'Dani Molina', position: 'CM', overall: 71, age: 25, value: 3600000, salary: 45000 },
    { name: 'Jon Díaz', position: 'CM', overall: 75, age: 22, value: 6100000, salary: 46000 },
    { name: 'Aitor Pérez', position: 'CAM', overall: 75, age: 25, value: 5200000, salary: 42000 },
    { name: 'Luis Garrido', position: 'RW', overall: 73, age: 20, value: 6000000, salary: 51000 },
    { name: 'Gerard Aguilar', position: 'LW', overall: 71, age: 25, value: 3800000, salary: 29000 },
    { name: 'Pau Iglesias', position: 'ST', overall: 73, age: 20, value: 5600000, salary: 37000 },
    { name: 'Óscar Cano', position: 'ST', overall: 73, age: 23, value: 5600000, salary: 50000 }
  ],
  'athletic_bilbao': [
    { name: 'Raúl Torres', position: 'GK', overall: 69, age: 25, value: 3200000, salary: 34000 },
    { name: 'Julen García', position: 'GK', overall: 69, age: 21, value: 4000000, salary: 43000 },
    { name: 'Xabi Flores', position: 'CB', overall: 72, age: 23, value: 5000000, salary: 46000 },
    { name: 'Marc Molina', position: 'CB', overall: 73, age: 22, value: 5200000, salary: 44000 },
    { name: 'Xabi Fuentes', position: 'RB', overall: 70, age: 23, value: 4100000, salary: 44000 },
    { name: 'Aitor Calvo', position: 'LB', overall: 73, age: 19, value: 6100000, salary: 41000 },
    { name: 'Nacho Navarro', position: 'CDM', overall: 71, age: 22, value: 5000000, salary: 30000 },
    { name: 'Sergio Calvo', position: 'CM', overall: 73, age: 25, value: 4700000, salary: 45000 },
    { name: 'Mario Medina', position: 'CAM', overall: 74, age: 23, value: 6000000, salary: 34000 },
    { name: 'Alberto González', position: 'CAM', overall: 68, age: 20, value: 3400000, salary: 32000 },
    { name: 'Marc Sanz', position: 'RW', overall: 75, age: 26, value: 4900000, salary: 43000 },
    { name: 'Diego Gil', position: 'LW', overall: 73, age: 19, value: 5100000, salary: 42000 },
    { name: 'Iván Gallego', position: 'ST', overall: 73, age: 26, value: 4700000, salary: 38000 },
    { name: 'Antonio Muñoz', position: 'ST', overall: 69, age: 26, value: 3500000, salary: 36000 }
  ],
  'valencia': [
    { name: 'Xabi Cortés', position: 'GK', overall: 71, age: 25, value: 4000000, salary: 40000 },
    { name: 'Víctor Vidal', position: 'GK', overall: 68, age: 19, value: 3600000, salary: 41000 },
    { name: 'Asier Molina', position: 'CB', overall: 70, age: 19, value: 4200000, salary: 42000 },
    { name: 'Xabi Martínez', position: 'CB', overall: 68, age: 21, value: 3600000, salary: 45000 },
    { name: 'Andoni Carrasco', position: 'RB', overall: 64, age: 26, value: 1600000, salary: 35000 },
    { name: 'Fernando Sanz', position: 'LB', overall: 70, age: 21, value: 4100000, salary: 33000 },
    { name: 'Daniel Pérez', position: 'CDM', overall: 65, age: 24, value: 1900000, salary: 26000 },
    { name: 'Riqui Martínez', position: 'CDM', overall: 67, age: 24, value: 2300000, salary: 34000 },
    { name: 'Jon Medina', position: 'CM', overall: 70, age: 21, value: 3900000, salary: 43000 },
    { name: 'Alberto Gómez', position: 'CAM', overall: 69, age: 19, value: 3700000, salary: 32000 },
    { name: 'Gonzalo Martínez', position: 'CAM', overall: 68, age: 21, value: 4100000, salary: 33000 },
    { name: 'Dani Sanz', position: 'RW', overall: 69, age: 21, value: 4300000, salary: 32000 },
    { name: 'Gonzalo González', position: 'RW', overall: 65, age: 21, value: 2800000, salary: 31000 },
    { name: 'Gonzalo Vega', position: 'LW', overall: 69, age: 26, value: 3300000, salary: 45000 },
    { name: 'Diego Molina', position: 'ST', overall: 67, age: 20, value: 3100000, salary: 36000 },
    { name: 'Samuel Vega', position: 'ST', overall: 69, age: 23, value: 4000000, salary: 33000 }
  ],
  'girona': [
    { name: 'Adrián Delgado', position: 'GK', overall: 72, age: 24, value: 3500000, salary: 34000 },
    { name: 'Iker Muñoz', position: 'GK', overall: 70, age: 23, value: 3000000, salary: 39000 },
    { name: 'Oier González', position: 'CB', overall: 72, age: 24, value: 4200000, salary: 37000 },
    { name: 'Rubén Núñez', position: 'CB', overall: 72, age: 24, value: 4500000, salary: 35000 },
    { name: 'Aitor López', position: 'RB', overall: 72, age: 24, value: 4100000, salary: 38000 },
    { name: 'Pablo Herrera', position: 'LB', overall: 72, age: 20, value: 4100000, salary: 32000 },
    { name: 'Julen Domínguez', position: 'CDM', overall: 70, age: 22, value: 3500000, salary: 36000 },
    { name: 'Gorka Cruz', position: 'CM', overall: 71, age: 25, value: 3500000, salary: 34000 },
    { name: 'Diego Sanz', position: 'CAM', overall: 71, age: 23, value: 3100000, salary: 38000 },
    { name: 'Samuel Reyes', position: 'CAM', overall: 70, age: 19, value: 3500000, salary: 38000 },
    { name: 'Álex Blanco', position: 'RW', overall: 72, age: 25, value: 3800000, salary: 28000 },
    { name: 'Samuel Díaz', position: 'LW', overall: 72, age: 25, value: 3300000, salary: 27000 },
    { name: 'Nacho Núñez', position: 'ST', overall: 70, age: 24, value: 3200000, salary: 40000 },
    { name: 'Óscar Carrasco', position: 'ST', overall: 70, age: 24, value: 2700000, salary: 39000 }
  ],
  'getafe': [
    { name: 'Joselu Flores', position: 'GK', overall: 70, age: 25, value: 2800000, salary: 34000 },
    { name: 'Alejandro Martínez', position: 'GK', overall: 69, age: 26, value: 2300000, salary: 30000 },
    { name: 'Luis Ortega', position: 'CB', overall: 70, age: 24, value: 2500000, salary: 31000 },
    { name: 'Jon González', position: 'CB', overall: 69, age: 19, value: 2700000, salary: 37000 },
    { name: 'Pol Álvarez', position: 'RB', overall: 70, age: 22, value: 2700000, salary: 33000 },
    { name: 'Hugo Domínguez', position: 'LB', overall: 69, age: 19, value: 2200000, salary: 42000 },
    { name: 'Raúl Iglesias', position: 'CDM', overall: 70, age: 22, value: 2900000, salary: 32000 },
    { name: 'Marcos Blanco', position: 'CM', overall: 69, age: 25, value: 2500000, salary: 32000 },
    { name: 'Jorge Fernández', position: 'CAM', overall: 68, age: 22, value: 2600000, salary: 27000 },
    { name: 'Hugo Martínez', position: 'CAM', overall: 70, age: 25, value: 2700000, salary: 27000 },
    { name: 'Mikel Delgado', position: 'RW', overall: 70, age: 19, value: 3200000, salary: 34000 },
    { name: 'Joselu Vidal', position: 'RW', overall: 68, age: 24, value: 2200000, salary: 32000 },
    { name: 'Iván Vázquez', position: 'LW', overall: 70, age: 19, value: 3700000, salary: 41000 },
    { name: 'Marcos Ortega', position: 'LW', overall: 68, age: 21, value: 2500000, salary: 29000 },
    { name: 'Víctor Morales', position: 'ST', overall: 68, age: 26, value: 2800000, salary: 37000 }
  ],
  'osasuna': [
    { name: 'Andoni Serrano', position: 'GK', overall: 70, age: 24, value: 3500000, salary: 40000 },
    { name: 'Oier Ruiz', position: 'GK', overall: 68, age: 22, value: 3100000, salary: 34000 },
    { name: 'Pablo Rodríguez', position: 'CB', overall: 70, age: 21, value: 3100000, salary: 40000 },
    { name: 'Gavi Castillo', position: 'CB', overall: 70, age: 19, value: 3100000, salary: 27000 },
    { name: 'Daniel Hernández', position: 'CB', overall: 70, age: 25, value: 2900000, salary: 36000 },
    { name: 'Javier González', position: 'RB', overall: 69, age: 19, value: 3300000, salary: 35000 },
    { name: 'Rubén Medina', position: 'LB', overall: 69, age: 19, value: 3500000, salary: 34000 },
    { name: 'Miguel Pérez', position: 'CDM', overall: 68, age: 19, value: 2400000, salary: 34000 },
    { name: 'Javier Reyes', position: 'CM', overall: 69, age: 23, value: 3300000, salary: 29000 },
    { name: 'Iker Castro', position: 'CM', overall: 68, age: 26, value: 2200000, salary: 40000 },
    { name: 'Oriol Reyes', position: 'CM', overall: 69, age: 21, value: 3200000, salary: 35000 },
    { name: 'Dani Gallego', position: 'CAM', overall: 70, age: 19, value: 3300000, salary: 43000 },
    { name: 'Arnau Romero', position: 'RW', overall: 70, age: 24, value: 3300000, salary: 27000 },
    { name: 'Rubén Prieto', position: 'RW', overall: 70, age: 22, value: 3500000, salary: 35000 },
    { name: 'Pedri Marín', position: 'LW', overall: 69, age: 23, value: 3400000, salary: 32000 },
    { name: 'Hugo Reyes', position: 'ST', overall: 69, age: 22, value: 3100000, salary: 30000 }
  ],
  'celta': [
    { name: 'Hugo Domínguez', position: 'GK', overall: 70, age: 23, value: 3000000, salary: 40000 },
    { name: 'Aitor Ortiz', position: 'GK', overall: 68, age: 22, value: 2200000, salary: 28000 },
    { name: 'Marc Gil', position: 'CB', overall: 70, age: 20, value: 3600000, salary: 40000 },
    { name: 'Pablo Vega', position: 'CB', overall: 69, age: 22, value: 3100000, salary: 36000 },
    { name: 'Julen Cortés', position: 'RB', overall: 70, age: 24, value: 3200000, salary: 27000 },
    { name: 'Andoni Cruz', position: 'LB', overall: 71, age: 19, value: 4700000, salary: 40000 },
    { name: 'Asier Castillo', position: 'CDM', overall: 70, age: 19, value: 3500000, salary: 33000 },
    { name: 'Miguel Santos', position: 'CDM', overall: 69, age: 25, value: 3200000, salary: 40000 },
    { name: 'Iker Rodríguez', position: 'CM', overall: 69, age: 25, value: 3000000, salary: 28000 },
    { name: 'Miguel Torres', position: 'CAM', overall: 68, age: 22, value: 2300000, salary: 22000 },
    { name: 'Raúl Medina', position: 'CAM', overall: 70, age: 26, value: 3100000, salary: 34000 },
    { name: 'Diego Vázquez', position: 'RW', overall: 70, age: 23, value: 3700000, salary: 43000 },
    { name: 'Gorka Peña', position: 'RW', overall: 69, age: 25, value: 2800000, salary: 36000 },
    { name: 'Iván Delgado', position: 'LW', overall: 68, age: 26, value: 2600000, salary: 22000 },
    { name: 'Dani Rubio', position: 'ST', overall: 68, age: 20, value: 3000000, salary: 30000 }
  ],
  'rayo': [
    { name: 'Antonio Campos', position: 'GK', overall: 68, age: 22, value: 2500000, salary: 33000 },
    { name: 'David Cano', position: 'GK', overall: 68, age: 19, value: 2900000, salary: 35000 },
    { name: 'Luis Carrasco', position: 'CB', overall: 68, age: 21, value: 2300000, salary: 40000 },
    { name: 'Jon Molina', position: 'CB', overall: 69, age: 20, value: 3000000, salary: 30000 },
    { name: 'Oriol Molina', position: 'RB', overall: 68, age: 26, value: 2000000, salary: 25000 },
    { name: 'Riqui Navarro', position: 'LB', overall: 68, age: 20, value: 2000000, salary: 38000 },
    { name: 'Rubén Ramos', position: 'CDM', overall: 68, age: 19, value: 2600000, salary: 33000 },
    { name: 'Diego Martínez', position: 'CM', overall: 68, age: 25, value: 2300000, salary: 36000 },
    { name: 'Marcos Marín', position: 'CM', overall: 68, age: 26, value: 2700000, salary: 35000 },
    { name: 'Pol Romero', position: 'CAM', overall: 68, age: 25, value: 2900000, salary: 36000 },
    { name: 'Riqui Marín', position: 'CAM', overall: 68, age: 23, value: 2000000, salary: 24000 },
    { name: 'Gavi Lozano', position: 'RW', overall: 68, age: 24, value: 2300000, salary: 29000 },
    { name: 'Alberto González', position: 'LW', overall: 68, age: 23, value: 2100000, salary: 35000 },
    { name: 'Rubén Reyes', position: 'ST', overall: 68, age: 21, value: 2900000, salary: 32000 },
    { name: 'Rubén Calvo', position: 'ST', overall: 69, age: 22, value: 3600000, salary: 24000 }
  ],
  'mallorca': [
    { name: 'Fernando Hernández', position: 'GK', overall: 68, age: 25, value: 2400000, salary: 38000 },
    { name: 'Mikel Marín', position: 'GK', overall: 69, age: 22, value: 3000000, salary: 25000 },
    { name: 'Ander Iglesias', position: 'CB', overall: 68, age: 26, value: 2600000, salary: 22000 },
    { name: 'Jon Díaz', position: 'CB', overall: 68, age: 21, value: 2700000, salary: 31000 },
    { name: 'Diego Garrido', position: 'RB', overall: 68, age: 19, value: 2300000, salary: 34000 },
    { name: 'Diego Navarro', position: 'LB', overall: 68, age: 23, value: 2900000, salary: 41000 },
    { name: 'Beñat Rubio', position: 'CDM', overall: 69, age: 26, value: 3100000, salary: 37000 },
    { name: 'Asier Garrido', position: 'CDM', overall: 70, age: 24, value: 2900000, salary: 29000 },
    { name: 'Aitor Vega', position: 'CM', overall: 68, age: 19, value: 2900000, salary: 39000 },
    { name: 'Alberto Gallego', position: 'CAM', overall: 70, age: 22, value: 2800000, salary: 42000 },
    { name: 'Pedri Marín', position: 'RW', overall: 68, age: 20, value: 2500000, salary: 35000 },
    { name: 'Gerard Castro', position: 'RW', overall: 68, age: 23, value: 2500000, salary: 34000 },
    { name: 'Marcos Reyes', position: 'LW', overall: 68, age: 26, value: 2800000, salary: 41000 },
    { name: 'Joselu Vázquez', position: 'LW', overall: 70, age: 23, value: 2900000, salary: 26000 },
    { name: 'Gonzalo Fuentes', position: 'ST', overall: 68, age: 26, value: 2400000, salary: 28000 }
  ],
  'las_palmas': [
    { name: 'Marcos Ruiz', position: 'GK', overall: 68, age: 22, value: 2600000, salary: 23000 },
    { name: 'Luis Ruiz', position: 'GK', overall: 68, age: 23, value: 3000000, salary: 38000 },
    { name: 'Riqui Moreno', position: 'CB', overall: 68, age: 22, value: 2900000, salary: 36000 },
    { name: 'Álex Gómez', position: 'CB', overall: 69, age: 24, value: 3400000, salary: 30000 },
    { name: 'Víctor Romero', position: 'RB', overall: 68, age: 23, value: 2600000, salary: 24000 },
    { name: 'Pablo Carrasco', position: 'LB', overall: 68, age: 22, value: 2600000, salary: 28000 },
    { name: 'Jon Rubio', position: 'CDM', overall: 68, age: 23, value: 2800000, salary: 28000 },
    { name: 'Aitor Navarro', position: 'CDM', overall: 68, age: 22, value: 2500000, salary: 29000 },
    { name: 'Fernando Medina', position: 'CM', overall: 68, age: 21, value: 2200000, salary: 38000 },
    { name: 'Arnau Gallego', position: 'CAM', overall: 69, age: 22, value: 3200000, salary: 26000 },
    { name: 'Jon Jiménez', position: 'RW', overall: 69, age: 21, value: 3600000, salary: 34000 },
    { name: 'Sergio Ruiz', position: 'RW', overall: 68, age: 19, value: 2700000, salary: 28000 },
    { name: 'Pol García', position: 'LW', overall: 68, age: 20, value: 2100000, salary: 39000 },
    { name: 'Jon Sánchez', position: 'LW', overall: 68, age: 19, value: 2200000, salary: 33000 },
    { name: 'Fernando Castillo', position: 'ST', overall: 68, age: 25, value: 2100000, salary: 35000 }
  ],
  'alaves': [
    { name: 'Luis Castro', position: 'GK', overall: 67, age: 19, value: 2100000, salary: 23000 },
    { name: 'Mikel Reyes', position: 'GK', overall: 66, age: 23, value: 1500000, salary: 25000 },
    { name: 'Gorka Sanz', position: 'CB', overall: 67, age: 19, value: 2600000, salary: 36000 },
    { name: 'Arnau Moreno', position: 'CB', overall: 67, age: 23, value: 2300000, salary: 38000 },
    { name: 'Eric Domínguez', position: 'RB', overall: 67, age: 21, value: 2800000, salary: 41000 },
    { name: 'David Hernández', position: 'LB', overall: 67, age: 23, value: 2300000, salary: 29000 },
    { name: 'Gonzalo Díaz', position: 'CDM', overall: 68, age: 24, value: 2600000, salary: 31000 },
    { name: 'Xabi Núñez', position: 'CM', overall: 67, age: 19, value: 2100000, salary: 31000 },
    { name: 'Samuel Méndez', position: 'CM', overall: 68, age: 26, value: 3300000, salary: 42000 },
    { name: 'Beñat Martínez', position: 'CAM', overall: 67, age: 24, value: 2300000, salary: 21000 },
    { name: 'Raúl Méndez', position: 'CAM', overall: 67, age: 24, value: 2400000, salary: 22000 },
    { name: 'Gavi Moreno', position: 'RW', overall: 67, age: 20, value: 2600000, salary: 30000 },
    { name: 'Ander Vidal', position: 'LW', overall: 67, age: 23, value: 2200000, salary: 30000 },
    { name: 'Mikel León', position: 'LW', overall: 67, age: 20, value: 2600000, salary: 31000 },
    { name: 'Javier Garrido', position: 'ST', overall: 67, age: 22, value: 2000000, salary: 37000 },
    { name: 'Pedri Rubio', position: 'ST', overall: 67, age: 22, value: 3000000, salary: 39000 }
  ],
  'leganes': [
    { name: 'Mario Ortiz', position: 'GK', overall: 66, age: 24, value: 2200000, salary: 40000 },
    { name: 'Jon Pérez', position: 'GK', overall: 64, age: 23, value: 1200000, salary: 23000 },
    { name: 'Gavi Peña', position: 'CB', overall: 66, age: 20, value: 2600000, salary: 28000 },
    { name: 'Mario Álvarez', position: 'CB', overall: 66, age: 25, value: 2300000, salary: 30000 },
    { name: 'Julen Cortés', position: 'RB', overall: 66, age: 21, value: 2200000, salary: 36000 },
    { name: 'Víctor Vázquez', position: 'LB', overall: 66, age: 22, value: 2900000, salary: 34000 },
    { name: 'Héctor Cano', position: 'CDM', overall: 66, age: 20, value: 2500000, salary: 28000 },
    { name: 'Carlos González', position: 'CDM', overall: 66, age: 20, value: 2400000, salary: 27000 },
    { name: 'Julen Méndez', position: 'CM', overall: 66, age: 23, value: 2000000, salary: 37000 },
    { name: 'Fernando Rodríguez', position: 'CM', overall: 66, age: 24, value: 2600000, salary: 25000 },
    { name: 'Sergio Molina', position: 'CAM', overall: 66, age: 25, value: 2500000, salary: 37000 },
    { name: 'Álvaro González', position: 'CAM', overall: 66, age: 23, value: 2100000, salary: 39000 },
    { name: 'Gonzalo Ramos', position: 'RW', overall: 66, age: 26, value: 2700000, salary: 40000 },
    { name: 'Alberto Guerrero', position: 'LW', overall: 66, age: 22, value: 2600000, salary: 25000 },
    { name: 'Jon Torres', position: 'LW', overall: 66, age: 22, value: 2100000, salary: 39000 },
    { name: 'Samuel Iglesias', position: 'ST', overall: 66, age: 20, value: 2700000, salary: 34000 }
  ],
  'espanyol': [
    { name: 'Luis Pérez', position: 'GK', overall: 68, age: 21, value: 2900000, salary: 24000 },
    { name: 'Óscar González', position: 'GK', overall: 66, age: 26, value: 2500000, salary: 32000 },
    { name: 'Iker Ruiz', position: 'CB', overall: 70, age: 24, value: 3700000, salary: 32000 },
    { name: 'Sergio Vega', position: 'CB', overall: 70, age: 20, value: 4100000, salary: 29000 },
    { name: 'Jon Guerrero', position: 'RB', overall: 67, age: 25, value: 2800000, salary: 27000 },
    { name: 'Luis Méndez', position: 'LB', overall: 69, age: 26, value: 3400000, salary: 39000 },
    { name: 'Fernando Delgado', position: 'CDM', overall: 67, age: 25, value: 2800000, salary: 26000 },
    { name: 'Julen Hernández', position: 'CDM', overall: 67, age: 24, value: 2100000, salary: 38000 },
    { name: 'Arnau Muñoz', position: 'CM', overall: 66, age: 19, value: 2100000, salary: 22000 },
    { name: 'Pablo Vega', position: 'CAM', overall: 68, age: 20, value: 2800000, salary: 25000 },
    { name: 'Carlos Garrido', position: 'CAM', overall: 67, age: 22, value: 2300000, salary: 29000 },
    { name: 'Rubén Cortés', position: 'RW', overall: 70, age: 20, value: 4200000, salary: 30000 },
    { name: 'Pedri Torres', position: 'LW', overall: 70, age: 23, value: 3700000, salary: 43000 },
    { name: 'Luis Reyes', position: 'ST', overall: 66, age: 20, value: 2400000, salary: 39000 },
    { name: 'Andoni Carrasco', position: 'ST', overall: 67, age: 20, value: 2700000, salary: 29000 }
  ],
  'valladolid': [
    { name: 'Sergio Muñoz', position: 'GK', overall: 66, age: 19, value: 2400000, salary: 29000 },
    { name: 'Beñat Núñez', position: 'GK', overall: 64, age: 23, value: 800000, salary: 38000 },
    { name: 'Javier Delgado', position: 'CB', overall: 66, age: 24, value: 2700000, salary: 31000 },
    { name: 'Pablo Vázquez', position: 'CB', overall: 66, age: 24, value: 2200000, salary: 27000 },
    { name: 'Pablo Sanz', position: 'RB', overall: 66, age: 21, value: 2300000, salary: 34000 },
    { name: 'Mario Molina', position: 'LB', overall: 66, age: 23, value: 2400000, salary: 39000 },
    { name: 'Marc Romero', position: 'CDM', overall: 66, age: 19, value: 2900000, salary: 29000 },
    { name: 'Pablo Ortega', position: 'CDM', overall: 66, age: 26, value: 3000000, salary: 29000 },
    { name: 'Eric Torres', position: 'CM', overall: 66, age: 22, value: 2100000, salary: 25000 },
    { name: 'Diego Pérez', position: 'CAM', overall: 66, age: 20, value: 2500000, salary: 28000 },
    { name: 'Ander Romero', position: 'RW', overall: 66, age: 22, value: 2600000, salary: 41000 },
    { name: 'Nacho Rodríguez', position: 'RW', overall: 66, age: 21, value: 2600000, salary: 31000 },
    { name: 'Pedri Cabrera', position: 'LW', overall: 66, age: 21, value: 2000000, salary: 24000 },
    { name: 'Pol García', position: 'ST', overall: 66, age: 25, value: 2100000, salary: 30000 },
    { name: 'Miguel Gallego', position: 'ST', overall: 66, age: 19, value: 2100000, salary: 33000 }
  ]
};

// Leer archivo actual
const teamsFilePath = path.join(process.cwd(), 'src', 'data', 'teams.js');
let content = fs.readFileSync(teamsFilePath, 'utf8');

// Aplicar actualizaciones
let updatedCount = 0;

for (const [teamId, newPlayers] of Object.entries(SQUAD_UPDATES)) {
  // Buscar el patrón del array de players del equipo
  const teamPattern = new RegExp(
    `(id:\\s*'${teamId}'[\\s\\S]*?players:\\s*\\[)([\\s\\S]*?)(\\]\\s*\\})`,
    'g'
  );
  
  const match = teamPattern.exec(content);
  
  if (match) {
    const [fullMatch, before, existingPlayers, after] = match;
    
    // Generar string de nuevos jugadores
    const newPlayersString = newPlayers.map(p => 
      `      { name: '${p.name}', position: '${p.position}', overall: ${p.overall}, age: ${p.age}, value: ${p.value}, salary: ${p.salary} }`
    ).join(',\n');
    
    // Añadir coma al final de los jugadores existentes si no la tiene
    let cleanExisting = existingPlayers.trim();
    if (cleanExisting.length > 0 && !cleanExisting.endsWith(',')) {
      cleanExisting += ',';
    }
    
    const newContent = `${before}${cleanExisting}\n${newPlayersString}\n    ${after}`;
    
    content = content.replace(fullMatch, newContent);
    updatedCount++;
    console.log(`✅ ${teamId}: Añadidos ${newPlayers.length} jugadores`);
  } else {
    console.log(`⚠️ ${teamId}: No encontrado en el archivo`);
  }
  
  // Reset regex lastIndex
  teamPattern.lastIndex = 0;
}

// Guardar archivo actualizado
fs.writeFileSync(teamsFilePath, content, 'utf8');

console.log(`\n✅ Actualizados ${updatedCount} equipos`);
console.log('📁 Archivo guardado: src/data/teams.js');
