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

	var from = colorConvert.rgb.lab(fromRGB);
	var to = colorConvert.rgb.lab(toRGB);

	this.process('translate', function (colorRGB) {
		var color = colorConvert.rgb.lab([colorRGB.r, colorRGB.g, colorRGB.b]);

		color[0] = Math.max(0, color[0] + to[0] - from[0]);
		color[1] = color[1] + to[1] - from[1];
		color[2] = color[2] + to[2] - from[2];
/*
		color[0] = (color[0] + to[0] - from[0] + 360) % 360;

		color[1] = Math.max(0, Math.min(color[1] + to[1] - from[1], 100));
		color[2] = Math.max(0, Math.min(color[2] + to[2] - from[2], 100));

		if (color[1] <= from[1]) color[1] = color[1] * to[1] / from[1];
		else color[1] = 100 - (100 - color[1]) * (100 - to[1]) / (100 - from[1]);
		if (color[2] <= from[2]) color[2] = color[2] * to[2] / from[2];
		else color[2] = 100 - (100 - color[2]) * (100 - to[2]) / (100 - from[2]);
*/
		var RGB = colorConvert.lab.rgb(color);
		colorRGB.r = RGB[0];
		colorRGB.g = RGB[1];
		colorRGB.b = RGB[2];

		return colorRGB;
	});
});

colorConvert.hsv.lab = function (color) {
	return colorConvert.rgb.lab(colorConvert.hsv.rgb(color));
};

colorConvert.lab.hsv = function (color) {
	return colorConvert.rgb.hsv(colorConvert.lab.rgb(color));
};

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

