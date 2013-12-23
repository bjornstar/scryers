function step(curr, goal, speed) {
	speed = speed || 100;

	var distanceX = goal.x - curr.x;
	var distanceY = goal.y - curr.y;

	var angle = Math.atan2(distanceY, distanceX);

	var stepX = speed * Math.cos(angle);
	var stepY = speed * Math.sin(angle);

	var newX = curr.x + (distanceX > 0 ? Math.min(stepX, distanceX) : Math.max(stepX, distanceX));
	var newY = curr.y + (distanceY > 0 ? Math.min(stepY, distanceY) : Math.max(stepY, distanceY));
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
		var dPos = moving[id].pos;
		var gPos = moving[id].goal;
		var speed = moving[id].speed;

		step(dPos, gPos, speed);

		if (dPos.x.is(gPos.x) && dPos.y.is(gPos.y)) {
			delete moving[id];
		}
	}
}

module.exports = move;