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
			//console.log('devices', devices)
		});
	},

	getDevices: function(device_type, callback) {		
		console.log("DEVICES:", devices);
		return callback (
			devices.filter(
				function(x) { 
					if (x.txt != null) { //If txt exists (so it a device we are interested in)
						return x.txt[0].indexOf(device_type) > -1
					} else {
						return false;
					}
				}
			)
		)
	}
}