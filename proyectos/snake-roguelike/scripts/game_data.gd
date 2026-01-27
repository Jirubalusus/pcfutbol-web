extends Node
class_name GameData

# Singleton for persistent game data
# Access via GameData.instance

static var instance: GameData

# Player stats (persistent)
var total_score: int = 0
var total_games: int = 0
var total_enemies_killed: int = 0
var total_food_eaten: int = 0
var total_bosses_killed: int = 0
var total_powerups_collected: int = 0
var max_level_reached: int = 1
var max_score: int = 0

# Unlocked content
var unlocked_characters: Array[String] = ["default"]
var unlocked_upgrades: Array[String] = []
var completed_challenges: Array[String] = []

# Active upgrades (selected for current run)
var active_upgrades: Array[String] = []
var selected_character: String = "default"

# Save file path
const SAVE_PATH = "user://save_data.json"

#region Character Definitions
const CHARACTERS = {
	"default": {
		"name": "Classic Snake",
		"description": "La serpiente clásica. Sin habilidades especiales.",
		"color": Color(0.2, 0.8, 0.2),
		"head_color": Color(0.3, 0.9, 0.3),
		"speed_modifier": 1.0,
		"ability": "none",
		"unlock_condition": "none"
	},
	"speedy": {
		"name": "Rayo",
		"description": "30% más rápido, pero más difícil de controlar.",
		"color": Color(1.0, 0.9, 0.2),
		"head_color": Color(1.0, 1.0, 0.4),
		"speed_modifier": 1.3,
		"ability": "none",
		"unlock_condition": "score_1000"
	},
	"tank": {
		"name": "Tanque",
		"description": "Empieza con 5 segmentos extra. Más lento.",
		"color": Color(0.5, 0.5, 0.6),
		"head_color": Color(0.6, 0.6, 0.7),
		"speed_modifier": 0.8,
		"ability": "extra_segments",
		"unlock_condition": "games_10"
	},
	"ghost": {
		"name": "Fantasma",
		"description": "Puede atravesar su propio cuerpo (no paredes).",
		"color": Color(0.7, 0.7, 0.9, 0.7),
		"head_color": Color(0.8, 0.8, 1.0, 0.8),
		"speed_modifier": 1.0,
		"ability": "phase_self",
		"unlock_condition": "food_500"
	},
	"hunter": {
		"name": "Cazador",
		"description": "+50% puntos por matar enemigos.",
		"color": Color(0.9, 0.3, 0.3),
		"head_color": Color(1.0, 0.4, 0.4),
		"speed_modifier": 1.1,
		"ability": "enemy_bonus",
		"unlock_condition": "enemies_100"
	},
	"lucky": {
		"name": "Suertudo",
		"description": "Doble probabilidad de power-ups.",
		"color": Color(0.2, 0.9, 0.7),
		"head_color": Color(0.3, 1.0, 0.8),
		"speed_modifier": 1.0,
		"ability": "lucky",
		"unlock_condition": "powerups_50"
	},
	"boss_slayer": {
		"name": "Mata Jefes",
		"description": "Daño x2 a bosses. Inmune a su veneno.",
		"color": Color(0.8, 0.2, 0.8),
		"head_color": Color(0.9, 0.3, 0.9),
		"speed_modifier": 1.0,
		"ability": "boss_killer",
		"unlock_condition": "bosses_5"
	}
}
#endregion

#region Enemy Definitions
const ENEMY_TYPES = {
	"basic": {
		"name": "Slime",
		"color": Color(0.8, 0.2, 0.8),
		"health": 1,
		"speed": 0.5,
		"behavior": "wander",
		"damage": 1,
		"points": 10
	},
	"chaser": {
		"name": "Perseguidor",
		"color": Color(0.9, 0.4, 0.2),
		"health": 1,
		"speed": 0.4,
		"behavior": "chase",
		"damage": 1,
		"points": 20
	},
	"shooter": {
		"name": "Disparador",
		"color": Color(0.2, 0.6, 0.9),
		"health": 2,
		"speed": 0.7,
		"behavior": "shoot",
		"damage": 1,
		"points": 30
	},
	"splitter": {
		"name": "Divisor",
		"color": Color(0.5, 0.9, 0.3),
		"health": 2,
		"speed": 0.6,
		"behavior": "split",
		"damage": 1,
		"points": 25
	},
	"teleporter": {
		"name": "Teletransportador",
		"color": Color(0.6, 0.2, 0.9),
		"health": 1,
		"speed": 0.8,
		"behavior": "teleport",
		"damage": 1,
		"points": 35
	},
	"bomber": {
		"name": "Bombardero",
		"color": Color(0.9, 0.6, 0.1),
		"health": 1,
		"speed": 0.6,
		"behavior": "explode",
		"damage": 2,
		"points": 40
	}
}
#endregion

