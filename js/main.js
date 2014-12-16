// PreLoad Images

var queue = new createjs.LoadQueue();

var characters = [
	'chino',
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

// Extend Caman with custom colorchanging plugin

Caman.Filter.register('translate', function (fromRGB, toRGB) {
	if (typeof fromRGB === 'string') fromRGB = colorStringToArray(fromRGB);
	if (typeof toRGB === 'string') toRGB = colorStringToArray(toRGB);

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

	var imageHeight = queue.getResult('chino.base').originalHeight;
	var imageWidth = queue.getResult('chino.base').originalWidth;

	var boxWidth = $('#image-panel').width() * 0.9;
	var boxHeight;

	if (matchMedia('(min-width: 900px)').matches) {
		boxHeight = $('#image-panel').height();
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
		$('#image-field').css({
			position: 'absolute',
			top: ($('#image-panel').height() - fieldHeight) / 2,
			left: ($('#image-panel').width() - fieldWidth) / 2,
			margin: '0'
		});
	} else {
		$('#image-field').css({
			position: 'relative',
			top: 0,
			left: 0,
			margin: '0 5%'
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
		$('#image').prepend(queue.getResult('chino.base'));
		$('#rendering').removeClass('invisible');
		var info = queue.getResult('chino.info');

		var defaultColor = colorStringToArray(info.default);
		currentSlider = {R: defaultColor[0], G: defaultColor[1], B: defaultColor[2]};

		updateSliders();

		var timer = new Date();
		caman = Caman('#canvas', 'img/chino/color.png', function () {
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
