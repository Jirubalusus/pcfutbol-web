# 🎮 Selector de Temporadas - Sistema de Juego

## Estructura para elegir temporada al iniciar partida

```
╔══════════════════════════════════════════════════════════╗
║           🏆 SELECCIONA UNA TEMPORADA 🏆                ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║   📅 TEMPORADAS DISPONIBLES:                            ║
║                                                          ║
║   [1] 2000/2001  ←  Clásica (Bayern, Nantes campeones)  ║
║   [2] 2025/2026  ←  Actual                              ║
║                                                          ║
║   💡 Más temporadas próximamente...                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## Datos por temporada

### 2000/2001
| Liga | Campeón | Equivalente actual |
|------|---------|-------------------|
| Bundesliga | Bayern Munich | Bundesliga |
| Ligue 1 | FC Nantes | Ligue 1 |
| Segunda División B | (4 grupos) | Primera Federación |
| Tercera División | (18 grupos) | Segunda Federación |

### 2025/2026
| Liga | Líder actual | Notas |
|------|-------------|-------|
| Bundesliga | Bayern Munich | Jornada 19 |
| Ligue 1 | PSG | Jornada 19 |
| Primera Federación | - | Jornada 21 |
| Segunda Federación | - | Jornada 15 |

---

## ⚠️ Equivalencias históricas

La estructura del fútbol español ha cambiado:

| Nivel | 2000/2001 | 2025/2026 |
|-------|-----------|-----------|
| 1ª | La Liga | La Liga |
| 2ª | Segunda División | Segunda División |
| 3ª | **Segunda División B** | **Primera Federación** |
| 4ª | **Tercera División** | **Segunda Federación** |
| 5ª | Regionales | Tercera RFEF |

**Primera Federación** se creó en 2021 (antes era Segunda B).
**Segunda Federación** se creó en 2021 (antes era Tercera División).

---

## Archivos de datos

- `scraping_ligas_2000-2001.md` - Temporada 2000/2001
- `scraping_ligas_27-01-2026.md` - Temporada 2025/2026 actual

---

## Código ejemplo para selector (pseudocódigo)

```python
def seleccionar_temporada():
    print("🏆 SELECCIONA UNA TEMPORADA:")
    print("[1] 2000/2001")
    print("[2] 2025/2026")
    
    opcion = input("Elige (1-2): ")
    
    if opcion == "1":
        return cargar_datos("scraping_ligas_2000-2001.md")
    elif opcion == "2":
        return cargar_datos("scraping_ligas_27-01-2026.md")
    else:
        print("Opción no válida")
        return seleccionar_temporada()

def iniciar_partida():
    temporada = seleccionar_temporada()
    ligas = temporada.get_ligas()
    
    print(f"Jugando con datos de {temporada.nombre}")
    # ... resto del juego
```

---

## JSON estructura sugerida

```json
{
  "temporadas": [
    {
      "id": "2000-2001",
      "nombre": "2000/2001",
      "archivo": "scraping_ligas_2000-2001.md",
      "ligas": {
        "alemania": {
          "nombre": "Bundesliga",
          "campeon": "Bayern Munich",
          "equipos": 18
        },
        "francia": {
          "nombre": "Ligue 1 (Division 1)",
          "campeon": "FC Nantes",
          "equipos": 18
        },
        "espana_3": {
          "nombre": "Segunda División B",
          "grupos": 4,
          "equipos_por_grupo": 20
        },
        "espana_4": {
          "nombre": "Tercera División",
          "grupos": 18
        }
      }
    },
    {
      "id": "2025-2026",
      "nombre": "2025/2026",
      "archivo": "scraping_ligas_27-01-2026.md",
      "ligas": {
        "alemania": {
          "nombre": "Bundesliga",
          "lider": "Bayern Munich",
          "equipos": 18
        },
        "francia": {
          "nombre": "Ligue 1",
          "lider": "PSG",
          "equipos": 18
        },
        "espana_3": {
          "nombre": "Primera Federación",
          "grupos": 2,
          "equipos_por_grupo": 20
        },
        "espana_4": {
          "nombre": "Segunda Federación",
          "grupos": 5,
          "equipos_por_grupo": 18
        }
      }
    }
  ]
}
```
