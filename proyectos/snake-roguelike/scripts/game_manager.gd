extends Node2D
class_name GameManager

# Mobile-optimized grid settings (720x1280 portrait)
# Game area: 720x900 (leaving space for UI)
const CELL_SIZE = 30
const GRID_WIDTH = 24  # 720 / 30
const GRID_HEIGHT = 30  # 900 / 30
const GAME_OFFSET_Y = 180  # Space for top UI

# Game state
var score: int = 0
var level: int = 1
var is_game_over: bool = false
var is_paused: bool = false
var is_boss_fight: bool = false
var game_started: bool = false

# Session stats
var session_enemies_killed: int = 0
var session_food_eaten: int = 0
var session_bosses_killed: int = 0
var session_powerups_collected: int = 0

# Snake data
var snake_body: Array[Vector2i] = []
var direction: Vector2i = Vector2i.DOWN
var next_direction: Vector2i = Vector2i.DOWN
var extra_lives: int = 0

# Items and enemies
var food_positions: Array[Vector2i] = []
var power_ups: Array[Dictionary] = []
var enemies: Array[Dictionary] = []
var obstacles: Array[Dictionary] = []
var projectiles: Array[Dictionary] = []
var current_boss: Dictionary = {}

# Visual effects
var particles: Array[Dictionary] = []
var screen_shake: float = 0.0
var food_pulse_timer: float = 0.0

# Power-up effects
var speed_multiplier: float = 1.0
var is_invincible: bool = false
var can_phase_through: bool = false
var has_magnet: bool = false
var combo_multiplier: float = 1.0
var combo_count: int = 0

# Timers
var move_timer: float = 0.0
var base_move_delay: float = 0.22  # SLOWER for mobile - easier to control!
var power_up_timers: Dictionary = {}
var combo_timer: float = 0.0

# Character data
var current_character: Dictionary = {}

# Signals
signal score_changed(new_score: int)
signal level_changed(new_level: int)
signal lives_changed(new_lives: int)
signal game_over
signal snake_grew
signal boss_spawned(boss_data: Dictionary)
signal boss_defeated(boss_data: Dictionary)

# Power-up types
enum PowerUpType {
	SPEED_BOOST,
	SLOW_TIME,
	INVINCIBILITY,
	PHASE_THROUGH,
	DOUBLE_POINTS,
	EXTRA_LIFE,
	MAGNET,
	SHIELD,
	MEGA_GROWTH
}

# ============================================
# 🎨 PIXEL ART COLOR PALETTE - Vibrant Retro
# ============================================

# Background & Grid
var COLOR_BG_DARK = Color("#0f0f1a")
var COLOR_BG_LIGHT = Color("#151525")
var COLOR_GRID = Color("#1a1a30")
var COLOR_GRID_ACCENT = Color("#252540")

# Walls - Stone look
var COLOR_WALL_MAIN = Color("#4a4a6a")
var COLOR_WALL_HI = Color("#6a6a9a")
var COLOR_WALL_LO = Color("#2a2a4a")
var COLOR_WALL_DETAIL = Color("#3a3a5a")

# Spikes - Dangerous red
var COLOR_SPIKE_MAIN = Color("#aa3a3a")
var COLOR_SPIKE_TIP = Color("#dd5555")
var COLOR_SPIKE_SHADOW = Color("#662222")

# Snake - Vibrant green with glow
var COLOR_SNAKE_BODY = Color("#22dd44")
var COLOR_SNAKE_HEAD = Color("#44ff66")
var COLOR_SNAKE_LO = Color("#118822")
var COLOR_SNAKE_OUTLINE = Color("#0a5515")
var COLOR_SNAKE_EYE = Color("#ffffff")
var COLOR_SNAKE_PUPIL = Color("#111111")
var COLOR_SNAKE_GLOW = Color("#44ff6633")

# Food - Juicy apple
var COLOR_FOOD_MAIN = Color("#ff4455")
var COLOR_FOOD_HI = Color("#ff8888")
var COLOR_FOOD_LO = Color("#aa2233")
var COLOR_FOOD_LEAF = Color("#44dd44")
var COLOR_FOOD_STEM = Color("#885533")

# Enemies - Purple menace
var COLOR_ENEMY_MAIN = Color("#aa44cc")
var COLOR_ENEMY_HI = Color("#cc66ee")
var COLOR_ENEMY_LO = Color("#662288")
var COLOR_ENEMY_EYE = Color("#ffff88")

# Boss - Imposing presence
var COLOR_BOSS_MAIN = Color("#dd44dd")
var COLOR_BOSS_HI = Color("#ff66ff")
var COLOR_BOSS_LO = Color("#881188")
var COLOR_BOSS_OUTLINE = Color("#440044")

func _ready() -> void:
	randomize()
	load_character()

func load_character() -> void:
	if GameData.instance:
		current_character = GameData.instance.get_character_data(GameData.instance.selected_character)
	else:
		current_character = {
			"speed_modifier": 1.0,
			"ability": "none",
			"color": COLOR_SNAKE_BODY,
			"head_color": COLOR_SNAKE_HEAD
		}

func _process(delta: float) -> void:
	food_pulse_timer += delta * 4.0
	
	# Update particles
	update_particles(delta)
	
	# Screen shake decay
	if screen_shake > 0:
		screen_shake = max(0, screen_shake - delta * 10)
	
	if not game_started or is_game_over or is_paused:
		queue_redraw()
		return
	
	handle_input()
	update_power_up_timers(delta)
	update_combo_timer(delta)
	update_projectiles(delta)
	
	if is_boss_fight:
		update_boss(delta)
	
	move_timer += delta
	var char_speed = current_character.get("speed_modifier", 1.0)
	var current_delay = base_move_delay / (speed_multiplier * char_speed)
	
	if move_timer >= current_delay:
		move_timer = 0.0
		move_snake()

