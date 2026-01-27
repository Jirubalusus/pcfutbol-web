extends CanvasLayer
class_name UIManager

@onready var score_label: Label = $TopBar/ScoreLabel
@onready var level_label: Label = $TopBar/LevelLabel
@onready var lives_label: Label = $TopBar/LivesLabel
@onready var combo_label: Label = $TopBar/ComboLabel
@onready var game_over_panel: Panel = $GameOverPanel
@onready var pause_panel: Panel = $PausePanel
@onready var power_up_container: VBoxContainer = $PowerUpContainer
@onready var boss_health_bar: ProgressBar = $BossHealthBar
@onready var boss_name_label: Label = $BossNameLabel

var game_manager: GameManager

func _ready() -> void:
	game_over_panel.hide()
	pause_panel.hide()
	boss_health_bar.hide()
	boss_name_label.hide()
	
	# Find game manager
	await get_tree().process_frame
	game_manager = get_parent().get_node_or_null("GameManager")
	if game_manager:
		game_manager.score_changed.connect(_on_score_changed)
		game_manager.level_changed.connect(_on_level_changed)
		game_manager.game_over.connect(_on_game_over)
		game_manager.boss_spawned.connect(_on_boss_spawned)
		game_manager.boss_defeated.connect(_on_boss_defeated)

func _process(_delta: float) -> void:
	if game_manager:
		pause_panel.visible = game_manager.is_paused
		update_power_up_display()
		update_lives_display()
		update_combo_display()
		update_boss_display()

func _on_score_changed(new_score: int) -> void:
	score_label.text = "Score: %d" % new_score

func _on_level_changed(new_level: int) -> void:
	level_label.text = "Level: %d" % new_level

func _on_game_over() -> void:
	game_over_panel.show()
	boss_health_bar.hide()
	boss_name_label.hide()
	
	$GameOverPanel/VBox/FinalScore.text = "Score: %d (Level %d)" % [game_manager.score, game_manager.level]
	$GameOverPanel/VBox/StatsLabel.text = "Enemies: %d | Food: %d | Bosses: %d" % [
		game_manager.session_enemies_killed,
		game_manager.session_food_eaten,
		game_manager.session_bosses_killed
	]
	
	# Check for new unlocks
	if GameData.instance:
		var unlock_text = ""
		# Show recent unlocks (would need tracking, simplified here)
		$GameOverPanel/VBox/UnlockLabel.text = unlock_text

func _on_boss_spawned(boss_data: Dictionary) -> void:
	boss_health_bar.show()
	boss_name_label.show()
	boss_name_label.text = boss_data.get("name", "BOSS")
	boss_health_bar.max_value = boss_data.get("health", 10)
	boss_health_bar.value = boss_health_bar.max_value

func _on_boss_defeated(_boss_data: Dictionary) -> void:
	boss_health_bar.hide()
	boss_name_label.hide()

func update_power_up_display() -> void:
	if not game_manager:
		return
	
	# Clear existing labels
	for child in power_up_container.get_children():
		child.queue_free()
	
	# Add active power-ups
	for key in game_manager.power_up_timers.keys():
		var label = Label.new()
		var time_left = game_manager.power_up_timers[key]
		var display_name = key.capitalize().replace("_", " ")
		label.text = "%s: %.1fs" % [display_name, time_left]
		label.add_theme_font_size_override("font_size", 12)
		
		# Color based on type
		match key:
			"invincible":
				label.add_theme_color_override("font_color", Color(1, 0.8, 0))
			"phase":
				label.add_theme_color_override("font_color", Color(0.5, 0, 1))
			"speed":
				label.add_theme_color_override("font_color", Color(1, 1, 0))
			"slow":
				label.add_theme_color_override("font_color", Color(0, 0.8, 1))
			"double":
				label.add_theme_color_override("font_color", Color(0, 1, 0.5))
			"magnet":
				label.add_theme_color_override("font_color", Color(0.3, 0.3, 0.9))
		
		power_up_container.add_child(label)

func update_lives_display() -> void:
	if not game_manager:
		return
	lives_label.text = "Lives: %d" % game_manager.extra_lives

func update_combo_display() -> void:
	if not game_manager:
		return
	
	if game_manager.combo_count > 1:
		combo_label.text = "Combo x%d!" % game_manager.combo_count
		combo_label.add_theme_color_override("font_color", Color(1, 0.5 + game_manager.combo_count * 0.1, 0))
	else:
		combo_label.text = ""

func update_boss_display() -> void:
	if not game_manager or game_manager.current_boss.is_empty():
		return
	
	boss_health_bar.value = game_manager.current_boss.health

func _on_restart_button_pressed() -> void:
	game_over_panel.hide()
	if game_manager:
		game_manager.start_new_game()
