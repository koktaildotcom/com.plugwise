"use strict";

var mdns = require('mdns-js');
var browser = mdns.createBrowser(mdns.tcp("plugwise"));
var devices = [];

var self = module.exports = {

	init: function () {
		browser.on('ready', function () {
			browser.discover();
		});

		browser.on('update', function (data) {
			devices.push(data);
		});
	},

	getDevices: function() {
		setTimeout(function() {
			return callback(devices.filter(function(x) { return x.txt[0].indexOf(device_type) > -1 }));
		}, 10000);
	}
}