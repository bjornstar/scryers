const SEPARATOR = ':';

function deserialize(str) {
	const dataAfter = str.indexOf(SEPARATOR);
	const name = str.substring(0, dataAfter);
	const rawData = str.substring(dataAfter + 1)

	let data;
	if (rawData !== 'undefined') {
		try {
			data = JSON.parse(rawData);
		} catch (e) {
			console.error('socky barfed on', rawData);
		}
	}

	return { name, data };
}

function serialize(name, data) {
	return `${name}${SEPARATOR}${JSON.stringify(data)}`;
}

exports.deserialize = deserialize;
exports.serialize = serialize;