var currentColor = {R: null, G: null, B: null};
var currentSlider = {
	RGB: {R: 0, G: 0, B: 0},
	HSV: {H: 0, S: 0, V: 0},
	Lab: {L: 0, a: 0, b: 0}
};
var colorset = 'RGB';
var colorsets = [['R', 'G', 'B'], ['H', 'S', 'V'], ['L', 'a', 'b']];
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

		var defaultColor = tinycolor(info.default);
		var initColor = null;
		var rgb = null;

		if (location.hash && (initColor = tinycolor(location.hash))._format) {
			rgb = initColor.toRgb();
		} else {
			rgb = defaultColor.toRgb();
		}

		currentSlider.RGB = {R: rgb.r / 255, G: rgb.g / 255, B: rgb.b / 255};
		updateSliders('RGB');

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

			$pinch.css('left', value * 100 + '%');

			var display = null;
			if (parameter === 'H') display = value * 360;
			else if (parameter === 'S' || parameter === 'V' || parameter === 'L') display = value * 100;
			else if (parameter === 'a' || parameter === 'b') display = value * 200 - 100;
			else display = value * 255;
			$value.text(Math.floor(display));
		}

		// enable pinches
		$('.color-parameter').bind('touchstart mousedown', function (event) {
			event.preventDefault();

			var $this = $(this);

			var touchX = getX(event);
			var parameter = $(this).data('parameter');

			var offset = $(this).offset().left;
			var width = $(this).width();
			var colorset = $(this).data('colorset');

			var movePinch = function (event) {
				var touchX = getX(event);
				var value = (touchX - offset) / width;

				value = Math.max(0, Math.min(value, 1));
				currentSlider[colorset][parameter] = value;
				updateSliders(colorset);
				updateImage();
			};

			$(window).bind('touchmove mousemove', movePinch);
			$(window).bind('touchend mouseup', function () {
				$(this).unbind('touchmove mousemove', movePinch);
			});

			movePinch(event);
		});

		$('.color-preview-value').click(function (event) {
			$(this).attr('contenteditable', true);
			$(this).selectText();

			// handle enter keypress
			$(this).keypress(function (e) {
				if (e.which === 13) {
					$(this).blur();
					return false;
				} else return true;
			});

			$(this).blur(function () {
				$(this).attr('contenteditable', false);
				$(this).unbind('keypress blur');

				var newColor = tinycolor($(this).text());
				if (newColor._format) {
					var rgb = newColor.toRgb();
					currentSlider.RGB = {R: rgb.r / 255, G: rgb.g / 255, B: rgb.b / 255};
					updateSliders('RGB');
					updateImage();
				} else {
					updateInfo();
				}
			});
		});

		// tab switching
		$('.tab-inner').click(function () {
			colorset = $(this).text();
			$('.colorset-sliders').hide();
			$('.tab').removeClass('selected');
			$('.colorset-sliders[data-colorset=' + colorset + ']').show();
			$(this).parent('.tab').addClass('selected');
		});

		function updateSliders(base) {
			var slider = currentSlider[base];
			var baseColor = {
				RGB: [slider.R * 255, slider.G * 255,       slider.B * 255      ],
				HSV: [slider.H * 360, slider.S * 100,       slider.V * 100      ],
				Lab: [slider.L * 100, slider.a * 200 - 100, slider.b * 200 - 100]
			}[base];

			colorsets.forEach(function (colorset) {
				var name = colorset.join('');

				if (name !== base) {
					var color = colorConvert[base.toLowerCase()][name.toLowerCase()](baseColor);
					if (name === 'RGB') {
						currentSlider.RGB = {R: color[0] / 255, G: color[1] / 255, B: color[2] / 255};
					} else if (name === 'HSV') {
						currentSlider.HSV = {H: color[0] / 360, S: color[1] / 100, V: color[2] / 100};
					} else if (name === 'Lab') {
						currentSlider.Lab = {L: color[0] / 100, a: (color[1] + 100) / 200, b: (color[2] + 100) / 200};
					}
				}

				colorset.forEach(function (parameter) {
					moveSlider(parameter, currentSlider[name][parameter]);
				});
			});

			updateInfo();
		}

		function updateInfo() {
			var color = tinycolor.fromRatio({r: currentSlider.RGB.R, g: currentSlider.RGB.G, b: currentSlider.RGB.B});
			$('.color-preview-value').text(color.toHexString());
			$('.color-preview-square').css('background-color', color.toHexString());

			location.replace(color.toHexString());

			// update sliders gradients
			colorsets.forEach(function (colorset) {
				var name = colorset.join('');

				var slider = currentSlider[name];

				colorset.forEach(function (parameter, index) {
					var par = parameter.toLowerCase();
					var $parameter = $('.color-parameter-wrap[data-parameter=' + parameter + ']');
					var $slider = $parameter.find('.color-slider-wrapper');

					var colorStop = null;
					var colorStops = [];
					for (var i = 0; i < 7; i++) {
						color = $.extend({}, slider);
						color[parameter] = 1 / 6 * i;

						color = {
							RGB: [color.R * 255, color.G * 255,       color.B * 255      ],
							HSV: [color.H * 360, color.S * 100,       color.V * 100      ],
							Lab: [color.L * 100, color.a * 200 - 100, color.b * 200 - 100]
						}[name];

						if (name === 'RGB') colorStop = color;
						else colorStop = colorConvert[name.toLowerCase()].rgb(color);

						colorStops.push({r: colorStop[0], g: colorStop[1], b: colorStop[2]});
					}

					$slider.gradient(colorStops);
				});
			});
		}

		function updateImage() {
			if (busy) return;
			if (currentColor.R === currentSlider.RGB.R
			 && currentColor.G === currentSlider.RGB.G
			 && currentColor.B === currentSlider.RGB.B) return;

			busy = true;
			currentColor.R = currentSlider.RGB.R;
			currentColor.G = currentSlider.RGB.G;
			currentColor.B = currentSlider.RGB.B;
			$('#rendering').removeClass('invisible');

			caman.revert(false);
			caman.translate(info.color, [currentColor.R * 255, currentColor.G * 255, currentColor.B * 255]);
			caman.render(function () {
				$('#image').removeClass('invisible');
				$('#rendering').addClass('invisible');

				busy = false;
				updateImage();
			});
		}
	});
}
