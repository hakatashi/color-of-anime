# Extend Caman with custom colorchanging plugin
Caman.Filter.register 'translate', (fromRGB, toRGB) ->
	fromRGB = tinycolorArray(fromRGB)	unless Array.isArray(fromRGB)
	toRGB = tinycolorArray(toRGB)	unless Array.isArray(toRGB)
	from = colorConvert.rgb2labRaw(fromRGB)
	to = colorConvert.rgb2labRaw(toRGB)
	@process 'translate', (colorRGB) ->
		color = colorConvert.rgb2labRaw([
			colorRGB.r
			colorRGB.g
			colorRGB.b
		])
		color[0] = Math.max(0, color[0] + to[0] - from[0])
		color[1] = color[1] + to[1] - from[1]
		color[2] = color[2] + to[2] - from[2]

		RGB = colorConvert.lab2rgbRaw(color)
		colorRGB.r = RGB[0]
		colorRGB.g = RGB[1]
		colorRGB.b = RGB[2]
		colorRGB

distanceBetweenColors = (A, B) ->
	colorA = tinycolor(A).toRgb()
	ALab = colorConvert.rgb2labRaw([
		colorA.r
		colorA.g
		colorA.b
	])
	colorB = tinycolor(B).toRgb()
	BLab = colorConvert.rgb2labRaw([
		colorB.r
		colorB.g
		colorB.b
	])
	ldiff = (ALab[0] - BLab[0]) * 2
	adiff = ALab[1] - BLab[1]
	bdiff = ALab[2] - BLab[2]

	distance = Math.sqrt(ldiff * ldiff + adiff * adiff + bdiff * bdiff)

nearestColor = (color) ->
	base = tinycolor(color)
	return null unless base._format
	nearestDistance = Infinity
	nearest = null
	Object.keys(tinycolor.names).forEach (colorname) ->
		distance = distanceBetweenColors(color, colorname)
		if distance < nearestDistance
			nearestDistance = distance
			nearest = colorname
		return

	{
		name: nearest
		distance: nearestDistance
		color: tinycolor(nearest)
	}

# Returns score from 0.0 to 1.0
colorScore = (colorA, colorB) ->
	# currently uses evaluation by Gaussian function
	SIGMA = 30 # How much score will be lowered with distance aparted from correct color
	TOLERANCE = 0.02 # How the score will be tolerated to get full score
	distance = distanceBetweenColors(colorA, colorB)

	score = Math.min(Math.exp(-(distance / SIGMA) * (distance / SIGMA)) * (1 + TOLERANCE), 1)

# Returns score from 0 to 100
colorScoreInt = (colorA, colorB) ->
	Math.floor colorScore(colorA, colorB) * 100

# get x coordinary from touch or click event
getX = (event) ->
	if event.originalEvent.changedTouches
		event.originalEvent.changedTouches[0].pageX
	else
		event.originalEvent.pageX

percentageToRealValue = (colorset, parameter, value) ->
	{
		RGB: {
			r: value * 255,
			g: value * 255,
			b: value * 255
		},
		HSV: {
			h: value * 360,
			s: value * 100,
			v: value * 100
		},
		Lab: {
			l: value * 100,
			a: value * 200 - 100,
			b: value * 200 - 100
		}
	}[colorset][parameter]

colorsetToRealValueArray = (colorset, values) ->
	parameters = {
		RGB: ['r', 'g', 'b'],
		HSV: ['h', 's', 'v'],
		Lab: ['l', 'a', 'b']
	}[colorset]

	ret = []
	parameters.forEach (parameter) ->
		ret.push percentageToRealValue(colorset, parameter, values[parameter])
		return
	ret

realValueToPercentage = (colorset, parameter, value) ->
	{
		RGB: {
			r: value / 255,
			g: value / 255,
			b: value / 255
		},
		HSV: {
			h: value / 360,
			s: value / 100,
			v: value / 100
		},
		Lab: {
			l: value / 100,
			a: (value + 100) / 200,
			b: (value + 100) / 200
		}
	}[colorset][parameter]

