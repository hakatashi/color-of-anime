// PreLoad Images

var queue = new createjs.LoadQueue();

var characters = [
	'hana',
];

var manifest = [];

characters.forEach(function (character) {
	manifest.push({
		id: character + '.base',
		src: 'img/' + character + '/base.png',
	},{
		id: character + '.color',
		src: 'img/' + character + '/color.png',
	})
});

queue.on('complete', handleComplete, this);
queue.loadManifest(manifest);

// Extend Caman with custom colorchanging plugin

Caman.Filter.register('translate', function (from, to) {
	this.process('translate', function (color) {

	});
});

function handleComplete() {
	$(document).ready(function () {
		$('#image-field').prepend(queue.getResult('hana.base'));
		Caman('#canvas', 'img/hana/color.png', function () {
			this.hue(60).saturation(100).brightness(-40).exposure(10).render(function () {
				$('#image-field').removeClass('invisible');
			});
		});
	});
}
