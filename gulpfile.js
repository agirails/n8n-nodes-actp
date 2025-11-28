const { src, dest } = require('gulp');

function buildIcons() {
	// Copy SVG icon to dist
	return src('nodes/**/*.svg').pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
