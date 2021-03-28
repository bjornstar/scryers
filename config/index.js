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

var appConfig = {};

try {
	appConfig = require('../config.json');
} catch (e) {
	console.warn('Could not find config.json');
}

appConfig.name = require('../package.json').name;

function prettyLogGenerator(fnLog) {
	return function () {
		const args = Array.prototype.slice.call(arguments);
		args.unshift('[' + new Date().toISOString() + '] ' + appConfig.name + '.' + process.pid + ' -');
		fnLog.apply(console, args);
	}
}

if (appConfig.prettyLog) {
	const { error, log } = console;

	console.log = prettyLogGenerator(log);
	console.error = prettyLogGenerator(error);
}

module.exports = appConfig;
