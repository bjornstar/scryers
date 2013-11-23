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

var Builder = require('component-builder');
var fs = require('fs');
var write = fs.writeFileSync;
var mkdir = fs.mkdirSync;

var appConfig = require('../config/');

var built = false;

module.exports = function(req, res, next) {
	if (built) {
		return next();
	}
	
	var builder = new Builder('.');
	builder.copyAssetsTo('public');
	builder.addLookup('node_modules');

	builder.on('config', function () {
		builder.append('window.config = ' + JSON.stringify(appConfig) + ';');
	});

	builder.build(function (err, res) {
		if (err) return next(err);
		if (!fs.existsSync('public')) {
			mkdir('public');
		}
		write('public/' + appConfig.name + '.js', res.require + res.js);
		built = !appConfig.developmentMode;
		next();
	});
};
