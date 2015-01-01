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
		cssmin: {
			css: {
				files: {
					'css/style.css': ['css/normalize.css', 'css/main.css', 'css/custom.css']
				}
			}
		},
		jade: {
			html: {
				files: {
					'index.html': 'index.jade'
				}
			}
		},
		watch: {
			options: {
				livereload: true
			},
			css: {
				files: ['**/*.less'],
				tasks: ['compile:css']
			},
			html: {
				files: ['**/*.jade'],
				tasks: ['compile:html']
			},
			js: {
				files: ['**/*.js']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-cssmin');

	grunt.registerTask('default', ['compile', 'watch']);
	grunt.registerTask('compile', ['compile:css', 'compile:html']);
	grunt.registerTask('compile:css', ['less', 'cssmin']);
	grunt.registerTask('compile:html', ['jade']);
};
