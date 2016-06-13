"use strict";

var PlugwiseAPI = require('plugwise');
var Anna = require('plugwise-anna');

var devices = [];

module.exports.init = function (devices_data, callback) {

	// Loop over installed devices
	for (let i in devices_data) {

		// Set as default offline
		module.exports.setUnavailable(devices_data[i], "Offline");

		// Refresh client
		devices_data[i].client = new Anna(devices_data[i].password, devices_data[i].ip, devices_data[i].id, devices_data[i].hostname);

		// Store device
		devices.push({data: devices_data[i]});

		// Start listening for device events
		listenForEvents(devices_data[i]);
	}

	callback();
};

module.exports.pair = function (socket) {

	socket.on("list_devices", function (data, callback) {

		// Perform local device discovery for smile devices
		PlugwiseAPI.discoverDevices('smile').then(devices => {

			// Create devices response object
			var results = [];
			for (let i in devices) {
				results.push({
					data: {
						id: devices[i].host,
						ip: devices[i].addresses[0],
						hostname: devices[i].host,
						name: 'smile'
					},
					name: devices[i].host
				});
			}

			console.log(`Anna: list ${results.length} devices`);

			// Return response
			callback(null, results);
		});
	});

	socket.on("connect", function (device, callback) {

		console.log("Anna: fetch data from Plugwise API...");

		// Fetch new data from plugwise api
		PlugwiseAPI.fetchData(device).then(devices_data => {
			for (let i in devices_data) {
				if (devices_data[i].type === "thermostat") {

					console.log("Anna: connect to device at " + device.ip);

					var formatted_device = {
						name: "Anna",
						data: {
							ip: device.ip,
							id: devices_data[i].id,
							hostname: device.hostname,
							password: device.password
						}
					};

					// Start listening for device events
					listenForEvents(formatted_device.data);

					// Callback device
					callback(null, formatted_device)

					// Add device to internal list
					devices.push({
						name: "Anna",
						data: {
							ip: device.ip,
							id: devices_data[i].id,
							hostname: device.hostname,
							password: device.password,
							onoff: devices_data[i].onoff,
							target_temperature: devices_data[i].target_temperature,
							measure_temperature: devices_data[i].measure_temperature,
							name: 'smile',
							client: new Anna(device.password, device.ip, devices_data[i].id, device.hostname)
						}
					});
				}
			}
		}).catch(err => {

			console.log("Anna: connect error: " + err);

			// Callback error
			callback(err, false);
		});
	});
};

module.exports.capabilities = {

	target_temperature: {
		get: function (device_data, callback) {
			if (!device_data) callback(true, null);

			// Get device
			var device = getDevice(device_data.id);
			if (device && device.client && device.client.target_temperature) {

				// Callback formatted value
				callback(null, device.client.target_temperature);
			}
			else {
				callback(true, false);
			}
		},
		set: function (device_data, target_temperature, callback) {
			if (!device_data) callback(true, null);

			var device = getDevice(device_data.id);
			if (device && device.client && typeof device.client.setTarget == "function") {

				// Set target temperature on device
				device.client.setTarget(target_temperature, function (err, result) {

					// Callback result
					callback(err, result);
				});
			}
			else {
				callback(true, false);
			}
		}
	},

	measure_temperature: {
		get: function (device_data, callback) {
			if (!device_data) callback(true, null);

			// Get device
			var device = getDevice(device_data.id);
			if (device && device.client && device.client.measure_temperature) {

				// Callback formatted value
				callback(null, device.client.measure_temperature);
			}
			else {
				callback(true, false);
			}
		}
	}
};

function listenForEvents(device_data) {
	if (device_data && device_data.client) {

		var device_data_obj = {
			ip: device_data.ip,
			id: device_data.id,
			hostname: device_data.hostname,
			password: device_data.password
		};

		device_data.client.on("available", function (device_data) {

			console.log("Anna: mark device as available: " + device_data.ip);

			// Mark as available
			module.exports.setAvailable(device_data_obj);

		}).on("unavailable", function (device_data) {

			console.log("Anna: mark device as unavailable: " + device_data.ip);

			// Mark device as unavailable
			module.exports.setUnavailable(device_data_obj, __('pair.auth.smile.unavailable'));

		}).on("target_temperature", function (device_data, temperature) {

			console.log("Anna: emit realtime target temperature update: " + temperature);

			// Emit realtime
			module.exports.realtime(device_data_obj, "target_temperature", temperature);

		}).on("measure_temperature", function (device_data, temperature) {

			console.log("Anna: emit realtime measure temperature update: " + temperature);

			// Emit realtime
			module.exports.realtime(device_data_obj, "measure_temperature", temperature);
		});
	}
}

module.exports.deleted = function (device) {

	// Remove device from internal list
	devices = devices.filter(function (x) {
		return x.id != device.id
	});
};

function getDevice(device_id) {
	var found = devices.filter(function (x) {
		return x.data.id === device_id
	});

	if (found.length >= 0 && found[0].data) {
		return found[0].data;
	}
	else {
		return new Error("invalid_device");
	}
}