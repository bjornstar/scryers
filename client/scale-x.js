module.exports = function scaleX(pos) {
	return `scaleX(${pos.d == 'l' ? -1 : 1})`;
};