#region Boss Definitions
const BOSSES = {
	"king_slime": {
		"name": "Rey Slime",
		"color": Color(0.9, 0.3, 0.9),
		"health": 10,
		"size": 3,
		"speed": 0.8,
		"attacks": ["spawn_minions", "charge"],
		"points": 500,
		"level_requirement": 3
	},
	"serpent_queen": {
		"name": "Reina Serpiente",
		"color": Color(0.2, 0.8, 0.4),
		"health": 15,
		"size": 4,
		"speed": 0.6,
		"attacks": ["poison_trail", "constrict"],
		"points": 750,
		"level_requirement": 5
	},
	"void_worm": {
		"name": "Gusano del Vacío",
		"color": Color(0.1, 0.1, 0.2),
		"health": 20,
		"size": 5,
		"speed": 0.5,
		"attacks": ["teleport_attack", "void_zones", "summon"],
		"points": 1000,
		"level_requirement": 7
	},
	"chaos_hydra": {
		"name": "Hidra del Caos",
		"color": Color(0.9, 0.2, 0.2),
		"health": 30,
		"size": 4,
		"speed": 0.7,
		"attacks": ["multi_head", "fire_breath", "regenerate"],
		"points": 1500,
		"level_requirement": 10
	}
}
#endregion

#region Obstacle Definitions
const OBSTACLE_TYPES = {
	"wall": {
		"name": "Muro",
		"color": Color(0.4, 0.4, 0.5),
		"destructible": false,
		"damage": 1,
		"blocks_enemies": true
	},
	"spike": {
		"name": "Pinchos",
		"color": Color(0.6, 0.3, 0.3),
		"destructible": false,
		"damage": 2,
		"blocks_enemies": false
	},
	"breakable": {
		"name": "Roca",
		"color": Color(0.5, 0.4, 0.3),
		"destructible": true,
		"health": 3,
		"damage": 1,
		"blocks_enemies": true,
		"drops": ["food", "powerup"]
	},
	"poison": {
		"name": "Charco Venenoso",
		"color": Color(0.3, 0.6, 0.2),
		"destructible": false,
		"damage": 0,
		"effect": "slow",
		"blocks_enemies": false
	},
	"ice": {
		"name": "Hielo",
		"color": Color(0.7, 0.9, 1.0),
		"destructible": false,
		"damage": 0,
		"effect": "slide",
		"blocks_enemies": false
	},
	"portal": {
		"name": "Portal",
		"color": Color(0.5, 0.2, 0.8),
		"destructible": false,
		"damage": 0,
		"effect": "teleport",
		"blocks_enemies": false
	}
}
#endregion

#region Upgrade Definitions
const UPGRADES = {
	"health_boost": {
		"name": "Vida Extra",
		"description": "Sobrevive un golpe fatal (una vez por partida)",
		"unlock_condition": "games_5",
		"max_level": 3
	},
	"speed_start": {
		"name": "Arranque Rápido",
		"description": "+10% velocidad inicial",
		"unlock_condition": "score_500",
		"max_level": 3
	},
	"magnet": {
		"name": "Imán",
		"description": "Atrae comida cercana",
		"unlock_condition": "food_200",
		"max_level": 2
	},
	"combo_master": {
		"name": "Combo Master",
		"description": "+5% puntos por combo de comida",
		"unlock_condition": "score_2000",
		"max_level": 5
	},
	"enemy_radar": {
		"name": "Radar",
		"description": "Los enemigos brillan cuando están cerca",
		"unlock_condition": "enemies_50",
		"max_level": 1
	},
	"powerup_duration": {
		"name": "Duración+",
		"description": "+20% duración de power-ups",
		"unlock_condition": "powerups_25",
		"max_level": 3
	},
	"boss_damage": {
		"name": "Cazabosses",
		"description": "+15% daño a bosses",
		"unlock_condition": "bosses_3",
		"max_level": 3
	},
	"lucky_drops": {
		"name": "Drops Mejorados",
		"description": "+10% probabilidad de drops raros",
		"unlock_condition": "level_5",
		"max_level": 3
	}
}
#endregion

#region Challenge Definitions
const CHALLENGES = {
	"score_500": {"name": "Principiante", "description": "Alcanza 500 puntos", "reward": "speed_start"},
	"score_1000": {"name": "Intermedio", "description": "Alcanza 1000 puntos", "reward": "speedy"},
	"score_2000": {"name": "Experto", "description": "Alcanza 2000 puntos", "reward": "combo_master"},
	"score_5000": {"name": "Maestro", "description": "Alcanza 5000 puntos", "reward": "special_skin"},
	"games_5": {"name": "Persistente", "description": "Juega 5 partidas", "reward": "health_boost"},
	"games_10": {"name": "Dedicado", "description": "Juega 10 partidas", "reward": "tank"},
	"games_50": {"name": "Veterano", "description": "Juega 50 partidas", "reward": "special_title"},
	"food_200": {"name": "Glotón", "description": "Come 200 comidas", "reward": "magnet"},
	"food_500": {"name": "Insaciable", "description": "Come 500 comidas", "reward": "ghost"},
	"enemies_50": {"name": "Cazador Novato", "description": "Mata 50 enemigos", "reward": "enemy_radar"},
	"enemies_100": {"name": "Cazador Experto", "description": "Mata 100 enemigos", "reward": "hunter"},
	"enemies_500": {"name": "Exterminador", "description": "Mata 500 enemigos", "reward": "special_effect"},
	"powerups_25": {"name": "Coleccionista", "description": "Recoge 25 power-ups", "reward": "powerup_duration"},
	"powerups_50": {"name": "Power Gamer", "description": "Recoge 50 power-ups", "reward": "lucky"},
	"bosses_3": {"name": "Matajefes", "description": "Derrota 3 bosses", "reward": "boss_damage"},
	"bosses_5": {"name": "Leyenda", "description": "Derrota 5 bosses", "reward": "boss_slayer"},
	"bosses_10": {"name": "Dios de la Guerra", "description": "Derrota 10 bosses", "reward": "ultimate_skin"},
	"level_5": {"name": "Explorador", "description": "Alcanza nivel 5", "reward": "lucky_drops"},
	"level_10": {"name": "Aventurero", "description": "Alcanza nivel 10", "reward": "special_map"}
}
#endregion

