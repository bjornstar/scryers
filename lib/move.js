function step(curr, goal, speed) {
	speed = speed || 100;

	var distanceX = Math.abs(curr.x - goal.x);
	var distanceY = Math.abs(curr.y - goal.y);

	var directionX = distanceX / distanceY;
	var directionY = distanceY / distanceX;

	var stepX = Math.min(Math.min(speed, speed * directionX), distanceX);
	var stepY = Math.min(Math.min(speed, speed * directionY), distanceY);

	var newX = goal.x > curr.x ? curr.x + stepX : curr.x - stepX;
	var newY = goal.y > curr.y ? curr.y + stepY : curr.y - stepY;
	var newD = curr.d;

	if (goal.x > curr.x) {
		newD = 'r';
	} else if (goal.x < curr.x) {
		newD = 'l';
	}

	curr.assign({ x: newX, y: newY, d: newD });
}

function move(moving) {
	for (var id in moving) {
		var dPos = moving[id].dim;
		var gPos = moving[id].goal;
		var speed = moving[id].speed;
		
		step(dPos, gPos, speed);

		if (dPos.x.is(gPos.x) && dPos.y.is(gPos.y)) {
			delete moving[id];
		}
	}
}

module.exports = move;