realValueArrayToColorset = (colorset, values) ->
	parameters = {
		RGB: ['r', 'g', 'b'],
		HSV: ['h', 's', 'v'],
		Lab: ['l', 'a', 'b']
	}[colorset]

	ret = {}
	i = 0
	parameters.forEach (parameter) ->
		ret[parameter] = realValueToPercentage(colorset, parameter, values[i])
		i++
		return
	ret

# preserve size of image
tinycolorArray = (input) ->
	RGB = tinycolor(input).toRgb()
	[RGB.r, RGB.g, RGB.b]

class Question
	constructor: (@game, @character) ->
		@info = @game.queue.getResult(@character + '.info')
		@defaultColor = tinycolor(@info['default'])
		@originalColor = tinycolor(@info.color)

		@colorsets =
			RGB: ['r', 'g', 'b']
			HSV: ['h', 's', 'v']
			Lab: ['l', 'a', 'b']

		@currentImageColor =
			r: null
			g: null
			b: null

		@yourColor =
			r: null
			g: null
			b: null

		@currentSliderColor =
			RGB:
				r: 0
				g: 0
				b: 0
			HSV:
				h: 0
				s: 0
				v: 0
			Lab:
				l: 0
				a: 0
				b: 0

		@selectedColorset = 'RGB'
		@busy = true
		@caman = null
		@phase = 'slider'
		@score = null

		initColor = null
		if location.hash and (initColor = tinycolor(location.hash))._format
			@currentSliderColor.RGB = initColor.toRgbPercentage()
		else
			@currentSliderColor.RGB = @defaultColor.toRgbPercentage()

		@updateSliders 'RGB'

		$('#original-color-preview').css 'background-color': @originalColor.toHexString()
		$('#original-color-info .result-color-value').text @originalColor.toHexString()
		$('#original-color-info .result-color-name').text nearestColor(@originalColor).name
		$('#image').prepend @game.queue.getResult('syaro.base')
		$('#rendering').removeClass 'invisible'
		@caman = Caman('#canvas', 'img/' + @character + '/color.png', =>
			@busy = false
			@updateImage()
		)

	# Update current slider color parameters based on specific colorset parameters
	updateSliders: (base) ->
		baseColor = colorsetToRealValueArray base, @currentSliderColor[base]
		Object.keys(@colorsets).forEach (colorset) =>
			if colorset isnt base
				color = colorConvert[base.toLowerCase()][colorset.toLowerCase()](baseColor)
				@currentSliderColor[colorset] = realValueArrayToColorset(colorset, color)
			@colorsets[colorset].forEach (parameter) =>
				@game.moveSlider colorset, parameter, @currentSliderColor[colorset][parameter]

		@updateInfo()

	# update displayed information based on current color parameter
	updateInfo: ->
		color = tinycolor.fromRatio(@currentSliderColor.RGB)
		$('.color-preview-value').text color.toHexString()
		$('.color-preview-square').css 'background-color', color.toHexString()
		if @phase is 'slider'
			location.replace color.toHexString()
			@yourColor = $.extend {}, @currentSliderColor.RGB

		# update sliders gradients
		Object.keys(@colorsets).forEach (colorset) =>
			sliderColor = @currentSliderColor[colorset]
			@colorsets[colorset].forEach (parameter) =>
				$parameter = $('.color-parameter-wrap[data-colorset=' + colorset + '][data-parameter=' + parameter + ']')
				$slider = $parameter.find('.color-slider-wrapper')
				colorStop = null
				colorStops = []
				i = 0

				while i < 7
					color = $.extend {}, sliderColor
					color[parameter] = 1 / 6 * i
					colorArray = colorsetToRealValueArray colorset, color
					if colorset is 'RGB'
						colorStop = colorArray
					else
						colorStop = colorConvert[colorset.toLowerCase()].rgb(colorArray)
					colorStops.push
						r: colorStop[0]
						g: colorStop[1]
						b: colorStop[2]
					i++

				$slider.gradient colorStops

	# update image based on current slider color
	updateImage: ->
		return if @busy
		return if @currentImageColor.r is @currentSliderColor.RGB.r and @currentImageColor.g is @currentSliderColor.RGB.g and @currentImageColor.b is @currentSliderColor.RGB.b
		@busy = true
		@currentImageColor = $.extend({}, @currentSliderColor.RGB)
		$('#rendering').removeClass 'invisible'
		@caman.revert false
		@caman.translate @info.color, colorsetToRealValueArray('RGB', @currentSliderColor.RGB)
		@caman.render =>
			$('#image').removeClass 'invisible'
			$('#rendering').addClass 'invisible'
			@busy = false
			@updateImage()

	# submit result and confirm OK
	submitResult: ->
		color = tinycolor.fromRatio @currentSliderColor.RGB
		$('#your-color-preview').css 'background-color': color.toHexString()
		$('#your-color-info .result-color-value').text color.toHexString()
		$('#your-color-info .result-color-name').text nearestColor(color).name
		@score = colorScoreInt(color, @originalColor)
		$('#color-sliders').fadeOut =>
			$(score: 0).animate {score: @score},
				step: (currentScore) =>
					scoreInt = Math.floor(currentScore)
					$('#score-numeral').text scoreInt
					$('#score-bar-inner').css width: scoreInt + '%'
				duration: @score * 30
				easing: 'linear'
			$('#result-field').fadeIn()

		@phase = 'result'

	# set color by tinycolor input
	setColor: (input) ->
		color = tinycolor input
		if color._format
			rgb = color.toRgb()
			@currentSliderColor.RGB =
				r: rgb.r / 255
				g: rgb.g / 255
				b: rgb.b / 255
			@updateSliders 'RGB'
			@updateImage()
		else
			@updateInfo()

	# preview colors in image on result page
	previewResult: (isYourColor) ->
		if isYourColor
			@currentSliderColor.RGB = $.extend {}, @yourColor
		else
			rgb = @originalColor.toRgb()
			@currentSliderColor.RGB =
				r: rgb.r / 255
				g: rgb.g / 255
				b: rgb.b / 255
		@updateSliders 'RGB'
		@updateImage()

