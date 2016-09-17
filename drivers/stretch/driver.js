"use strict";

const PlugwiseAPI = require('plugwise');
const Stretch = require('plugwise-stretch');

var devices = [];

module.exports.init = function (devices_data, callback) {

	// Loop over installed devices
	for (let i in devices_data) {

		// Set as default offline
		module.exports.setUnavailable(devices_data[i], "Offline");
	}

	function reconnectDevices(devices_data) {

		// Create promises array
		let promises = [];
		let stretches = []

		// Loop over stretches
		for (let i in devices_data) {

			// Push fetch data promise to array
			if (stretches.indexOf(devices_data[i].stretch_id) == -1) {
				promises.push(
					PlugwiseAPI.fetchData({
						id: devices_data[i].stretch_id,
						name: devices_data[i].name,
						ip: devices_data[i].ip,
						password: devices_data[i].password
					})
				);

				// Push stretch id
				stretches.push(devices_data[i].stretch_id);
			}
		}

		// Wait for all promises to resolve
		Promise.all(promises).then(values => {

			// Loop over all values
			for (let i in values) {
				let api_devices_data = values[i];

				// Loop over devices in value
				for (let j in api_devices_data) {

					// Check for plug type
					if (api_devices_data[j].type === "plug") {

						// Loop over installed devices
						for (let k in devices_data) {

							// Check for matching device
							if (devices_data[k].id === api_devices_data[j].id) {

								console.log("Stretch: found plug " + api_devices_data[j].name + " mark as available");

								// Mark as available
								module.exports.setAvailable(devices_data[k]);

								// Create new client
								devices_data[k].client = new Stretch(devices_data[k].password, devices_data[k].ip, devices_data[k].id, devices_data[k].hostname);

								// Save device internally
								devices.push(devices_data[k]);

								// Start listening for events
								listenForEvents(devices_data[k]);
							}
						}
					}
				}
			}

			// We are done
			callback(null, true)

		}).catch(err => {

			console.log("Stretch: driver init error: " + err);

			// Reconnect with installed devices
			setTimeout(() => {
				reconnectDevices(devices_data);
			}, 5000);

			callback(null, true);
		});
	}

	// Reconnect with installed devices
	reconnectDevices(devices_data);
};

module.exports.pair = function (socket) {

	let stretches = [];
	let plugs = [];

	socket.on("start", function (data, callback) {

		// Empty stretches array
		stretches = [];

		// Perform local device discovery for stretch devices
		PlugwiseAPI.discoverDevices('stretch').then(devices => {

			// Create devices response object
			for (let i in devices) {
				stretches.push({
					data: {
						id: devices[i].host,
						ip: devices[i].addresses[0],
						hostname: devices[i].host,
						name: 'stretch'
					},
					name: devices[i].host
				});
			}

			console.log(`Stretch: discover ${stretches.length} devices`);

			// Return response
			callback(null, (stretches.length > 0));
		});
	});

	socket.on("authenticate", function (data, callback) {
		callback(null, true);
	});

	socket.on("connect", function (password, callback) {

		console.log("Stretch: fetch data from Plugwise API...");

		// Clear plugs array
		plugs = [];

		// Create promises array
		let promises = [];

		// Loop over stretches
		for (let i in stretches) {

			// Push fetch data promise to array
			promises.push(
				PlugwiseAPI.fetchData({
					id: stretches[i].data.id,
					name: stretches[i].data.name,
					ip: stretches[i].data.ip,
					password: password
				})
			);
		}

		// Wait for all promises to resolve
		Promise.all(promises).then(values => {

			// Loop over all values
			for (let i in values) {
				let devices_data = values[i];

				// Loop over devices in value
				for (let j in devices_data) {

					// Check for plug type
					if (devices_data[j].type === "plug") {

						console.log("Stretch: found plug " + devices_data[j].name);

						// Found plug, push to array
						plugs.push({
							name: devices_data[j].name,
							data: {
								type: 'plug',
								ip: stretches[i].data.ip,
								stretch_id: stretches[i].data.id,
								name: stretches[i].data.name,
								plug_name: devices_data[j].name,
								id: devices_data[j].id,
								password: password,
								hostname: stretches[i].data.hostname
							}
						});
					}
				}
			}

			console.log(`Stretch: found ${plugs.length} plugs`);

			// Return found plugs
			callback(null, plugs);

		}).catch(err => {

			console.log("Stretch: connect error: " + err);

			// Callback error
			callback(err, false);
		});
	});

	socket.on("list_devices", function (data, callback) {

		console.log(`Stretch: list ${plugs.length} plugs`);

		// Return response
		callback(null, plugs);

		// Empty stretches array
		stretches = [];
		plugs = [];
	});

	socket.on("add_device", function (device, callback) {

		if (device && device.data) {

			// Refresh client
			device.data.client = new Stretch(device.data.password, device.data.ip, device.data.id, device.data.hostname);

			// Store device internally
			devices.push(device.data);

			console.log(`Stretch: added plug: ${device.name} on ` + device.data.ip);

			// Start listening for incoming events
			listenForEvents(device.data);

			// Return success
			callback(null, true);
		}
		else {
			callback(true, false);
		}
	});
};

module.exports.capabilities = {

	onoff: {
		get: function (device_data, callback) {
			if (!device_data) callback(true, null);

			// Get device
			var device = getDevice(device_data.id);
			if (device && device.client) {

				// Callback formatted value
				callback(null, device.client.onoff);
			}
			else {
				callback(true, false);
			}
		},
		set: function (device_data, onoff, callback) {
			if (!device_data) callback(true, null);

			// Get device
			var device = getDevice(device_data.id);
			if (device && device.client && typeof device.client.setState === "function") {

				// Set state on device
				device.client.setState(onoff, function (err, result) {

					// Callback formatted value
					callback(err, result);
				});
			}
			else {
				callback(true, false);
			}
		}
	}
};

function listenForEvents(device_data) {
	if (device_data && device_data.client) {

		var device_data_obj = {};

		for (var x in device_data) {
			if (x !== "client") device_data_obj[x] = device_data[x];
		}

		console.log("Stretch: start listening for events on " + device_data.plug_name);

		device_data.client.on("available", function () {

			console.log("Stretch: mark device as available: " + device_data.plug_name + " " + device_data.ip);

			// Mark as available
			module.exports.setAvailable(device_data_obj);

		}).on("unavailable", function () {

			console.log("Stretch: mark device as unavailable: " + device_data.plug_name + " " + device_data.ip);

			// Mark device as unavailable
			module.exports.setUnavailable(device_data_obj, __('pair.auth.stretch.unavailable'));

		}).on("onoff", function (onoff) {

			console.log("Stretch: emit realtime onoff update: " + device_data.plug_name + " " + onoff);

			// Emit realtime
			module.exports.realtime(device_data_obj, "onoff", onoff);

		});
	}
}

module.exports.deleted = function (device) {

	// Get device
	var storedDevice = getDevice(device.id);
	if (storedDevice && storedDevice.client) {
		storedDevice.client.remove();
	}

	// Remove device from internal list
	devices = devices.filter(function (x) {
		return x.id != device.id
	});
};

function getDevice(device_id) {
	return devices.filter(function (x) {
		return x.id === device_id
	})[0];
}