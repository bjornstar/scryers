var SEPARATOR = ':';

function deserialize(str) {
	var dataAfter = str.indexOf(SEPARATOR);
	var name = str.substring(0, dataAfter);
	var data = str.substring(dataAfter + 1)

	var d;
	if (data !== 'undefined') {
		try {
			d = JSON.parse(data);
		} catch (e) {
			console.log('socky barfed on', data);
		}
	}

	return { name: name, data: d };
}

function serialize(name, data) {
	return name.concat(SEPARATOR, JSON.stringify(data));
}

exports.deserialize = deserialize;
exports.serialize = serialize;
