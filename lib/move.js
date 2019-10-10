function move(pos, goal, speed) {
	speed = speed || 100;

	const distanceX = goal.x - pos.x;
	const distanceY = goal.y - pos.y;

	const angle = Math.atan2(distanceY, distanceX);

	const stepX = speed * Math.cos(angle);
	const stepY = speed * Math.sin(angle);

	const newX = pos.x + (distanceX >= 0 ? Math.min(stepX, distanceX) : Math.max(stepX, distanceX));
	const newY = pos.y + (distanceY >= 0 ? Math.min(stepY, distanceY) : Math.max(stepY, distanceY));
	const newD = goal.x > pos.x ? 'r' : goal.x < pos.x ? 'l' : pos.d;

	pos.x.assign(newX);
	pos.y.assign(newY);
	pos.d.assign(newD);
}

module.exports = move;
