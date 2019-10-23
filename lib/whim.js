const crypto = require('crypto');

function rnd(n) {
	return Math.floor(Math.random() * n);
}

class Whim {
	constructor(data) {
		Object.assign(this, data);
	}
}

Whim.create = function ({ name }) {
	const id = crypto.randomBytes(6).toString('base64');
	const created = Date.now();

	name = name || 'Sumi Whim';
	const pos = {
		d: 'l',
		x: rnd(1000),
		y: rnd(1000)
	};

	return new Whim({
		created,
		id,
		name,
		pos,
	});
};

module.exports = exports = Whim;
