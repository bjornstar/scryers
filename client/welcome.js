// Copyright (C) 2013 Bjorn Stromberg
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
//

var EventEmitter = require('emitter');

exports = module.exports = new EventEmitter();

exports.Welcome = function () {
	var nameDiv = document.getElementById('nameDiv');
	var name = document.getElementById('name');

	nameDiv.style.display = 'block';
	name.focus();

	function attemptRegister(name) {
		exports.hideError();
		exports.emit('register', name);
	}

	var registerButton = document.getElementById('register');

	registerButton.addEventListener('click', function (e) {
		var nameString = name.value;

		// If we have text, try to register.
		if (nameString.length) {
			attemptRegister(nameString);
		}

		e.preventDefault();
		e.stopPropagation();
	}, false);
	return this;
};

exports.show = function() {
	// Show the welcome screen
	var welcome = document.getElementById('Welcome');
	welcome.style.display = '';

	// Show the blocker
	var blocker = document.getElementById('blocker');
	blocker.style.display = '';

	var name = document.getElementById('name');
	name.focus();
};

exports.hide = function() {
	// Hide the welcome screen.
	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	// Hide the blocker.
	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';
};

exports.showError = function (error) {
	// Set the registrationError text
	var registrationError = document.getElementById('registrationError');
	registrationError.textContent = JSON.stringify(error);

	exports.show();
};

exports.hideError = function () {
	// Clear the error text.
	var registrationError = document.getElementById('registrationError');
	registrationError.textContent = '';
};
