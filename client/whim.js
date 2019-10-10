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

require('file-loader?name=[name].[ext]!./images/slime.png');

function scaleX(pos) {
	return `scaleX(${pos.d == 'l' ? -1 : 1})`;
}

function translate(pos) {
	return `translate(${pos.x}px, ${pos.y}px)`;
}

function Whim(whim, view) {
	this.div = document.createElement('div');
	this.nametag = document.createElement('div');
	this.rootElement = document.createElement('div');

	this.whim = whim;

	var that = this;

	const { div, nametag, rootElement } = this;

	rootElement.id = whim.getKey();
	rootElement.className = 'animated container';
	rootElement.style.transform = translate(whim.pos);

	// Create the whim.

	div.className = 'whim';
	div.style.backgroundImage = 'url(/images/slime.png)';
	div.style.transform = scaleX(whim.pos);

	// And create the nametag.

	nametag.className = 'nametag';
	nametag.textContent = whim.name.valueOf();

	// Stick them all into the 'whim'

	rootElement.appendChild(div);
	rootElement.appendChild(nametag);

	view.appendChild(rootElement);

	// We want the whim to fade in. The default opacity of a whim is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		rootElement.style.opacity = 1;
	}, 0);

	whim.pos.on('readable', function () {
		that.update();
	});

	whim.once('destroy', function () {
		that.destroy();
	});
}

Whim.prototype.update = function () {
	const { div, rootElement, whim: { pos } } = this;

	// We apply movement transforms to the whole whim so that everything moves
	// together.

	rootElement.style.transform = translate(pos);

	// We want to be able to flip the whim left and right, but not the text
	// so we only apply the direction changes to the whim.

	div.style.transform = scaleX(pos);
};

Whim.prototype.destroy = function () {
	// We fade out the whim by setting the opacity to 0.
	const { rootElement } = this;

	rootElement.style.opacity = 0;

	function removeWhim(e) {
		// We might have multiple transitions, the one we want to pay attention
		// to is the one for opacity.

		if (e.propertyName !== 'opacity') {
			return;
		}

		rootElement.parentNode.removeChild(rootElement);

		e.stopPropagation();
	}

	// and when the opacity reaches 0 we remove the whim from the playground.
	rootElement.addEventListener('transitionEnd', removeWhim);
};

module.exports = Whim;
