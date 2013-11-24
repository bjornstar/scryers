function doStep(curr, goal, step) {
	var speed = 50;

	var incX = Math.min(Math.abs(curr.x - goal.x), speed);
	var incY = Math.min(Math.abs(curr.y - goal.y), speed);

	curr.x.inc(goal.x > curr.x ? speed : -incX);
	curr.y.inc(goal.y > curr.y ? speed : -incY);

	step += 1;
}

function moveScryers(movingScryers) {
	for (var scryerId in movingScryers) {
		var dPos = movingScryers[scryerId].dim;
		var gPos = movingScryers[scryerId].goal;
		var step = movingScryers[scryerId].step
		
		doStep(dPos, gPos, step);

		if (dPos.x.is(gPos.x) && dPos.y.is(gPos.y)) {
			delete movingScryers[scryerId];
		}
	}
}

module.exports = moveScryers;