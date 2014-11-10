module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		less: {
			css: {
				files: {
					'css/custom.css': 'css/custom.less'
				}
			}
		},
		concat: {
			options: {
				separator: '\n'
			},
			css: {
				src: ['css/normalize.css', 'css/main.css', 'css/custom.css'],
				dest: 'css/style.css'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.registerTask('default', ['less', 'concat']);
};