func update_particles(delta: float) -> void:
	var to_remove = []
	for i in range(particles.size()):
		var p = particles[i]
		p.life -= delta
		p.pos += p.vel * delta
		p.vel.y += 200 * delta  # Gravity
		if p.life <= 0:
			to_remove.append(i)
	
	for i in range(to_remove.size() - 1, -1, -1):
		particles.remove_at(to_remove[i])

func spawn_particles(pos: Vector2, color: Color, count: int = 8) -> void:
	for i in range(count):
		var angle = randf() * TAU
		var speed = randf_range(50, 150)
		particles.append({
			"pos": pos,
			"vel": Vector2(cos(angle), sin(angle)) * speed,
			"color": color,
			"life": randf_range(0.3, 0.6),
			"size": randf_range(3, 6)
		})

func spawn_eat_particles(pos: Vector2i) -> void:
	var world_pos = Vector2(pos.x * CELL_SIZE + CELL_SIZE/2, GAME_OFFSET_Y + pos.y * CELL_SIZE + CELL_SIZE/2)
	spawn_particles(world_pos, COLOR_FOOD_MAIN, 12)
	spawn_particles(world_pos, COLOR_FOOD_HI, 6)

func spawn_powerup_particles(pos: Vector2i, color: Color) -> void:
	var world_pos = Vector2(pos.x * CELL_SIZE + CELL_SIZE/2, GAME_OFFSET_Y + pos.y * CELL_SIZE + CELL_SIZE/2)
	for i in range(16):
		var angle = (float(i) / 16.0) * TAU
		var speed = 100
		particles.append({
			"pos": world_pos,
			"vel": Vector2(cos(angle), sin(angle)) * speed,
			"color": color,
			"life": 0.8,
			"size": 5
		})

func handle_input() -> void:
	if Input.is_action_just_pressed("pause"):
		is_paused = !is_paused
		return
	
	var new_direction = direction
	
	if Input.is_action_just_pressed("move_up") and direction != Vector2i.DOWN:
		new_direction = Vector2i.UP
	elif Input.is_action_just_pressed("move_down") and direction != Vector2i.UP:
		new_direction = Vector2i.DOWN
	elif Input.is_action_just_pressed("move_left") and direction != Vector2i.RIGHT:
		new_direction = Vector2i.LEFT
	elif Input.is_action_just_pressed("move_right") and direction != Vector2i.LEFT:
		new_direction = Vector2i.RIGHT
	
	next_direction = new_direction

func set_direction(new_dir: Vector2i) -> void:
	print("GameManager: set_direction called with: ", new_dir, " current: ", direction)
	if new_dir == Vector2i.UP and direction != Vector2i.DOWN:
		next_direction = Vector2i.UP
		print("GameManager: next_direction = UP")
	elif new_dir == Vector2i.DOWN and direction != Vector2i.UP:
		next_direction = Vector2i.DOWN
		print("GameManager: next_direction = DOWN")
	elif new_dir == Vector2i.LEFT and direction != Vector2i.RIGHT:
		next_direction = Vector2i.LEFT
		print("GameManager: next_direction = LEFT")
	elif new_dir == Vector2i.RIGHT and direction != Vector2i.LEFT:
		next_direction = Vector2i.RIGHT
		print("GameManager: next_direction = RIGHT")
	else:
		print("GameManager: Direction blocked (can't reverse)")

func start_game() -> void:
	game_started = true
	start_new_game()

func start_new_game() -> void:
	score = 0
	level = 1
	is_game_over = false
	is_boss_fight = false
	speed_multiplier = 1.0
	is_invincible = false
	can_phase_through = false
	has_magnet = false
	combo_multiplier = 1.0
	combo_count = 0
	extra_lives = 0
	particles.clear()
	
	session_enemies_killed = 0
	session_food_eaten = 0
	session_bosses_killed = 0
	session_powerups_collected = 0
	
	var center = Vector2i(GRID_WIDTH / 2, 5)
	snake_body = []
	for i in range(3):
		snake_body.append(center - Vector2i.DOWN * i)
	
	direction = Vector2i.DOWN
	next_direction = Vector2i.DOWN
	
	food_positions.clear()
	power_ups.clear()
	enemies.clear()
	obstacles.clear()
	projectiles.clear()
	current_boss = {}
	
	generate_level()
	spawn_food()
	
	emit_signal("score_changed", score)
	emit_signal("level_changed", level)
	emit_signal("lives_changed", extra_lives)
	queue_redraw()

func generate_level() -> void:
	obstacles.clear()
	
	# Border walls
	for x in range(GRID_WIDTH):
		obstacles.append({"position": Vector2i(x, 0), "type": "wall"})
		obstacles.append({"position": Vector2i(x, GRID_HEIGHT - 1), "type": "wall"})
	for y in range(1, GRID_HEIGHT - 1):
		obstacles.append({"position": Vector2i(0, y), "type": "wall"})
		obstacles.append({"position": Vector2i(GRID_WIDTH - 1, y), "type": "wall"})
	
	# Random obstacles based on level
	var num_obstacles = level * 2
	var obstacle_types = ["wall", "spike"]
	
	for i in range(num_obstacles):
		var pos = get_random_empty_position()
		if pos != Vector2i(-1, -1):
			var obs_type = obstacle_types[randi() % min(obstacle_types.size(), 1 + level / 3)]
			obstacles.append({"position": pos, "type": obs_type})
	
	if level >= 2:
		spawn_enemies_for_level()
	
	if randf() < 0.3:
		spawn_power_up()

func spawn_enemies_for_level() -> void:
	var num_enemies = mini(level - 1, 4)
	
	for i in range(num_enemies):
		var enemy_type = "basic"
		if level >= 3 and randf() < 0.3:
			enemy_type = "chaser"
		spawn_enemy(enemy_type)

