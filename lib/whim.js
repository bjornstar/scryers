const uuid = require('uuid');

function rnd(n) {
  return Math.floor(Math.random() * n);
}

class Whim {
  constructor(data) {
    Object.assign(this, data);
  }
}

Whim.create = function ({ name }) {
  const id = uuid.v4();
  const now = Date.now();

  name = name || 'Sumi Whim';

  return new Whim({
    class: 'c1',
    id,
    name,
    pos: {
      d: 'l',
      x: rnd(1000),
      y: rnd(1000)
    }
  });
};

module.exports = exports = Whim;
