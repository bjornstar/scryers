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

require('file-loader?emit=false&name=[name].[ext]!./images/portal.png');

const translate = require('./translate');

class Portal {
	constructor(portal, view) {
		this.div = document.createElement('div');
		this.nametag = document.createElement('div');
		this.rootElement = document.createElement('div');

		this.portal = portal;

		const { div, nametag, rootElement } = this;

		rootElement.className = 'container';
		rootElement.style.transform = translate(portal);

		div.className = 'portal'
		div.style.backgroundImage = 'url(/images/portal.png)';

		nametag.className = 'nametag';
		nametag.textContent = portal.getParent().name.valueOf();;

		rootElement.appendChild(div);
		rootElement.appendChild(nametag);

		view.appendChild(rootElement);

		portal.once('destroy', this.destroy.bind(this));

		setTimeout(function () {
			rootElement.style.opacity = 1;
		}, 0);
	}

	update() {
		const { portal, rootElement } = this;

		rootElement.style.transform = translate(portal);
	}

	destroy() {
		const { rootElement } = this;

		rootElement.addEventListener('transitionend', (e) => {
			if (e.propertyName === 'opacity') {
				rootElement.parentNode.removeChild(rootElement);

				e.stopPropagation();
			}
		});

		rootElement.style.opacity = 0;
	}
}

module.exports = Portal;
