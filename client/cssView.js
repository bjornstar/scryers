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
//
//                     _
//   ___ ___ ___/\   /(_) _____      __
//  / __/ __/ __\ \ / / |/ _ \ \ /\ / /
// | (__\__ \__ \\ V /| |  __/\ V  V /
//  \___|___/___/ \_/ |_|\___| \_/\_/
//

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var Goal = require('./goal');
var Portal = require('./portal');
var Whim = require('./whim');

var id = 0;

function CssView(map, ref) {
	EventEmitter.call(this);

	this.id = 'cssview' + id;
	this.map = map;
	this.ref = ref;
	this.offset = { x: 0, y: 0 };

	var debugInfo = document.createElement('DIV');
	debugInfo.className = 'debugInfo';

	var offsetSpan = document.createElement('SPAN');
	offsetSpan.textContent = 'x: ' + this.offset.x + ', y: ' + this.offset.y;

	var mouseSpan = document.createElement('SPAN');
	var lineBreak = document.createElement('BR');

	debugInfo.appendChild(offsetSpan);
	debugInfo.appendChild(lineBreak);
	debugInfo.appendChild(mouseSpan);

	var view = this.view = document.createElement('DIV');
	view.className = 'view';
	view.id = this.id;

	view.appendChild(debugInfo);

	id += 1;

	if (!document.getElementById(view.id)) {
		document.body.appendChild(view);
	}

	var that = this;
	view.addEventListener('mouseup', function (event) {
		var newX = event.pageX;
		var newY = event.pageY;
		that.emit('newCoords', newX, newY);
	});

	view.addEventListener('mousemove', function (event) {
		mouseSpan.textContent = 'x: ' + event.pageX + ', y: ' + event.pageY;
	});
}

inherits(CssView, EventEmitter);

CssView.prototype.addWhim = function (whim) {
	var myWhim = new Whim(whim, this.view);
};

CssView.prototype.addPortal = function (portal) {
	var myPortal = new Portal(portal, this.view);
};

CssView.prototype.addGoal = function (goal) {
	var myGoal = new Goal(goal, this.view);
};

CssView.prototype.remove = function (element) {
	this.view.removeChild(element);
};

CssView.prototype.setRef = function (ref) {
	this.ref = ref;
};

exports.CssView = CssView;