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

function transform(what, how) {
	what.style.transform = how;
	what.style.webkitTransform = how;
	what.style.msTransform = how;
	what.style.oTransform = how;
}

function onEnd(what, then) {
	what.addEventListener('transitionEnd', then);
	what.addEventListener('webkitTransitionEnd', then);
	what.addEventListener('msTransitionEnd', then);
	what.addEventListener('oTransitionEnd', then);
}

function Whim(whim) {
	this.whim = whim;

	this.x = whim.pos.x.valueOf();
	this.y = whim.pos.y.valueOf();

	var position = 'translate(' + this.x + 'px, ' + this.y + 'px)';
	var direction = 'scaleX(' + (whim.pos.d == 'l' ? -1 : 1) + ')';

	var name = whim.name.valueOf();

	var cnt = this.rootElement = document.createElement('div');
	cnt.id = whim.getKey();
	cnt.className = 'whim';
	transform(cnt, position);

	// Create the whim.

	var div = this.div = document.createElement('div');
	div.className = whim.class.valueOf();
	div.style.backgroundImage = 'url(/images/slime.png)';
	transform(div, direction);

	// And create the nametag.

	var nametag = this.nametag = document.createElement('div');
	nametag.className = 'nametag';
	nametag.textContent = name;

	// Stick them all into the 'whim'

	cnt.appendChild(div);
	cnt.appendChild(nametag);

	view.appendChild(cnt);

	// We want the whim to fade in. The default opacity of a whim is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);

	var that = this;

	whim.pos.on('readable', function () {
		that.update();
	});

	whim.on('destroy', function () {
		that.destroy();
	});
}

Whim.prototype.update = function () {
	var x = this.whim.pos.x.valueOf();
	var y = this.whim.pos.y.valueOf();
	var d = this.whim.pos.d.valueOf();

	var movement = 'translate(' + x + 'px, ' + y + 'px)';
	var direction = 'scaleX(' + (d === 'l' ? -1 : 1) + ')';

	// We apply movement transforms to the whole whim so that everything moves
	// together.

	transform(this.rootElement, movement);

	// We want to be able to flip the whim left and right, but not the text
	// so we only apply the direction changes to the whim.

	transform(this.div, direction);

	this.x = x;
	this.y = y;
};

Whim.prototype.destroy = function () {
	// We fade out the whim by setting the opacity to 0.
	var cnt = this.rootElement;
	cnt.style.opacity = 0;

	function removeWhim(e) {
		// We might have multiple transitions, the one we want to pay attention
		// to is the one for opacity.

		if (e.propertyName !== 'opacity') {
			return;
		}

		var view = cnt.parentNode;
		view.removeChild(cnt);

		e.stopPropagation();
	}

	// and when the opacity reaches 0 we remove the whim from the playground.
	onEnd(cnt, removeWhim);
};

module.exports = Whim;