class Game
	constructor: ->
		# PreLoad Images
		@queue = new createjs.LoadQueue()
		characters = ['syaro']
		manifest = []

		characters.forEach (character) ->
			manifest.push
				id: character + '.base'
				src: 'img/' + character + '/base.png'
			,
				id: character + '.color'
				src: 'img/' + character + '/color.png'
			,
				id: character + '.info'
				src: 'img/' + character + '/info.json'

		@queue.on 'fileload', (event) ->
			if event.item.type is 'image'
				event.result.originalWidth = event.result.width
				event.result.originalHeight = event.result.height

		@queue.on 'complete', =>
			$(document).ready =>
				@init()

		@queue.loadManifest manifest

	init: ->
		@currentQuestion = new Question @, 'syaro'

		# fire onResize event
		$(window).resize @onResize
		@onResize()

		# DOM binders

		$('.color-parameter').on 'touchstart mousedown', (event) =>
			event.preventDefault()
			touchX = getX(event)
			parameter = $(event.currentTarget).data('parameter')
			offset = $(event.currentTarget).offset().left
			width = $(event.currentTarget).width()
			colorset = $(event.currentTarget).data('colorset')

			movePinch = (event) =>
				touchX = getX(event)
				value = (touchX - offset) / width
				value = Math.max(0, Math.min(value, 1))
				@currentQuestion.currentSliderColor[colorset][parameter] = value
				@currentQuestion.updateSliders colorset
				@currentQuestion.updateImage()

			$(window).on 'touchmove mousemove', movePinch
			$(window).on 'touchend mouseup', (event) ->
				$(event.currentTarget).off 'touchmove mousemove', movePinch

			movePinch event

		$('.color-preview-value').on 'click', (event) =>
			$(event.currentTarget).attr 'contenteditable', true
			$(event.currentTarget).selectText()
			# blur if enter is pressed
			$(event.currentTarget).on 'keypress', (event) =>
				if event.which is 13
					$(event.currentTarget).blur()
					false
				else
					true

			$(event.currentTarget).on 'blur', (event) =>
				$(event.currentTarget).attr 'contenteditable', false
				$(event.currentTarget).off 'keypress blur'
				@currentQuestion.setColor $(event.currentTarget).text()

		$('.tab-inner').on 'click', (event) =>
			if @currentQuestion.phase is 'slider'
				colorset = $(event.currentTarget).text()
				$('.colorset-sliders').hide()
				$('.tab').removeClass 'selected'
				$('.colorset-sliders[data-colorset=' + colorset + ']').show()
				$(event.currentTarget).parent('.tab').addClass 'selected'

		$('.submit').on 'click', =>
			@currentQuestion.submitResult()

		$('#your-color-preview').on 'click', =>
			@currentQuestion.previewResult true

		$('#original-color-preview').on 'click', =>
			@currentQuestion.previewResult false

	onResize: (event) ->
		# fit #image-field to be contained in #image-panel
		# 'box' means max acceptable size of #image-panel in #image-field.
		RENDERING_HEIGHT = 40
		IMAGEINFO_HEIGHT = 30
		imageHeight = @queue.getResult('syaro.base').originalHeight
		imageWidth = @queue.getResult('syaro.base').originalWidth
		boxWidth = $('#image-panel').width() * 0.9
		boxHeight = null
		if matchMedia('(min-width: 900px)').matches
			boxHeight = $('#image-panel').height() - RENDERING_HEIGHT - IMAGEINFO_HEIGHT
		else
			boxHeight = 800
		zoom = Math.min(boxWidth / imageWidth, boxHeight / imageHeight)
		fieldWidth = imageWidth * zoom
		fieldHeight = imageHeight * zoom
		$('#image-field').css
			width: fieldWidth
			height: fieldHeight
			'-webkit-transform': 'none'
			'-moz-transform': 'none'
			'-o-transform': 'none'
			transform: 'none'

		if matchMedia('(min-width: 900px)').matches
			imageTop = ($('#image-panel').height() - fieldHeight) / 2
			$('#image-field').css
				position: 'absolute'
				top: imageTop
				left: ($('#image-panel').width() - fieldWidth) / 2
				margin: '0'
			$('#rendering').css
				position: 'absolute'
				bottom: imageTop + fieldHeight
			$('#image-info').css
				position: 'absolute'
				top: imageTop + fieldHeight
		else
			$('#image-field').css
				position: 'relative'
				top: 0
				left: 0
				margin: '0 5%'
			$('#rendering').css
				position: 'relative'
				bottom: 0
			$('#image-info').css
				position: 'relative'
				top: 0

	# move sliders of DOM from parameter value
	moveSlider: (colorset, parameter, value) ->
		$parameter = $('.color-parameter-wrap[data-colorset=' + colorset + '][data-parameter=' + parameter + ']')
		$pinch = $parameter.find('.color-slider-pinch')
		$value = $parameter.find('.color-value')
		$pinch.css 'left', value * 100 + '%'
		$value.text Math.floor(percentageToRealValue(colorset, parameter, value))

# set language

availableLanguages = ['en', 'ja']

$('html').classes().forEach (classname) ->
	if classname.startsWith 'lang-'
		$('html').removeClass classname

language = navigator.userLanguage or navigator.language;
setLanguage = null
availableLanguages.forEach (availableLanguage) ->
	if language.startsWith availableLanguage
		setLanguage = availableLanguage

if not setLanguage
	setLanguage = availableLanguages[0]

$('html').addClass 'lang-' + setLanguage
$('html').attr 'lang', setLanguage

# kick start

game = new Game()
