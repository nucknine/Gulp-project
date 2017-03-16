'use strict';

var gulp         = require('gulp'), // Подключаем Gulp
	stylus       = require('gulp-stylus'), //Подключаем Sass пакет,
	browserSync  = require('browser-sync').create(), // Подключаем Browser Sync
	concat       = require('gulp-concat'), // Подключаем gulp-concat (для конкатенации файлов)
	uglify       = require('gulp-uglifyjs'), // Подключаем gulp-uglifyjs (для сжатия JS)
	cssnano      = require('gulp-cssnano'), // Подключаем пакет для минификации CSS
	rename       = require('gulp-rename'), // Подключаем библиотеку для переименования файлов
	del          = require('del'), // Подключаем библиотеку для удаления файлов и папок
	imagemin     = require('gulp-imagemin'), // Подключаем библиотеку для работы с изображениями
	pngquant     = require('imagemin-pngquant'), // Подключаем библиотеку для работы с png
	cache        = require('gulp-cache'), // Подключаем библиотеку кеширования
	autoprefixer = require('gulp-autoprefixer'), // Подключаем библиотеку для автоматического добавления префиксов
	pug		 	 = require('gulp-pug'),
	plumber 	 = require('gulp-plumber'),
	spritesmith	 = require('gulp.spritesmith'),
	uncss 		 = require('gulp-uncss'),
	svgSprite 	 = require('gulp-svg-sprite'),
	svgmin 		 = require('gulp-svgmin'),
	cheerio 	 = require('gulp-cheerio'),
	replace 	 = require('gulp-replace'),
	sass 		 = require('gulp-sass');

//SVG cook a sprite
gulp.task('svgSpriteBuild', function () {
	return gulp.src('app/img/icons/svg/*.svg')
	// minify svg
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		// remove all fill, style and stroke declarations in out shapes
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
			},
			parserOptions: {xmlMode: true}
		}))
		// cheerio plugin create unnecessary string '&gt;', so replace it.
		.pipe(replace('&gt;', '>'))
		// build svg sprite
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: "../sprite.svg",
					render: {
						scss: {
							dest:'../../../../../sass/svgsprites.scss',
							template: "app/sass/_sprite_template.scss"
						}
					}
				}
			}
		}))
		.pipe(gulp.dest('app/img/icons/svg/sprite/'));
});

//sass
gulp.task('sass', function(){ // Создаем таск Sass
	return gulp.src('app/sass/**/*.scss') // Берем источник
		.pipe(plumber())
		.pipe(sass()) // Преобразуем Sass в CSS посредством gulp-sass
		.pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true })) // Создаем префиксы
		.pipe(gulp.dest('app/css')) // Выгружаем результата в папку app/css
		.pipe(browserSync.stream());
		//.pipe(browserSync.reload({stream: true}));
});


//finalTask
gulp.task('svgSprite', ['svgSpriteBuild', 'sass']);

//uncss
gulp.task('uncss', function () {
    return gulp.src('app/css/main.css')
        .pipe(uncss({
            html: ['app/index.html']
        }))
        .pipe(gulp.dest('app/css'));
});

//spritesmith

gulp.task('sprite', function() {
    var spriteData =
        gulp.src('app/img/icons/png/sprites/sprite_src/*.*') // путь, откуда берем картинки для спрайта
            .pipe(spritesmith({
                imgName: 'sprite.png',
                imgPath: '../img/icons/png/sprites/sprite_dest/sprite.png',
                cssName: 'sprite.styl',
                cssFormat: 'stylus',
                algorithm: 'binary-tree',
                cssTemplate: 'stylus.template.mustache',
                cssVarMap: function(sprite) {
                    sprite.name = 's-' + sprite.name
                }
            }));

    spriteData.img.pipe(gulp.dest('app/img/icons/png/sprites/sprite_dest/')); // путь, куда сохраняем картинку
    spriteData.css.pipe(gulp.dest('app/stylus/')); // путь, куда сохраняем стили
});


// pug
gulp.task('pug', function() {
  gulp.src('app/pug/*.pug')
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('app'));
})

//stylus
gulp.task('stylus', function () {
  return gulp.src('app/stylus/**/*.styl')
  	.pipe(plumber())
    .pipe(stylus({
      'include css': true
	}))
    .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
    .pipe(gulp.dest('app/css'))
    .pipe(browserSync.stream());
    //.pipe(browserSync.reload({stream: true}));
});

gulp.task('browser-sync', function() { // Создаем таск browser-sync
	browserSync.init({ // Выполняем browserSync
		server: { // Определяем параметры сервера
			baseDir: 'app' // Директория для сервера - app
		},
		files: ["app/js/*.js", "app/*.html", "app/*.php", "app/css/**/*.css"],
		notify: false // Отключаем уведомления
	});
});

gulp.task('scripts', function() {
	return gulp.src([ // Берем все необходимые библиотеки
		'app/libs/jquery/dist/jquery.min.js', // Берем jQuery
		'app/libs/magnific-popup/dist/jquery.magnific-popup.min.js' // Берем Magnific Popup
		])
		.pipe(concat('libs.min.js')) // Собираем их в кучу в новом файле libs.min.js
		.pipe(uglify()) // Сжимаем JS файл
		.pipe(gulp.dest('app/js')); // Выгружаем в папку app/js
});

gulp.task('css-libs', ['stylus'], function() {
	return gulp.src([
		'app/css/libs.css',
		'app/css/main.css'
		]) // Выбираем файл для минификации
		.pipe(cssnano()) // Сжимаем
		.pipe(rename({suffix: '.min'})) // Добавляем суффикс .min
		.pipe(gulp.dest('app/css')); // Выгружаем в папку app/css
});

//clean
gulp.task('clean', function() {
	return del.sync('dist'); // Удаляем папку dist перед сборкой
});

//img
gulp.task('img', function() {
	return gulp.src('app/img/**/*') // Берем все изображения из app
		.pipe(cache(imagemin({  // Сжимаем их с наилучшими настройками с учетом кеширования
			interlaced: true,
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			use: [pngquant()]
		})))
		.pipe(gulp.dest('dist/img')); // Выгружаем на продакшен
});

//build
gulp.task('build', ['clean', 'img', 'stylus', 'uncss', 'scripts'], function() {

	var buildCss = gulp.src([ // Переносим библиотеки в продакшен
		'app/css/main.css',
		'app/css/libs.min.css'
		])
	.pipe(gulp.dest('dist/css'))

	var buildFonts = gulp.src('app/fonts/**/*') // Переносим шрифты в продакшен
	.pipe(gulp.dest('dist/fonts'))

	var buildJs = gulp.src('app/js/**/*') // Переносим скрипты в продакшен
	.pipe(gulp.dest('dist/js'))

	var buildHtml = gulp.src('app/*.html') // Переносим HTML в продакшен
	.pipe(gulp.dest('dist'));

});

//clear cache
gulp.task('clear', function (callback) {
	return cache.clearAll();
});

//watch
gulp.task('watch', ['browser-sync'], function() {
	gulp.watch('app/pug/**/*.pug', ['pug']); // Наблюдение за sass файлами в папке sass
	gulp.watch('app/stylus/**/*.styl', ['stylus', 'css-libs']); // Наблюдение за sass файлами в папке sass
	gulp.watch('app/sass/**/*.scss', ['sass', 'css-libs']); // Наблюдение за sass файлами в папке sass
});

//default
gulp.task('default', ['svgSprite', 'sprite', 'scripts', 'watch', 'browser-sync']);
