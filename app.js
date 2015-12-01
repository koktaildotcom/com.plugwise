"use strict";

var mdns = require('mdns-js');
var browser = mdns.createBrowser(mdns.tcp("plugwise"));
var devices = [];

var self = module.exports = {

	init: function () {
		Homey.log("Plugwise app started");

		browser.on('ready', function () {
			browser.discover();
		});

		browser.on('update', function (data) {
			devices.push(data);
		});
	},

	getDevices: function(devices, device_type, callback) {
		console.log(arguments);
		setTimeout(function() {
			return callback(devices.filter(function(x) { return x.txt[0].indexOf(device_type) > -1 }));
		}, 10000);
	}
}