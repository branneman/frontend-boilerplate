var config  = require('../config');
var fs      = require('fs');
var gulp    = require('gulp');
var swig    = require('gulp-swig');
var watch   = require('gulp-watch');
var glob    = require('glob');
var yaml    = require('js-yaml').safeLoad;
var map     = require('map-stream');
var marked  = require('marked');
var path    = require('path');
var moment  = require('moment-timezone');
var sassdoc = require('sassdoc');
var Vinyl   = require('vinyl');

// Default Swig options
var swigOpts = {
    defaults: {
        cache: false,
        locals: {
            pkg: config.docs.data,
            marked: marked
        }
    }
};

/**
 * Sub-task: Docs copy statics
 */
gulp.task('docs-copy-statics', function() {
    return gulp.src(config.docs.src.statics)
        .pipe(gulp.dest(config.docs.dist.static));
});

/**
 * Sub-task: Docs render index
 */
gulp.task('docs-render-index', function() {

    // Grab list of templates & components
    var templates = glob.sync(config.docs.src.templatesAll, { nosort: true }).map(function(dir) {
        return path.relative(config.docs.src.templates, dir);
    });
    var components = glob.sync(config.docs.src.componentsAll, { nosort: true })
        .map(_getComponentData)
        .filter(function(component) { return component; });

    // Data
    var data = {
        pkg: config.docs.data,
        templates: templates,
        components: components,
        lastUpdated: moment().tz('Europe/Amsterdam').format('DD-MM-YYYY HH:mm:ss z')
    };

    // Render index template
    return gulp.src(config.docs.src.indexTpl)
        .pipe(swig({ defaults: { cache: false }, data: data }))
        .pipe(gulp.dest(config.docs.dist.base));
});

/**
 * Sub-task: Docs render components
 */
gulp.task('docs-render-components', function() {

    var cfg = config.docs;

    return gulp.src(cfg.src.componentsAll)
        .pipe(map(function(component, cb) {
            var tpl = new Vinyl({
                path: cfg.src.componentsTpl,
                contents: fs.readFileSync(cfg.src.componentsTpl)
            });
            tpl.data = _getComponentData(component.path);
            if (!tpl.data) return cb(); // No .yml? Skip this component
            tpl.data._component = component;
            cb(null, tpl);
        }))
        .pipe(swig(swigOpts))
        .pipe(map(function(tpl, cb) {
            cb(null, new Vinyl({
                path: path.relative(cfg.src.components, tpl.data._component.path),
                contents: tpl.contents
            }));
        }))
        .pipe(gulp.dest(cfg.dist.components));
});

/**
 * Sub-task: Docs render components demo
 */
gulp.task('docs-render-components-demo', function() {

    var cfg = config.docs;

    return gulp.src(cfg.src.componentsAll)
        .pipe(map(function(component, cb) {
            var tpl = new Vinyl({
                path: cfg.src.componentsDemoTpl,
                contents: fs.readFileSync(cfg.src.componentsDemoTpl)
            });
            tpl.data = _getComponentData(component.path);
            if (!tpl.data) return cb(); // No .yml? Skip this component
            tpl.data._component = component;
            cb(null, tpl);
        }))
        .pipe(swig(swigOpts))
        .pipe(map(function(tpl, cb) {
            cb(null, new Vinyl({
                path: path.relative(cfg.src.components, tpl.data._component.path).replace(/\.html$/, '-demo.html'),
                contents: tpl.contents
            }));
        }))
        .pipe(gulp.dest(cfg.dist.components));
});

/**
 * Task: Docs Compile
 */
gulp.task('docs-compile', [
    'docs-copy-statics',
    'docs-render-index',
    'docs-render-components',
    'docs-render-components-demo',
    'docs-sassdoc'
]);

/**
 * Task: Docs Watch
 */
gulp.task('docs-watch', ['docs-compile'], function() {
    var watching = [
        config.docs.src.index,
        config.docs.src.componentsYml,
        config.html.src.templates,
        config.html.src.layout,
        config.html.src.components
    ];
    watch(watching, function() {
        gulp.start(['docs-compile']);
    });
});

/**
 * Task: Docs sassdoc
 */
gulp.task('docs-sassdoc', function() {
    gulp.src([config.css.src.staticAll, config.css.src.components])
        .pipe(sassdoc({ dest: config.docs.dist.sassdocs }))
});

/**
 * Collect a components' properties, return data object
 *
 * @param {String} componentPath - The path to a component .html file
 * @returns {Object|Boolean} - The parsed components' Yaml file augmented with it's path
 * @private
 */
function _getComponentData(componentPath) {
    var ymlFile = path.dirname(componentPath) + '/' + path.basename(componentPath, '.html') + '.yml';
    try {
        var data = yaml(fs.readFileSync(ymlFile), { filename: ymlFile });
    } catch (e) {
        return false;
    }
    data.path = path.relative(config.docs.src.components, componentPath);
    data.demoUrl = path.basename(data.path, '.html') + '-demo.html';
    data.baseUrl = Array(data.path.split('/').length + 1).join('../');
    data.demo = data.demo || '{}';
    return data;
}
