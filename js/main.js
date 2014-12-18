// PreLoad Images

var queue = new createjs.LoadQueue();

var characters = [
	'syaro',
];

var manifest = [];

characters.forEach(function (character) {
	manifest.push({
		id: character + '.base',
		src: 'img/' + character + '/base.png',
	}, {
		id: character + '.color',
		src: 'img/' + character + '/color.png',
	}, {
		id: character + '.info',
		src: 'img/' + character + '/info.json',
	});
});

queue.on('fileload', function (event) {
	// preserve size of image
	if (event.item.type === 'image') {
		event.result.originalWidth = event.result.width;
		event.result.originalHeight = event.result.height;
	}
});

queue.on('complete', handleComplete, this);
queue.loadManifest(manifest);

function tinycolorArray(input) {
	var RGB = tinycolor(input).toRgb();
	return [RGB.r, RGB.g, RGB.b];
}

// Extend Caman with custom colorchanging plugin

Caman.Filter.register('translate', function (fromRGB, toRGB) {
	if (!Array.isArray(fromRGB)) fromRGB = tinycolorArray(fromRGB);
	if (!Array.isArray(toRGB)) toRGB = tinycolorArray(toRGB);

	var from = colorConvert.rgb.hsv(fromRGB);
	var to = colorConvert.rgb.hsv(toRGB);

	this.process('translate', function (colorRGB) {
		var color = colorConvert.rgb.hsv([colorRGB.r, colorRGB.g, colorRGB.b]);

		color[0] = (color[0] + to[0] - from[0] + 360) % 360;
		if (color[1] <= from[1]) color[1] = color[1] * to[1] / from[1];
		else color[1] = 255 - (255 - color[1]) * (255 - to[1]) / (255 - from[1]);
		if (color[2] <= from[2]) color[2] = color[2] * to[2] / from[2];
		else color[2] = 255 - (255 - color[2]) * (255 - to[2]) / (255 - from[2]);

		var RGB = colorConvert.hsv.rgb(color);
		colorRGB.r = RGB[0];
		colorRGB.g = RGB[1];
		colorRGB.b = RGB[2];

		return colorRGB;
	});
});

function onResize(event) {
	// fit #image-field to be contained in #image-panel
	// 'box' means max acceptable size of #image-panel in #image-field.

	var RENDERING_HEIGHT = 40;
	var IMAGEINFO_HEIGHT = 30;

	var imageHeight = queue.getResult('syaro.base').originalHeight;
	var imageWidth = queue.getResult('syaro.base').originalWidth;

	var boxWidth = $('#image-panel').width() * 0.9;
	var boxHeight = null;

	if (matchMedia('(min-width: 900px)').matches) {
		boxHeight = $('#image-panel').height() - RENDERING_HEIGHT - IMAGEINFO_HEIGHT;
	} else {
		boxHeight = 800;
	}

	var zoom = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
	var fieldWidth = imageWidth * zoom;
	var fieldHeight = imageHeight * zoom;

	$('#image-field').css({
		width: fieldWidth,
		height: fieldHeight,
		'-webkit-transform': 'none',
		'-moz-transform': 'none',
		'-o-transform': 'none',
		transform: 'none'
	});

	if (matchMedia('(min-width: 900px)').matches) {
		var imageTop = ($('#image-panel').height() - fieldHeight) / 2;

		$('#image-field').css({
			position: 'absolute',
			top: imageTop,
			left: ($('#image-panel').width() - fieldWidth) / 2,
			margin: '0'
		});
		$('#rendering').css({
			position: 'absolute',
			bottom: imageTop + fieldHeight
		});
		$('#image-info').css({
			position: 'absolute',
			top: imageTop + fieldHeight
		});
	} else {
		$('#image-field').css({
			position: 'relative',
			top: 0,
			left: 0,
			margin: '0 5%'
		});
		$('#rendering').css({
			position: 'relative',
			bottom: 0
		});
		$('#image-info').css({
			position: 'relative',
			top: 0
		});
	}
}