func get_random_empty_position() -> Vector2i:
	var attempts = 100
	while attempts > 0:
		var pos = Vector2i(
			randi_range(2, GRID_WIDTH - 3),
			randi_range(2, GRID_HEIGHT - 3)
		)
		if is_position_valid(pos):
			return pos
		attempts -= 1
	return Vector2i(-1, -1)

func is_position_valid(pos: Vector2i) -> bool:
	if pos in snake_body:
		return false
	for obs in obstacles:
		if obs.position == pos:
			return false
	if pos in food_positions:
		return false
	for enemy in enemies:
		if enemy.position == pos:
			return false
	for pu in power_ups:
		if pu.position == pos:
			return false
	return true

func spawn_food() -> void:
	var pos = get_random_empty_position()
	if pos != Vector2i(-1, -1):
		food_positions.append(pos)

func spawn_power_up() -> void:
	var pos = get_random_empty_position()
	if pos != Vector2i(-1, -1):
		var pu_type = randi() % PowerUpType.size()
		power_ups.append({
			"position": pos,
			"type": pu_type
		})

func spawn_enemy(enemy_type: String) -> void:
	var pos = get_random_empty_position()
	if pos == Vector2i(-1, -1):
		return
	
	var speed = 0.5 if enemy_type == "basic" else 0.4
	
	enemies.append({
		"position": pos,
		"type": enemy_type,
		"direction": [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT].pick_random(),
		"move_timer": 0.0,
		"move_delay": speed,
		"health": 1,
		"anim_timer": randf() * TAU
	})

func spawn_boss() -> void:
	var boss_pos = Vector2i(GRID_WIDTH / 2 - 1, 3)
	
	current_boss = {
		"id": "king_slime",
		"position": boss_pos,
		"health": 5 + level * 2,
		"max_health": 5 + level * 2,
		"size": 2,
		"attack_timer": 0.0,
		"attack_delay": 2.0,
		"anim_phase": 0.0
	}
	
	is_boss_fight = true
	emit_signal("boss_spawned", current_boss)

func update_boss(delta: float) -> void:
	if current_boss.is_empty():
		return
	
	current_boss.anim_phase += delta * 2
	current_boss.attack_timer += delta
	
	if current_boss.attack_timer >= current_boss.get("attack_delay", 2.0):
		current_boss.attack_timer = 0.0
		spawn_enemy("basic")
	
	if randf() < 0.02:
		var move_dir = [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT].pick_random()
		var new_pos = current_boss.position + move_dir
		if new_pos.x > 2 and new_pos.x < GRID_WIDTH - 4:
			if new_pos.y > 2 and new_pos.y < GRID_HEIGHT - 4:
				current_boss.position = new_pos

func move_snake() -> void:
	print("GameManager: move_snake() - next_direction=", next_direction, " direction=", direction)
	direction = next_direction
	var new_head = snake_body[0] + direction
	
	# Magnet effect
	if has_magnet:
		for i in range(food_positions.size()):
			var food_pos = food_positions[i]
			var dist = (food_pos - new_head).length()
			if dist < 4 and dist > 1:
				var to_snake = (new_head - food_pos).sign()
				food_positions[i] = food_pos + to_snake
	
	# Check collisions
	if check_collision(new_head):
		if not is_invincible:
			if extra_lives > 0:
				extra_lives -= 1
				screen_shake = 3.0
				emit_signal("lives_changed", extra_lives)
			else:
				screen_shake = 5.0
				trigger_game_over()
				return
	
	snake_body.insert(0, new_head)
	
	# Check food
	var ate_food = false
	for i in range(food_positions.size() - 1, -1, -1):
		if new_head == food_positions[i]:
			spawn_eat_particles(food_positions[i])
			food_positions.remove_at(i)
			ate_food = true
			session_food_eaten += 1
			combo_count += 1
			combo_timer = 2.0
			
			var points = 10 * level
			points = int(points * combo_multiplier * (1 + combo_count * 0.1))
			add_score(points)
			
			emit_signal("snake_grew")
			spawn_food()
			
			if randf() < 0.2:
				spawn_power_up()
			break
	
	if not ate_food:
		snake_body.pop_back()
		combo_count = 0
	
	# Check power-ups
	for i in range(power_ups.size() - 1, -1, -1):
		if new_head == power_ups[i].position:
			var pu_color = get_power_up_color(power_ups[i].type)
			spawn_powerup_particles(power_ups[i].position, pu_color)
			apply_power_up(power_ups[i].type)
			power_ups.remove_at(i)
			session_powerups_collected += 1
			break
	
	# Check boss collision
	if not current_boss.is_empty():
		var boss_rect = Rect2i(current_boss.position, Vector2i(current_boss.size, current_boss.size))
		if boss_rect.has_point(new_head):
			damage_boss(1)
	
	move_enemies()
	check_level_progression()
	queue_redraw()

func check_collision(pos: Vector2i) -> bool:
	for obs in obstacles:
		if obs.position == pos:
			if not can_phase_through:
				return true
	
	var can_phase_self = can_phase_through or current_character.get("ability") == "phase_self"
	if pos in snake_body and not can_phase_self:
		return true
	
	for enemy in enemies:
		if pos == enemy.position:
			return true
	
	return false

