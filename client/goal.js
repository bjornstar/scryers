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

function Goal(goal, view) {
	this.goal = goal;

	this.x = goal.pos.x.valueOf();
	this.y = goal.pos.y.valueOf();

	var position = 'translate(' + this.x + 'px, ' + this.y + 'px)';

	var cnt = this.rootElement = document.createElement('div');
	cnt.id = goal.getKey();
	cnt.className = 'container';
	transform(cnt, position);

	// Create the goal.

	var div = this.div = document.createElement('div');
	div.className = 'goal'
	div.style.backgroundImage = 'url(/images/goal.png)';

	// Stick them all into the container

	cnt.appendChild(div);

	// We want the goal to fade in. The default opacity of a goal is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);

	view.appendChild(cnt);

	var that = this;

	goal.pos.on('readable', function () {
		that.update();
	});

	goal.on('destroy', function () {
		that.destroy();
	});
}

Goal.prototype.update = function () {
	var x = this.goal.pos.x.valueOf();
	var y = this.goal.pos.y.valueOf();

	var movement = 'translate(' + x + 'px, ' + y + 'px)';

	// We apply movement transforms to the whole goal so that everything moves
	// together.

	transform(this.rootElement, movement);

	this.x = x;
	this.y = y;
};

Goal.prototype.destroy = function () {
	// We fade out the goal by setting the opacity to 0.
	var cnt = this.rootElement;

	function removeGoal(e) {
		// We might have multiple transitions, the one we want to pay attention
		// to is the one for opacity.

		if (e.propertyName === 'opacity') {
			cnt.parentNode.removeChild(cnt);
		}
	}

	// and when the opacity reaches 0 we remove the goal from the dimension.

	onEnd(cnt, removeGoal);

	cnt.style.opacity = 0;
};

module.exports = Goal;
