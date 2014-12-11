// Copyright (C) 2013 Bjorn Stromberg
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var build = require('component-builder');
var resolve = require('component-resolver');
var fs = require('fs');

var appConfig = require('../config/');

var built = false;

module.exports = function (req, res, next) {
	if (built) {
		return next();
	}

	resolve(process.cwd(), { install: true }, function (error, tree) {
		if (error) {
			console.error(error);
			return next();
		}
		build.scripts(tree).use('scripts', build.plugins.js()).end(function (error, string) {
			if (error) {
				console.error(error);
				return next();
			}
			var cfg = 'window.config = ' + JSON.stringify(appConfig) + ';';
			fs.writeFile('public/' + appConfig.name + '.js', build.scripts.require + string + cfg, function (error) {
				if (error) {
					console.error(error);
					return next();
				}

				built = true;
				next();
			});
		});
	});
/*
	var builder = new Builder('.');
	builder.copyAssetsTo('public');
	builder.append('window.config = ' + JSON.stringify(appConfig) + ';');

	builder.build(function (error, component) {
		if (error) {
			// Most likely, too many open files.
			console.error(error);
			return next();
		}

		fs.writeFile('public/' + appConfig.name + '.js', component.require + component.js, function (error) {
			if (error) {
				console.error(error);
				return next();
			}

			built = !appConfig.developmentMode;
			next();
		});
	});
*/
};