func move_enemies() -> void:
	for enemy in enemies:
		enemy.anim_timer += base_move_delay * 5
		enemy.move_timer += base_move_delay
		if enemy.move_timer >= enemy.move_delay:
			enemy.move_timer = 0.0
			
			if enemy.type == "chaser":
				var to_snake = snake_body[0] - enemy.position
				if abs(to_snake.x) > abs(to_snake.y):
					enemy.direction = Vector2i(sign(to_snake.x), 0)
				else:
					enemy.direction = Vector2i(0, sign(to_snake.y))
			else:
				if randf() < 0.2:
					enemy.direction = [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT].pick_random()
			
			var new_pos = enemy.position + enemy.direction
			
			var can_move = true
			if new_pos.x <= 0 or new_pos.x >= GRID_WIDTH - 1:
				can_move = false
			if new_pos.y <= 0 or new_pos.y >= GRID_HEIGHT - 1:
				can_move = false
			for obs in obstacles:
				if obs.position == new_pos and obs.type == "wall":
					can_move = false
					break
			
			if can_move:
				enemy.position = new_pos
				
				if enemy.position in snake_body and not is_invincible:
					if extra_lives > 0:
						extra_lives -= 1
						screen_shake = 3.0
						emit_signal("lives_changed", extra_lives)
					else:
						screen_shake = 5.0
						trigger_game_over()

func update_projectiles(delta: float) -> void:
	pass

func damage_boss(amount: int) -> void:
	if current_boss.is_empty():
		return
	
	current_boss.health -= amount
	screen_shake = 2.0
	
	# Spawn hit particles
	var boss_center = Vector2(
		current_boss.position.x * CELL_SIZE + current_boss.size * CELL_SIZE / 2,
		GAME_OFFSET_Y + current_boss.position.y * CELL_SIZE + current_boss.size * CELL_SIZE / 2
	)
	spawn_particles(boss_center, COLOR_BOSS_HI, 8)
	
	if current_boss.health <= 0:
		defeat_boss()

func defeat_boss() -> void:
	add_score(500)
	session_bosses_killed += 1
	screen_shake = 5.0
	
	# Big explosion
	var boss_center = Vector2(
		current_boss.position.x * CELL_SIZE + current_boss.size * CELL_SIZE / 2,
		GAME_OFFSET_Y + current_boss.position.y * CELL_SIZE + current_boss.size * CELL_SIZE / 2
	)
	spawn_particles(boss_center, COLOR_BOSS_MAIN, 30)
	spawn_particles(boss_center, COLOR_BOSS_HI, 20)
	
	emit_signal("boss_defeated", current_boss)
	
	current_boss = {}
	is_boss_fight = false
	
	for i in range(5):
		spawn_food()
	spawn_power_up()

func apply_power_up(type: int) -> void:
	match type:
		PowerUpType.SPEED_BOOST:
			speed_multiplier = 1.3
			power_up_timers["speed"] = 5.0
			add_score(25)
		PowerUpType.SLOW_TIME:
			speed_multiplier = 0.6
			power_up_timers["slow"] = 5.0
			add_score(25)
		PowerUpType.INVINCIBILITY:
			is_invincible = true
			power_up_timers["invincible"] = 3.0
			add_score(50)
		PowerUpType.PHASE_THROUGH:
			can_phase_through = true
			power_up_timers["phase"] = 4.0
			add_score(50)
		PowerUpType.DOUBLE_POINTS:
			combo_multiplier = 2.0
			power_up_timers["double"] = 10.0
			add_score(25)
		PowerUpType.EXTRA_LIFE:
			extra_lives += 1
			emit_signal("lives_changed", extra_lives)
			add_score(100)
		PowerUpType.MAGNET:
			has_magnet = true
			power_up_timers["magnet"] = 8.0
			add_score(30)
		PowerUpType.SHIELD:
			extra_lives += 1
			emit_signal("lives_changed", extra_lives)
			add_score(75)
		PowerUpType.MEGA_GROWTH:
			for i in range(3):
				snake_body.append(snake_body[-1])
			add_score(50)

func update_power_up_timers(delta: float) -> void:
	var to_remove = []
	for key in power_up_timers.keys():
		power_up_timers[key] -= delta
		if power_up_timers[key] <= 0:
			to_remove.append(key)
			match key:
				"speed", "slow":
					speed_multiplier = 1.0
				"invincible":
					is_invincible = false
				"phase":
					can_phase_through = false
				"double":
					combo_multiplier = 1.0
				"magnet":
					has_magnet = false
	
	for key in to_remove:
		power_up_timers.erase(key)

func update_combo_timer(delta: float) -> void:
	if combo_timer > 0:
		combo_timer -= delta
		if combo_timer <= 0:
			combo_count = 0

func add_score(points: int) -> void:
	score += int(points * combo_multiplier)
	emit_signal("score_changed", score)

func check_level_progression() -> void:
	var required_score = level * 100 + (level - 1) * 50
	
	if score >= required_score:
		advance_level()

func advance_level() -> void:
	level += 1
	base_move_delay = max(0.12, base_move_delay - 0.008)  # Slower progression for mobile
	
	# Level up particles
	for segment in snake_body:
		var pos = Vector2(segment.x * CELL_SIZE + CELL_SIZE/2, GAME_OFFSET_Y + segment.y * CELL_SIZE + CELL_SIZE/2)
		spawn_particles(pos, Color(1, 1, 0.3), 4)
	
	if level % 5 == 0:
		spawn_boss()
	else:
		generate_level()
		spawn_food()
	
	emit_signal("level_changed", level)

func trigger_game_over() -> void:
	is_game_over = true
	
	# Death explosion
	for segment in snake_body:
		var pos = Vector2(segment.x * CELL_SIZE + CELL_SIZE/2, GAME_OFFSET_Y + segment.y * CELL_SIZE + CELL_SIZE/2)
		spawn_particles(pos, COLOR_SNAKE_BODY, 6)
		spawn_particles(pos, COLOR_SNAKE_HEAD, 3)
	
	if GameData.instance:
		GameData.instance.add_stats(
			score,
			session_enemies_killed,
			session_food_eaten,
			session_bosses_killed,
			session_powerups_collected,
			level
		)
	
	emit_signal("game_over")

func toggle_pause() -> void:
	is_paused = !is_paused

