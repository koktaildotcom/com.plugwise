"use strict";

var mdns = require('mdns-js');
var browser = mdns.createBrowser(mdns.tcp("plugwise"));
var devices = [];

var self = module.exports = {

	init: function () {
		Homey.log("Plugwise app started");

		browser.on('ready', function () {
			console.log('Ready');
			browser.discover();
		});

		browser.on('update', function (data) {
			devices.push(data);
			console.log('devices', devices)
		});
	},

	getDevices: function(device_type, callback) {
		console.log('devices', devices)
		console.log('arguments', arguments);
		
		setTimeout(function() {
			return callback(devices.filter(function(x) { return x.txt[0].indexOf(device_type) > -1 }));
		}, 1000); //Wait 1 sec to make sure devices is ready
	}
}