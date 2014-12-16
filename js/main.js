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

function handleComplete() {
	$(document).ready(function () {
		$(window).resize(onResize);
		onResize();

		$('#image').prepend(queue.getResult('chino.base'));
		$('#rendering').removeClass('invisible');
		var timer = new Date();
		Caman('#canvas', 'img/chino/color.png', function () {
			this.translate([232, 230, 244], [255, 217, 228]);
			this.render(function () {
				console.log('Rendering Time: ' + (new Date() - timer));
				$('#image').removeClass('invisible');
				$('#rendering').addClass('invisible');
			});
		});

		function getX(event) {
			if (event.originalEvent.changedTouches) {
				return event.originalEvent.changedTouches[0].pageX;
			} else {
				return event.originalEvent.pageX;
			}
		}

		// enable pinches
		$('.color-parameter').bind('touchstart mousedown', function (event) {
			event.preventDefault();

			var touchX = getX(event);

			var offset = $(this).offset().left;
			var width = $(this).width();
			var $pinch = $(this).find('.color-slider-pinch');

			var movePinch = function (event) {
				var touchX = getX(event);
				var value = (touchX - offset) / width;
				value = Math.max(0, Math.min(value, 1));
				$pinch.css('left', value * 100 + '%');
			}

			$(window).bind('touchmove mousemove', movePinch);
			$(window).bind('touchend mouseup', function () {
				$(this).unbind('touchmove mousemove', movePinch);
			});

			movePinch(event);
		})
	});
}