# ============================================
# 🎨 PIXEL ART RENDERING
# ============================================

func _draw() -> void:
	var shake_offset = Vector2.ZERO
	if screen_shake > 0:
		shake_offset = Vector2(randf_range(-screen_shake, screen_shake), randf_range(-screen_shake, screen_shake))
	
	# Draw background with checkerboard pattern
	draw_background()
	
	# Draw grid dots
	draw_grid()
	
	# Draw obstacles with pixel art style
	for obs in obstacles:
		if obs.type == "wall":
			draw_wall_pixel(obs.position, shake_offset)
		else:
			draw_spike_pixel(obs.position, shake_offset)
	
	# Draw food with pixel art style
	for food in food_positions:
		draw_food_pixel(food, shake_offset)
	
	# Draw power-ups
	for pu in power_ups:
		draw_powerup_pixel(pu, shake_offset)
	
	# Draw enemies
	for enemy in enemies:
		draw_enemy_pixel(enemy, shake_offset)
	
	# Draw boss
	if not current_boss.is_empty():
		draw_boss_pixel(shake_offset)
	
	# Draw snake
	draw_snake_pixel(shake_offset)
	
	# Draw direction indicator (shows where you'll turn)
	if game_started and not is_paused and not is_game_over:
		draw_direction_indicator(shake_offset)
	
	# Draw particles
	for p in particles:
		var alpha = p.life / 0.6
		var color = p.color
		color.a = alpha
		draw_rect(Rect2(p.pos - Vector2(p.size/2, p.size/2), Vector2(p.size, p.size)), color)

func draw_background() -> void:
	# Dark base
	draw_rect(Rect2(0, GAME_OFFSET_Y, GRID_WIDTH * CELL_SIZE, GRID_HEIGHT * CELL_SIZE), COLOR_BG_DARK)
	
	# Subtle checkerboard
	for x in range(GRID_WIDTH):
		for y in range(GRID_HEIGHT):
			if (x + y) % 2 == 0:
				draw_rect(
					Rect2(x * CELL_SIZE, GAME_OFFSET_Y + y * CELL_SIZE, CELL_SIZE, CELL_SIZE),
					COLOR_BG_LIGHT
				)

func draw_grid() -> void:
	# Subtle grid lines
	for x in range(1, GRID_WIDTH):
		draw_line(
			Vector2(x * CELL_SIZE, GAME_OFFSET_Y),
			Vector2(x * CELL_SIZE, GAME_OFFSET_Y + GRID_HEIGHT * CELL_SIZE),
			COLOR_GRID,
			1.0
		)
	for y in range(1, GRID_HEIGHT):
		draw_line(
			Vector2(0, GAME_OFFSET_Y + y * CELL_SIZE),
			Vector2(GRID_WIDTH * CELL_SIZE, GAME_OFFSET_Y + y * CELL_SIZE),
			COLOR_GRID,
			1.0
		)

func draw_wall_pixel(pos: Vector2i, offset: Vector2) -> void:
	var px = pos.x * CELL_SIZE + offset.x
	var py = GAME_OFFSET_Y + pos.y * CELL_SIZE + offset.y
	var s = CELL_SIZE
	
	# Main block
	draw_rect(Rect2(px, py, s, s), COLOR_WALL_MAIN)
	
	# Highlight (top-left)
	draw_rect(Rect2(px, py, s, 3), COLOR_WALL_HI)
	draw_rect(Rect2(px, py, 3, s), COLOR_WALL_HI)
	
	# Shadow (bottom-right)
	draw_rect(Rect2(px, py + s - 3, s, 3), COLOR_WALL_LO)
	draw_rect(Rect2(px + s - 3, py, 3, s), COLOR_WALL_LO)
	
	# Inner detail - brick pattern
	draw_rect(Rect2(px + 4, py + 8, s - 8, 2), COLOR_WALL_DETAIL)
	draw_rect(Rect2(px + 8, py + 16, s - 12, 2), COLOR_WALL_DETAIL)
	draw_rect(Rect2(px + s/2, py + 4, 2, 6), COLOR_WALL_DETAIL)

func draw_spike_pixel(pos: Vector2i, offset: Vector2) -> void:
	var px = pos.x * CELL_SIZE + offset.x
	var py = GAME_OFFSET_Y + pos.y * CELL_SIZE + offset.y
	var s = CELL_SIZE
	
	# Base
	draw_rect(Rect2(px + 2, py + s - 8, s - 4, 8), COLOR_SPIKE_SHADOW)
	
	# Spikes (triangles via small rects)
	var spike_width = 8
	var num_spikes = 3
	for i in range(num_spikes):
		var sx = px + 3 + i * spike_width
		var base_y = py + s - 8
		# Draw triangular spike using rects
		for j in range(8):
			var w = spike_width - j * 2
			if w > 0:
				draw_rect(Rect2(sx + j, base_y - j, w, 1), COLOR_SPIKE_MAIN)
		# Tip highlight
		draw_rect(Rect2(sx + spike_width/2 - 1, base_y - 7, 2, 2), COLOR_SPIKE_TIP)

