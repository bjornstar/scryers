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

require('file-loader?emit=false&name=[name].[ext]!./images/goal.png');

const translate = require('./translate');

class Goal {
	constructor(goal, view) {
		this.div = document.createElement('div');
		this.rootElement = document.createElement('div');

		this.goal = goal;

		const { div, rootElement } = this;

		rootElement.id = goal.getKey();
		rootElement.className = 'container';
		rootElement.style.transform = translate(goal.pos);

		div.className = 'goal'
		div.style.backgroundImage = 'url(/images/goal.png)';

		rootElement.appendChild(div);

		view.appendChild(rootElement);

		goal.on('destroy', this.destroy.bind(this));
		goal.pos.on('readable', this.update.bind(this));

		setTimeout(function () {
			rootElement.style.opacity = 1;
		}, 0);
	}

	update() {
		const { goal: { pos }, rootElement } = this;

		rootElement.style.transform = translate(pos);
	}

	destroy() {
		console.log('goal.destroy');
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

module.exports = Goal;
