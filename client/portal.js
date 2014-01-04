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
	what.style.mozTransform = how;
}

function onEnd(what, then) {
	what.addEventListener('transitionend', then);
	what.addEventListener('webkitTransitionEnd', then);
	what.addEventListener('msTransitionEnd', then);
	what.addEventListener('oTransitionEnd', then);
	what.addEventListener('mozTransitionEnd', then);
}

function Portal(portal, view) {
	this.portal = portal;

	this.x = portal.x.valueOf();
	this.y = portal.y.valueOf();

	var position = 'translate(' + this.x + 'px, ' + this.y + 'px)';

	var name = portal.getParent().name.valueOf();

	var cnt = this.rootElement = document.createElement('div');
	cnt.className = 'container';
	transform(cnt, position);

	// Create the portal.

	var div = this.div = document.createElement('div');
	div.className = 'portal'
	div.style.backgroundImage = 'url(/images/portal.png)';

	// And create the nametag.

	var nametag = this.nametag = document.createElement('div');
	nametag.className = 'nametag';
	nametag.textContent = name;

	// Stick them all into the 'portal'

	cnt.appendChild(div);
	cnt.appendChild(nametag);

	view.appendChild(cnt);

	var that = this;

	var destroyed = false;

	portal.once('destroy', function () {
		destroyed = true;
		that.destroy();
	});

	function removePortal(e) {
		// Unfortunately Mozilla is a giant pile of garbage and doesn't
		// reliably animate anything.

		if (destroyed) {
			cnt.parentNode.removeChild(cnt);
		}
	}

	onEnd(cnt, removePortal);

	// We want the portal to fade in. The default opacity of a portal is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);
}

Portal.prototype.update = function () {
	var x = this.portal.x.valueOf();
	var y = this.portal.y.valueOf();

	var movement = 'translate(' + x + 'px, ' + y + 'px)';

	// We apply movement transforms to the whole portal so that everything moves
	// together.

	transform(this.rootElement, movement);

	this.x = x;
	this.y = y;
};

Portal.prototype.destroy = function () {
	// We fade out the portal by setting the opacity to 0.
	var cnt = this.rootElement;

	// and when the opacity reaches 0 we remove the portal from the dimension.
	cnt.style.opacity = 0;
};

module.exports = Portal;