func draw_food_pixel(pos: Vector2i, offset: Vector2) -> void:
	var px = pos.x * CELL_SIZE + offset.x
	var py = GAME_OFFSET_Y + pos.y * CELL_SIZE + offset.y
	var s = CELL_SIZE
	
	# Pulse animation
	var pulse = 1.0 + sin(food_pulse_timer) * 0.1
	var size_offset = (s - s * pulse) / 2
	
	# Apple body - main
	var apple_x = px + 6 + size_offset
	var apple_y = py + 8 + size_offset
	var apple_w = 18 * pulse
	var apple_h = 16 * pulse
	
	# Shadow
	draw_rect(Rect2(apple_x + 2, apple_y + apple_h - 2, apple_w - 4, 4), COLOR_FOOD_LO)
	
	# Main body
	draw_rect(Rect2(apple_x, apple_y, apple_w, apple_h), COLOR_FOOD_MAIN)
	
	# Highlight
	draw_rect(Rect2(apple_x + 2, apple_y + 2, 6, 4), COLOR_FOOD_HI)
	draw_rect(Rect2(apple_x + 4, apple_y + 4, 4, 2), Color.WHITE)
	
	# Stem
	draw_rect(Rect2(px + s/2 - 1, py + 4, 3, 6), COLOR_FOOD_STEM)
	
	# Leaf
	draw_rect(Rect2(px + s/2 + 2, py + 2, 6, 4), COLOR_FOOD_LEAF)
	draw_rect(Rect2(px + s/2 + 4, py + 4, 4, 2), COLOR_FOOD_LEAF)

func draw_powerup_pixel(pu: Dictionary, offset: Vector2) -> void:
	var px = pu.position.x * CELL_SIZE + offset.x
	var py = GAME_OFFSET_Y + pu.position.y * CELL_SIZE + offset.y
	var s = CELL_SIZE
	
	var color = get_power_up_color(pu.type)
	var pulse = 0.7 + 0.3 * sin(Time.get_ticks_msec() / 150.0)
	
	# Glow
	var glow_color = color
	glow_color.a = 0.3 * pulse
	draw_rect(Rect2(px - 2, py - 2, s + 4, s + 4), glow_color)
	
	# Diamond shape using rects
	var cx = px + s/2
	var cy = py + s/2
	
	# Draw diamond
	for i in range(int(s/2)):
		var w = i * 2
		draw_rect(Rect2(cx - i, cy - s/2 + i, w, 1), color * pulse)
		draw_rect(Rect2(cx - i, cy + s/2 - i - 1, w, 1), color * pulse)
	
	# Center highlight
	draw_rect(Rect2(cx - 4, cy - 4, 8, 8), color)
	draw_rect(Rect2(cx - 2, cy - 6, 4, 2), Color.WHITE * pulse)

func draw_enemy_pixel(enemy: Dictionary, offset: Vector2) -> void:
	var px = enemy.position.x * CELL_SIZE + offset.x
	var py = GAME_OFFSET_Y + enemy.position.y * CELL_SIZE + offset.y
	var s = CELL_SIZE
	
	# Bounce animation
	var bounce = sin(enemy.anim_timer) * 2
	py += bounce
	
	# Shadow
	draw_rect(Rect2(px + 4, py + s - 4, s - 8, 4), Color(0, 0, 0, 0.3))
	
	# Body
	draw_rect(Rect2(px + 2, py + 4, s - 4, s - 8), COLOR_ENEMY_MAIN)
	
	# Rounded top
	draw_rect(Rect2(px + 4, py + 2, s - 8, 4), COLOR_ENEMY_MAIN)
	
	# Highlight
	draw_rect(Rect2(px + 4, py + 4, s - 12, 4), COLOR_ENEMY_HI)
	
	# Shadow bottom
	draw_rect(Rect2(px + 4, py + s - 8, s - 8, 4), COLOR_ENEMY_LO)
	
	# Eyes
	var eye_y = py + 10
	# Left eye
	draw_rect(Rect2(px + 6, eye_y, 6, 6), Color.WHITE)
	draw_rect(Rect2(px + 8, eye_y + 2, 3, 3), Color.BLACK)
	# Right eye
	draw_rect(Rect2(px + s - 12, eye_y, 6, 6), Color.WHITE)
	draw_rect(Rect2(px + s - 10, eye_y + 2, 3, 3), Color.BLACK)
	
	# Chaser has angry eyebrows
	if enemy.type == "chaser":
		draw_rect(Rect2(px + 4, eye_y - 2, 8, 2), Color(0.3, 0.1, 0.1))
		draw_rect(Rect2(px + s - 12, eye_y - 2, 8, 2), Color(0.3, 0.1, 0.1))

func draw_boss_pixel(offset: Vector2) -> void:
	var boss_px = current_boss.position.x * CELL_SIZE + offset.x
	var boss_py = GAME_OFFSET_Y + current_boss.position.y * CELL_SIZE + offset.y
	var boss_size = current_boss.size * CELL_SIZE
	
	# Breathing animation
	var breath = sin(current_boss.anim_phase) * 3
	
	# Shadow
	draw_rect(Rect2(boss_px + 8, boss_py + boss_size - 8, boss_size - 16, 8), Color(0, 0, 0, 0.4))
	
	# Main body
	draw_rect(Rect2(boss_px + 4, boss_py + 8 + breath, boss_size - 8, boss_size - 16), COLOR_BOSS_MAIN)
	
	# Rounded top
	draw_rect(Rect2(boss_px + 8, boss_py + 4 + breath, boss_size - 16, 8), COLOR_BOSS_MAIN)
	
	# Outline
	draw_rect(Rect2(boss_px + 4, boss_py + 8 + breath, boss_size - 8, 3), COLOR_BOSS_OUTLINE)
	draw_rect(Rect2(boss_px + 4, boss_py + 8 + breath, 3, boss_size - 16), COLOR_BOSS_OUTLINE)
	
	# Highlight
	draw_rect(Rect2(boss_px + 8, boss_py + 12 + breath, boss_size - 20, 6), COLOR_BOSS_HI)
	
	# Crown
	var crown_y = boss_py + breath
	draw_rect(Rect2(boss_px + boss_size/2 - 15, crown_y, 30, 8), Color(1, 0.85, 0))
	draw_rect(Rect2(boss_px + boss_size/2 - 12, crown_y - 6, 6, 8), Color(1, 0.85, 0))
	draw_rect(Rect2(boss_px + boss_size/2 - 3, crown_y - 10, 6, 12), Color(1, 0.85, 0))
	draw_rect(Rect2(boss_px + boss_size/2 + 6, crown_y - 6, 6, 8), Color(1, 0.85, 0))
	# Gems on crown
	draw_rect(Rect2(boss_px + boss_size/2 - 10, crown_y - 2, 4, 4), Color(1, 0.2, 0.2))
	draw_rect(Rect2(boss_px + boss_size/2 - 1, crown_y - 6, 4, 4), Color(0.2, 0.4, 1))
	draw_rect(Rect2(boss_px + boss_size/2 + 8, crown_y - 2, 4, 4), Color(1, 0.2, 0.2))
	
	# Eyes
	var eye_y = boss_py + boss_size/2 + breath
	draw_rect(Rect2(boss_px + 15, eye_y, 12, 10), Color.WHITE)
	draw_rect(Rect2(boss_px + boss_size - 27, eye_y, 12, 10), Color.WHITE)
	draw_rect(Rect2(boss_px + 19, eye_y + 3, 6, 6), Color.BLACK)
	draw_rect(Rect2(boss_px + boss_size - 23, eye_y + 3, 6, 6), Color.BLACK)
	
	# Health bar
	var health_pct = float(current_boss.health) / float(current_boss.max_health)
	var bar_width = boss_size - 16
	draw_rect(Rect2(boss_px + 8, boss_py - 12, bar_width, 8), Color(0.2, 0.2, 0.2))
	draw_rect(Rect2(boss_px + 9, boss_py - 11, (bar_width - 2) * health_pct, 6), Color(0.2, 0.9, 0.2))
	if health_pct < 0.3:
		draw_rect(Rect2(boss_px + 9, boss_py - 11, (bar_width - 2) * health_pct, 6), Color(0.9, 0.2, 0.2))

