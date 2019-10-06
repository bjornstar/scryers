function move(curr, goal, speed) {
	speed = speed || 100;

	var distanceX = goal.x - curr.x;
	var distanceY = goal.y - curr.y;

	var angle = Math.atan2(distanceY, distanceX);

	var stepX = speed * Math.cos(angle);
	var stepY = speed * Math.sin(angle);

	var newX = curr.x + (distanceX >= 0 ? Math.min(stepX, distanceX) : Math.max(stepX, distanceX));
	var newY = curr.y + (distanceY >= 0 ? Math.min(stepY, distanceY) : Math.max(stepY, distanceY));
	var newD = curr.d;

	if (goal.x > curr.x) {
		newD = 'r';
	} else if (goal.x < curr.x) {
		newD = 'l';
	}

	curr.x.assign(newX);
	curr.y.assign(newY);
	curr.d.assign(newD);
}

module.exports = move;