func _ready() -> void:
	instance = self
	load_data()

func save_data() -> void:
	var data = {
		"total_score": total_score,
		"total_games": total_games,
		"total_enemies_killed": total_enemies_killed,
		"total_food_eaten": total_food_eaten,
		"total_bosses_killed": total_bosses_killed,
		"total_powerups_collected": total_powerups_collected,
		"max_level_reached": max_level_reached,
		"max_score": max_score,
		"unlocked_characters": unlocked_characters,
		"unlocked_upgrades": unlocked_upgrades,
		"completed_challenges": completed_challenges,
		"selected_character": selected_character,
		"active_upgrades": active_upgrades
	}
	
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data))
		file.close()

func load_data() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var json = JSON.new()
		var error = json.parse(file.get_as_text())
		file.close()
		
		if error == OK:
			var data = json.data
			total_score = data.get("total_score", 0)
			total_games = data.get("total_games", 0)
			total_enemies_killed = data.get("total_enemies_killed", 0)
			total_food_eaten = data.get("total_food_eaten", 0)
			total_bosses_killed = data.get("total_bosses_killed", 0)
			total_powerups_collected = data.get("total_powerups_collected", 0)
			max_level_reached = data.get("max_level_reached", 1)
			max_score = data.get("max_score", 0)
			unlocked_characters = Array(data.get("unlocked_characters", ["default"]), TYPE_STRING, "", null)
			unlocked_upgrades = Array(data.get("unlocked_upgrades", []), TYPE_STRING, "", null)
			completed_challenges = Array(data.get("completed_challenges", []), TYPE_STRING, "", null)
			selected_character = data.get("selected_character", "default")
			active_upgrades = Array(data.get("active_upgrades", []), TYPE_STRING, "", null)

func add_stats(score: int, enemies: int, food: int, bosses: int, powerups: int, level: int) -> void:
	total_score += score
	total_games += 1
	total_enemies_killed += enemies
	total_food_eaten += food
	total_bosses_killed += bosses
	total_powerups_collected += powerups
	
	if score > max_score:
		max_score = score
	if level > max_level_reached:
		max_level_reached = level
	
	check_challenges()
	save_data()

func check_challenges() -> void:
	for challenge_id in CHALLENGES.keys():
		if challenge_id in completed_challenges:
			continue
		
		var completed = false
		
		if challenge_id.begins_with("score_"):
			var required = int(challenge_id.split("_")[1])
			completed = max_score >= required
		elif challenge_id.begins_with("games_"):
			var required = int(challenge_id.split("_")[1])
			completed = total_games >= required
		elif challenge_id.begins_with("food_"):
			var required = int(challenge_id.split("_")[1])
			completed = total_food_eaten >= required
		elif challenge_id.begins_with("enemies_"):
			var required = int(challenge_id.split("_")[1])
			completed = total_enemies_killed >= required
		elif challenge_id.begins_with("powerups_"):
			var required = int(challenge_id.split("_")[1])
			completed = total_powerups_collected >= required
		elif challenge_id.begins_with("bosses_"):
			var required = int(challenge_id.split("_")[1])
			completed = total_bosses_killed >= required
		elif challenge_id.begins_with("level_"):
			var required = int(challenge_id.split("_")[1])
			completed = max_level_reached >= required
		
		if completed:
			complete_challenge(challenge_id)

func complete_challenge(challenge_id: String) -> void:
	if challenge_id in completed_challenges:
		return
	
	completed_challenges.append(challenge_id)
	
	var challenge = CHALLENGES[challenge_id]
	var reward = challenge.reward
	
	# Unlock reward
	if reward in CHARACTERS.keys() and reward not in unlocked_characters:
		unlocked_characters.append(reward)
	elif reward in UPGRADES.keys() and reward not in unlocked_upgrades:
		unlocked_upgrades.append(reward)
	
	save_data()

func get_character_data(char_id: String) -> Dictionary:
	return CHARACTERS.get(char_id, CHARACTERS["default"])

func is_character_unlocked(char_id: String) -> bool:
	return char_id in unlocked_characters

func is_upgrade_unlocked(upgrade_id: String) -> bool:
	return upgrade_id in unlocked_upgrades