func draw_snake_pixel(offset: Vector2) -> void:
	# Draw glow first (under everything)
	if is_invincible or can_phase_through:
		for i in range(snake_body.size()):
			var segment = snake_body[i]
			var px = segment.x * CELL_SIZE + offset.x
			var py = GAME_OFFSET_Y + segment.y * CELL_SIZE + offset.y
			var glow_color = Color(1, 1, 0.3, 0.3) if is_invincible else Color(0.3, 0.3, 1, 0.3)
			draw_rect(Rect2(px - 4, py - 4, CELL_SIZE + 8, CELL_SIZE + 8), glow_color)
	
	# Draw each segment from tail to head
	for i in range(snake_body.size() - 1, -1, -1):
		var segment = snake_body[i]
		var px = segment.x * CELL_SIZE + offset.x
		var py = GAME_OFFSET_Y + segment.y * CELL_SIZE + offset.y
		var s = CELL_SIZE
		
		var is_head = (i == 0)
		
		# Determine colors
		var main_color = COLOR_SNAKE_HEAD if is_head else COLOR_SNAKE_BODY
		var shadow_color = COLOR_SNAKE_LO
		var outline_color = COLOR_SNAKE_OUTLINE
		
		# Apply effects
		if is_invincible and fmod(Time.get_ticks_msec() / 100.0, 2.0) < 1.0:
			main_color = Color(1.0, 1.0, 0.3)
			shadow_color = Color(0.8, 0.8, 0.1)
		
		if can_phase_through:
			main_color = main_color.lerp(Color(0.3, 0.3, 1.0), 0.5)
			main_color.a = 0.7
			shadow_color.a = 0.5
		
		# Gradient based on position
		var gradient = 1.0 - (float(i) / max(snake_body.size(), 1)) * 0.3
		main_color = main_color.darkened(1.0 - gradient)
		
		# Outline
		draw_rect(Rect2(px + 1, py + 1, s - 2, s - 2), outline_color)
		
		# Main body
		draw_rect(Rect2(px + 3, py + 3, s - 6, s - 6), main_color)
		
		# Highlight
		draw_rect(Rect2(px + 3, py + 3, s - 8, 3), main_color.lightened(0.3))
		draw_rect(Rect2(px + 3, py + 3, 3, s - 8), main_color.lightened(0.2))
		
		# Shadow
		draw_rect(Rect2(px + 3, py + s - 6, s - 6, 3), shadow_color)
		draw_rect(Rect2(px + s - 6, py + 3, 3, s - 6), shadow_color)
		
		# Pattern on body segments
		if not is_head and i % 2 == 0:
			draw_rect(Rect2(px + s/2 - 3, py + s/2 - 3, 6, 6), main_color.darkened(0.2))
		
		# Head details
		if is_head:
			# Eye positions based on direction
			var left_eye_x = px + 6
			var right_eye_x = px + s - 12
			var eye_y = py + 8
			
			if direction == Vector2i.UP:
				eye_y = py + 6
			elif direction == Vector2i.DOWN:
				eye_y = py + s - 14
			elif direction == Vector2i.LEFT:
				left_eye_x = px + 4
				right_eye_x = px + 4
				eye_y = py + 6
				var eye_y2 = py + s - 12
				# Draw vertical eyes for left
				draw_rect(Rect2(left_eye_x, eye_y, 6, 6), COLOR_SNAKE_EYE)
				draw_rect(Rect2(left_eye_x + 1, eye_y + 2, 3, 3), COLOR_SNAKE_PUPIL)
				draw_rect(Rect2(right_eye_x, eye_y2, 6, 6), COLOR_SNAKE_EYE)
				draw_rect(Rect2(right_eye_x + 1, eye_y2 + 2, 3, 3), COLOR_SNAKE_PUPIL)
				continue
			elif direction == Vector2i.RIGHT:
				left_eye_x = px + s - 10
				right_eye_x = px + s - 10
				eye_y = py + 6
				var eye_y2 = py + s - 12
				draw_rect(Rect2(left_eye_x, eye_y, 6, 6), COLOR_SNAKE_EYE)
				draw_rect(Rect2(left_eye_x + 2, eye_y + 2, 3, 3), COLOR_SNAKE_PUPIL)
				draw_rect(Rect2(right_eye_x, eye_y2, 6, 6), COLOR_SNAKE_EYE)
				draw_rect(Rect2(right_eye_x + 2, eye_y2 + 2, 3, 3), COLOR_SNAKE_PUPIL)
				continue
			
			# Default horizontal eyes
			draw_rect(Rect2(left_eye_x, eye_y, 6, 6), COLOR_SNAKE_EYE)
			draw_rect(Rect2(right_eye_x, eye_y, 6, 6), COLOR_SNAKE_EYE)
			
			# Pupils - looking in direction
			var pupil_offset_x = 0
			var pupil_offset_y = 0
			if direction == Vector2i.DOWN:
				pupil_offset_y = 2
			elif direction == Vector2i.UP:
				pupil_offset_y = -1
			
			draw_rect(Rect2(left_eye_x + 1 + pupil_offset_x, eye_y + 1 + pupil_offset_y, 3, 3), COLOR_SNAKE_PUPIL)
			draw_rect(Rect2(right_eye_x + 2 + pupil_offset_x, eye_y + 1 + pupil_offset_y, 3, 3), COLOR_SNAKE_PUPIL)
			
			# Tongue (when moving)
			if game_started and not is_paused:
				var tongue_visible = fmod(Time.get_ticks_msec() / 300.0, 2.0) < 1.0
				if tongue_visible:
					var tongue_x = px + s/2 - 1
					var tongue_y = py + s
					if direction == Vector2i.UP:
						tongue_y = py - 8
						draw_rect(Rect2(tongue_x, tongue_y, 3, 8), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x - 2, tongue_y, 2, 3), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x + 3, tongue_y, 2, 3), Color(0.9, 0.2, 0.3))
					elif direction == Vector2i.DOWN:
						draw_rect(Rect2(tongue_x, tongue_y, 3, 8), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x - 2, tongue_y + 5, 2, 3), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x + 3, tongue_y + 5, 2, 3), Color(0.9, 0.2, 0.3))
					elif direction == Vector2i.LEFT:
						tongue_x = px - 8
						tongue_y = py + s/2 - 1
						draw_rect(Rect2(tongue_x, tongue_y, 8, 3), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x, tongue_y - 2, 3, 2), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x, tongue_y + 3, 3, 2), Color(0.9, 0.2, 0.3))
					elif direction == Vector2i.RIGHT:
						tongue_x = px + s
						tongue_y = py + s/2 - 1
						draw_rect(Rect2(tongue_x, tongue_y, 8, 3), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x + 5, tongue_y - 2, 3, 2), Color(0.9, 0.2, 0.3))
						draw_rect(Rect2(tongue_x + 5, tongue_y + 3, 3, 2), Color(0.9, 0.2, 0.3))

