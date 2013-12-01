var SEPARATOR = ':';

function deserialize(data) {
	var dataAfter = data.indexOf(SEPARATOR);
	var n = data.substring(0, dataAfter);
	var d = JSON.parse(data.substring(dataAfter + 1));

	return { name: n, data: d };
}

function serialize(name, data) {
	return name.concat(SEPARATOR).concat(JSON.stringify(data));
}

exports.deserialize = deserialize;
exports.serialize = serialize;
