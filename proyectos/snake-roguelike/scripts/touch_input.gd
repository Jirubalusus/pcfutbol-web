extends Node

# ===========================================
# TOUCH INPUT MANAGER
# Handles joystick + swipe controls
# ===========================================

# Input buffering
var buffered_direction: Vector2i = Vector2i.ZERO
var has_buffered_input: bool = false

# Swipe as backup (right side of screen)
var swipe_start: Vector2 = Vector2.ZERO
var is_swiping: bool = false
const MIN_SWIPE_DISTANCE: float = 40.0

@onready var game_manager: GameManager = get_node("../GameManager")
@onready var joystick: VirtualJoystick = get_node("../UI/Joystick")

func _ready() -> void:
	var ui = get_node("../UI")
	
	# Connect joystick signal
	if joystick:
		print("TouchInput: Joystick found, connecting signal")
		joystick.direction_changed.connect(_on_joystick_direction)
	else:
		push_error("TouchInput: JOYSTICK NOT FOUND!")
	
	# Pause button
	ui.get_node("TopBar/PauseButton").pressed.connect(_on_pause)
	
	# Start/Retry buttons
	ui.get_node("StartScreen/VBox/PlayButton").pressed.connect(_on_play)
	ui.get_node("GameOverScreen/VBox/RetryButton").pressed.connect(_on_retry)
	
	# Game signals
	game_manager.score_changed.connect(_on_score_changed)
	game_manager.level_changed.connect(_on_level_changed)
	game_manager.lives_changed.connect(_on_lives_changed)
	game_manager.game_over.connect(_on_game_over)
	
	_update_high_score_display()

func _update_high_score_display() -> void:
	if GameData.instance:
		get_node("../UI/StartScreen/VBox/HighScore").text = "🏆 Best: %d" % GameData.instance.max_score

func _process(delta: float) -> void:
	# Apply buffered input
	if has_buffered_input and game_manager.game_started:
		var applied = try_apply_direction(buffered_direction)
		if applied:
			has_buffered_input = false
			buffered_direction = Vector2i.ZERO
	
	# Update combo display
	if game_manager.game_started and not game_manager.is_game_over:
		if game_manager.combo_count > 1:
			get_node("../UI/TopBar/ComboLabel").text = "🔥 x%d" % game_manager.combo_count
		else:
			get_node("../UI/TopBar/ComboLabel").text = ""

func _input(event: InputEvent) -> void:
	# Handle swipe on RIGHT side of screen (joystick is on left)
	if event is InputEventScreenTouch:
		if event.pressed:
			# Only start swipe if on right side
			if event.position.x > 400:
				swipe_start = event.position
				is_swiping = true
				
				# Tap to start
				if not game_manager.game_started:
					_on_play()
		else:
			if is_swiping:
				_handle_swipe_end(event.position)
			is_swiping = false
	
	elif event is InputEventScreenDrag and is_swiping:
		if event.position.x > 350:  # Still on right side
			var swipe = event.position - swipe_start
			if swipe.length() > MIN_SWIPE_DISTANCE:
				_process_swipe(swipe)
				swipe_start = event.position

func _handle_swipe_end(end_pos: Vector2) -> void:
	var swipe = end_pos - swipe_start
	if swipe.length() > MIN_SWIPE_DISTANCE:
		_process_swipe(swipe)

func _process_swipe(swipe: Vector2) -> void:
	if not game_manager.game_started:
		_on_play()
		return
	
	var dir = _get_swipe_direction(swipe)
	if dir != Vector2i.ZERO:
		_queue_direction(dir)

func _get_swipe_direction(swipe: Vector2) -> Vector2i:
	var angle = swipe.angle()
	
	if angle >= -PI/4 and angle < PI/4:
		return Vector2i.RIGHT
	elif angle >= PI/4 and angle < 3*PI/4:
		return Vector2i.DOWN
	elif angle >= 3*PI/4 or angle < -3*PI/4:
		return Vector2i.LEFT
	else:
		return Vector2i.UP

func _on_joystick_direction(direction: Vector2i) -> void:
	print("TouchInput: Got direction from joystick: ", direction)
	if not game_manager.game_started:
		print("TouchInput: Game not started, starting...")
		_on_play()
		return
	
	if direction != Vector2i.ZERO:
		print("TouchInput: Queueing direction: ", direction)
		_queue_direction(direction)

func _queue_direction(dir: Vector2i) -> void:
	var applied = try_apply_direction(dir)
	
	if not applied:
		buffered_direction = dir
		has_buffered_input = true

func try_apply_direction(dir: Vector2i) -> bool:
	var current = game_manager.direction
	
	# Can't reverse
	if dir == Vector2i.UP and current == Vector2i.DOWN:
		return false
	if dir == Vector2i.DOWN and current == Vector2i.UP:
		return false
	if dir == Vector2i.LEFT and current == Vector2i.RIGHT:
		return false
	if dir == Vector2i.RIGHT and current == Vector2i.LEFT:
		return false
	
	game_manager.set_direction(dir)
	return true

func _on_pause() -> void:
	if game_manager.game_started and not game_manager.is_game_over:
		game_manager.toggle_pause()
		get_node("../UI/PauseScreen").visible = game_manager.is_paused

func _on_play() -> void:
	game_manager.start_game()
	get_node("../UI/StartScreen").visible = false

func _on_retry() -> void:
	game_manager.start_game()
	get_node("../UI/GameOverScreen").visible = false
	_update_high_score_display()
	if joystick:
		joystick.reset()

func _on_score_changed(new_score: int) -> void:
	get_node("../UI/TopBar/HBox/ScorePanel/ScoreLabel").text = str(new_score)

func _on_level_changed(new_level: int) -> void:
	get_node("../UI/TopBar/HBox/LevelPanel/LevelLabel").text = str(new_level)

func _on_lives_changed(new_lives: int) -> void:
	var hearts = "♥" + str(new_lives) if new_lives > 0 else "♥0"
	get_node("../UI/TopBar/HBox/LivesPanel/LivesLabel").text = hearts

func _on_game_over() -> void:
	var ui = get_node("../UI")
	ui.get_node("GameOverScreen").visible = true
	ui.get_node("GameOverScreen/VBox/FinalScore").text = str(game_manager.score)
	
	var stats = "Level %d • %d food" % [game_manager.level, game_manager.session_food_eaten]
	ui.get_node("GameOverScreen/VBox/StatsLabel").text = stats
	
	if GameData.instance and game_manager.score >= GameData.instance.max_score and game_manager.score > 0:
		ui.get_node("GameOverScreen/VBox/ScoreText").text = "🎉 NEW HIGH SCORE!"
	else:
		ui.get_node("GameOverScreen/VBox/ScoreText").text = "POINTS"
