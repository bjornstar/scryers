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

var appConfig = require('../config/');

var segmentio;

var initialized;

if (appConfig.segmentio) {
	try {
		segmentio = require('analytics-node');
		segmentio.init({secret: appConfig.segmentio});
		initialized = true;
		console.log('using segment.io');
	} catch (e) {
		console.log('error starting segment.io')
	}
} else {
	console.log('segment.io not configured')
}

if (appConfig.newrelic) {
	process.env.NEW_RELIC_APP_NAME = appConfig.name;
	process.env.NEW_RELIC_LICENSE_KEY = appConfig.newrelic;
	process.env.NEW_RELIC_NO_CONFIG_FILE = true;

	try {
		require('newrelic');
		console.log('using newrelic');
	} catch (e) {
		console.log('Error starting newrelic');
	}
} else {
	console.log('newrelic not configured')
}

exports.identify = function () {
	if (!initialized) {
		return;
	}

	try {
		segmentio.identify.apply(null, arguments);
	} catch (e) {
		console.log(e);
	}
};

exports.track = function () {
	if (!initialized) {
		return;
	}
	
	try {
		segmentio.track.apply(null, arguments);
	} catch (e) {
		console.error(e);
	}
};