var currentColor = {R: 0, G: 0, B: 0};
var currentSlider = {R: 0, G: 0, B: 0};
var caman = null;
var busy = true;

function handleComplete() {
	$(document).ready(function () {
		$(window).resize(onResize);
		onResize();

		// start rendering
		$('#image').prepend(queue.getResult('syaro.base'));
		$('#rendering').removeClass('invisible');
		var info = queue.getResult('syaro.info');

		var defaultColor = tinycolorArray(info.default);
		currentSlider = {R: defaultColor[0], G: defaultColor[1], B: defaultColor[2]};

		updateSliders();

		var timer = new Date();
		caman = Caman('#canvas', 'img/syaro/color.png', function () {
			busy = false;
			updateImage();
		});

		function getX(event) {
			if (event.originalEvent.changedTouches) {
				return event.originalEvent.changedTouches[0].pageX;
			} else {
				return event.originalEvent.pageX;
			}
		}

		function moveSlider(parameter, value) {
			var $parameter = $('.color-parameter-wrap[data-parameter=' + parameter + ']');
			var $pinch = $parameter.find('.color-slider-pinch');
			var $value = $parameter.find('.color-value');

			$pinch.css('left', value / 255 * 100 + '%');
			$value.text(Math.floor(value));
		}

		// enable pinches
		$('.color-parameter').bind('touchstart mousedown', function (event) {
			event.preventDefault();

			var touchX = getX(event);
			var parameter = $(this).data('parameter');

			var offset = $(this).offset().left;
			var width = $(this).width();

			var movePinch = function (event) {
				var touchX = getX(event);
				var value = (touchX - offset) / width;

				value = Math.max(0, Math.min(value, 1));
				moveSlider(parameter, value * 255);
				currentSlider[parameter] = value * 255;
				updateImage();
				updateInfo();
			}

			$(window).bind('touchmove mousemove', movePinch);
			$(window).bind('touchend mouseup', function () {
				$(this).unbind('touchmove mousemove', movePinch);
			});

			movePinch(event);
		});

		function updateSliders() {
			['R', 'G', 'B'].forEach(function (parameter, index) {
				moveSlider(parameter, currentSlider[parameter]);
			});
			updateInfo();
		}

		function updateInfo() {
			var color = tinycolor({r: currentSlider.R, g: currentSlider.G, b: currentSlider.B});
			$('.color-preview-value').text(color.toHexString());
			$('.color-preview-square').css('background-color', color.toHexString());

			// update sliders gradients
			['R', 'G', 'B'].forEach(function (parameter, index) {
				var par = parameter.toLowerCase();
				var $parameter = $('.color-parameter-wrap[data-parameter=' + parameter + ']');
				var $slider = $parameter.find('.color-slider-wrapper');

				var colorStop = null;
				var colorStops = [];
				for (var i = 0; i < 7; i++) {
					colorStop = {r: currentSlider.R, g: currentSlider.G, b: currentSlider.B};
					colorStop[par] = 255 / 6 * i;
					colorStops.push(colorStop);
				}

				$slider.gradient(colorStops);
			});
		}

		function updateImage() {
			if (busy) return;
			if (currentColor.R === currentSlider.R
			 && currentColor.G === currentSlider.G
			 && currentColor.B === currentSlider.B) return;

			busy = true;
			currentColor.R = currentSlider.R;
			currentColor.G = currentSlider.G;
			currentColor.B = currentSlider.B;
			$('#rendering').removeClass('invisible');

			caman.revert(false);
			caman.translate(info.color, [currentSlider.R, currentSlider.G, currentSlider.B]);
			caman.render(function () {
				$('#image').removeClass('invisible');
				$('#rendering').addClass('invisible');

				busy = false;
				updateImage();
			});
		}
	});
}