func get_power_up_color(type: int) -> Color:
	match type:
		PowerUpType.SPEED_BOOST:
			return Color(1.0, 1.0, 0.0)
		PowerUpType.SLOW_TIME:
			return Color(0.0, 0.8, 1.0)
		PowerUpType.INVINCIBILITY:
			return Color(1.0, 0.8, 0.0)
		PowerUpType.PHASE_THROUGH:
			return Color(0.5, 0.0, 1.0)
		PowerUpType.DOUBLE_POINTS:
			return Color(0.0, 1.0, 0.5)
		PowerUpType.EXTRA_LIFE:
			return Color(1.0, 0.5, 0.5)
		PowerUpType.MAGNET:
			return Color(0.3, 0.3, 0.9)
		PowerUpType.SHIELD:
			return Color(0.7, 0.7, 0.9)
		PowerUpType.MEGA_GROWTH:
			return Color(0.2, 0.9, 0.2)
	return Color.WHITE

func draw_direction_indicator(offset: Vector2) -> void:
	# Show arrow indicating NEXT direction if it's different from current
	if next_direction == direction:
		return
	
	if snake_body.is_empty():
		return
	
	var head = snake_body[0]
	var next_pos = head + next_direction
	
	var px = next_pos.x * CELL_SIZE + CELL_SIZE/2 + offset.x
	var py = GAME_OFFSET_Y + next_pos.y * CELL_SIZE + CELL_SIZE/2 + offset.y
	
	# Pulsing arrow
	var pulse = 0.5 + 0.5 * sin(Time.get_ticks_msec() / 100.0)
	var arrow_color = Color(1, 1, 0.3, 0.7 * pulse)
	
	# Draw arrow pointing in next direction
	var arrow_size = 12
	var points: PackedVector2Array = []
	
	if next_direction == Vector2i.UP:
		points.append(Vector2(px, py - arrow_size))
		points.append(Vector2(px - arrow_size, py + arrow_size/2))
		points.append(Vector2(px + arrow_size, py + arrow_size/2))
	elif next_direction == Vector2i.DOWN:
		points.append(Vector2(px, py + arrow_size))
		points.append(Vector2(px - arrow_size, py - arrow_size/2))
		points.append(Vector2(px + arrow_size, py - arrow_size/2))
	elif next_direction == Vector2i.LEFT:
		points.append(Vector2(px - arrow_size, py))
		points.append(Vector2(px + arrow_size/2, py - arrow_size))
		points.append(Vector2(px + arrow_size/2, py + arrow_size))
	elif next_direction == Vector2i.RIGHT:
		points.append(Vector2(px + arrow_size, py))
		points.append(Vector2(px - arrow_size/2, py - arrow_size))
		points.append(Vector2(px - arrow_size/2, py + arrow_size))
	
	if points.size() == 3:
		draw_colored_polygon(points, arrow_color)
