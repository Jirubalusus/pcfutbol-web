extends Control
class_name VirtualJoystick

# ===========================================
# VIRTUAL JOYSTICK - Archero Style
# Invisible until touch, appears where you tap
# Semi-transparent, non-intrusive
# ===========================================

signal direction_changed(direction: Vector2i)

# Visual settings
@export var base_radius: float = 70.0
@export var knob_radius: float = 30.0
@export var dead_zone: float = 0.2

# State
var is_active := false
var touch_id := -1
var base_center := Vector2.ZERO
var knob_offset := Vector2.ZERO
var current_direction := Vector2i.ZERO

# Animation
var appear_progress := 0.0
var direction_pulse := 0.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP

func _process(delta: float) -> void:
	# Smooth appear/disappear
	var target := 1.0 if is_active else 0.0
	appear_progress = lerp(appear_progress, target, delta * 15.0)
	
	# Direction pulse effect
	if current_direction != Vector2i.ZERO:
		direction_pulse += delta * 8.0
	else:
		direction_pulse = 0.0
	
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		_handle_touch(event)
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag:
		_handle_drag(event)
		get_viewport().set_input_as_handled()

func _input(event: InputEvent) -> void:
	# Also catch global touch events
	if event is InputEventScreenTouch:
		_handle_touch(event)
	elif event is InputEventScreenDrag:
		_handle_drag(event)

func _handle_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		# Only activate on LEFT half of screen
		var screen_width := get_viewport_rect().size.x
		if event.position.x < screen_width * 0.55 and not is_active:
			_activate(event.position, event.index)
	else:
		if event.index == touch_id:
			_deactivate()

func _handle_drag(event: InputEventScreenDrag) -> void:
	if is_active and event.index == touch_id:
		_update(event.position)

func _activate(pos: Vector2, index: int) -> void:
	is_active = true
	touch_id = index
	base_center = pos
	knob_offset = Vector2.ZERO
	current_direction = Vector2i.ZERO

func _deactivate() -> void:
	is_active = false
	touch_id = -1
	knob_offset = Vector2.ZERO
	if current_direction != Vector2i.ZERO:
		current_direction = Vector2i.ZERO

func _update(touch_pos: Vector2) -> void:
	var offset := touch_pos - base_center
	var distance := offset.length()
	
	# Clamp knob to radius
	if distance > base_radius:
		offset = offset.normalized() * base_radius
	knob_offset = offset
	
	# Calculate direction
	if distance / base_radius > dead_zone:
		var angle := offset.angle()
		var new_dir := Vector2i.ZERO
		
		# 4-directional
		if angle >= -PI/4 and angle < PI/4:
			new_dir = Vector2i.RIGHT
		elif angle >= PI/4 and angle < 3*PI/4:
			new_dir = Vector2i.DOWN
		elif angle >= 3*PI/4 or angle < -3*PI/4:
			new_dir = Vector2i.LEFT
		else:
			new_dir = Vector2i.UP
		
		if new_dir != current_direction:
			current_direction = new_dir
			print("Joystick: EMITTING direction: ", current_direction)
			direction_changed.emit(current_direction)

func _draw() -> void:
	if appear_progress < 0.01:
		return
	
	var alpha := appear_progress * 0.7
	var center := base_center
	var knob_pos := center + knob_offset
	
	# === OUTER RING (subtle) ===
	var ring_color := Color(0.3, 0.35, 0.45, alpha * 0.4)
	draw_arc(center, base_radius, 0, TAU, 48, ring_color, 2.0)
	
	# === DIRECTION ZONES (very subtle) ===
	if current_direction != Vector2i.ZERO:
		var dir_vec := Vector2(current_direction.x, current_direction.y)
		var pulse := (sin(direction_pulse) + 1.0) * 0.5
		var glow_alpha := alpha * (0.15 + pulse * 0.1)
		
		# Direction glow
		var glow_pos := center + dir_vec * (base_radius * 0.5)
		var glow_color := Color(0.4, 0.9, 0.5, glow_alpha)
		draw_circle(glow_pos, 20, glow_color)
	
	# === INNER DEAD ZONE (dotted) ===
	var dead_r := base_radius * dead_zone
	var dead_color := Color(0.4, 0.45, 0.55, alpha * 0.3)
	draw_arc(center, dead_r, 0, TAU, 24, dead_color, 1.5)
	
	# === CONNECTION LINE ===
	if knob_offset.length() > 5:
		var line_color := Color(0.5, 0.6, 0.7, alpha * 0.4)
		draw_line(center, knob_pos, line_color, 2.0)
	
	# === KNOB ===
	var knob_alpha := alpha * 1.2
	var is_moving := current_direction != Vector2i.ZERO
	
	# Knob glow (when moving)
	if is_moving:
		var glow_size := knob_radius + 8 + sin(direction_pulse) * 3
		var glow_color := Color(0.3, 0.8, 0.4, knob_alpha * 0.3)
		draw_circle(knob_pos, glow_size, glow_color)
	
	# Knob shadow
	draw_circle(knob_pos + Vector2(2, 2), knob_radius, Color(0, 0, 0, knob_alpha * 0.3))
	
	# Knob fill
	var knob_color := Color(0.45, 0.55, 0.65, knob_alpha) if not is_moving else Color(0.4, 0.75, 0.5, knob_alpha)
	draw_circle(knob_pos, knob_radius, knob_color)
	
	# Knob highlight
	var highlight_pos := knob_pos - Vector2(knob_radius * 0.3, knob_radius * 0.3)
	draw_circle(highlight_pos, knob_radius * 0.35, Color(1, 1, 1, knob_alpha * 0.3))
	
	# Knob border
	var border_color := Color(0.6, 0.7, 0.8, knob_alpha * 0.6) if not is_moving else Color(0.5, 0.9, 0.6, knob_alpha * 0.8)
	draw_arc(knob_pos, knob_radius, 0, TAU, 32, border_color, 2.0)

func is_joystick_active() -> bool:
	return is_active

func reset() -> void:
	_deactivate()
	appear_progress = 0.0
