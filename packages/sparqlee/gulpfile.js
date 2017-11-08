var gulp = require('gulp');
var ts = require('gulp-typescript');
var del = require('del');
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('clean:output', function () {
  return del([
    'dist/*'
  ]);
});

gulp.task('watch', ['compile'], function(){
  gulp.watch(['benchmarks/**/*.ts', 'src/**/*.ts', '!**/dist/*'], ['compile']);
});

gulp.task('compile', ['clean:output'], function(){
    var tsProject = ts.createProject('tsconfig.json');
    var result = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject());

    var js = result.js
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));

    var dts = result.dts.pipe(gulp.dest('dist'));

    return merge(js, dts);
});

gulp.task('default', ['compile']);