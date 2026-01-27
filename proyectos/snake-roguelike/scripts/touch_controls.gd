extends CanvasLayer
class_name TouchControls

signal direction_changed(direction: Vector2i)
signal pause_pressed

# Swipe detection
var swipe_start: Vector2 = Vector2.ZERO
var is_swiping: bool = false
const MIN_SWIPE_DISTANCE: float = 50.0

# D-Pad references
@onready var btn_up: TouchScreenButton = $DPad/Up
@onready var btn_down: TouchScreenButton = $DPad/Down
@onready var btn_left: TouchScreenButton = $DPad/Left
@onready var btn_right: TouchScreenButton = $DPad/Right
@onready var btn_pause: TouchScreenButton = $PauseButton

func _ready() -> void:
	# Connect button signals
	if btn_up:
		btn_up.pressed.connect(_on_up_pressed)
	if btn_down:
		btn_down.pressed.connect(_on_down_pressed)
	if btn_left:
		btn_left.pressed.connect(_on_left_pressed)
	if btn_right:
		btn_right.pressed.connect(_on_right_pressed)
	if btn_pause:
		btn_pause.pressed.connect(_on_pause_pressed)

func _input(event: InputEvent) -> void:
	# Handle touch/swipe
	if event is InputEventScreenTouch:
		if event.pressed:
			swipe_start = event.position
			is_swiping = true
		else:
			if is_swiping:
				_handle_swipe(event.position)
			is_swiping = false
	
	elif event is InputEventScreenDrag and is_swiping:
		var drag_distance = event.position - swipe_start
		if drag_distance.length() > MIN_SWIPE_DISTANCE:
			_handle_swipe(event.position)
			is_swiping = false

func _handle_swipe(end_pos: Vector2) -> void:
	var swipe = end_pos - swipe_start
	
	if swipe.length() < MIN_SWIPE_DISTANCE:
		return
	
	# Determine direction
	if abs(swipe.x) > abs(swipe.y):
		# Horizontal swipe
		if swipe.x > 0:
			emit_signal("direction_changed", Vector2i.RIGHT)
		else:
			emit_signal("direction_changed", Vector2i.LEFT)
	else:
		# Vertical swipe
		if swipe.y > 0:
			emit_signal("direction_changed", Vector2i.DOWN)
		else:
			emit_signal("direction_changed", Vector2i.UP)

func _on_up_pressed() -> void:
	emit_signal("direction_changed", Vector2i.UP)

func _on_down_pressed() -> void:
	emit_signal("direction_changed", Vector2i.DOWN)

func _on_left_pressed() -> void:
	emit_signal("direction_changed", Vector2i.LEFT)

func _on_right_pressed() -> void:
	emit_signal("direction_changed", Vector2i.RIGHT)

func _on_pause_pressed() -> void:
	emit_signal("pause_pressed")
