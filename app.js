"use strict";
  
var mdns = require('mdns-js');
var browser = mdns.createBrowser(mdns.tcp("plugwise"));
var devices = [];
	
function App() 
{
	
}

module.exports = App;

App.prototype.init = function(){
	
	browser.on('ready', function () {
		browser.discover();
	});

	browser.on('update', function (data) {
		devices.push(data);
	});
}

App.prototype.getDevices = function(device_type, callback){
	setTimeout(function() {
		return callback(devices.filter(function(x) { return x.txt[0].indexOf(device_type) > -1 }));
	}, 5000);
}

App.prototype.poll = function(){
	
}