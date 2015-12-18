"use strict";

var XML = require('pixl-xml');
var request = require('request');
var Plugwise = require('plugwise');
var plugwise = '';

var current_stretch;
var stretches = [];
var appliances = [];
var pairing = {};
var list_appliance = false;

var devices = [];

module.exports = {
        
	init: function( devices_homey, callback ){
		Homey.log("Stretch driver started");

		devices = devices_homey;

		plugwise = new Plugwise;

		pollToggles();	

			plugwise.getDevices(devices_homey, 'stretch', function(result){
				if(result === false)
					return callback();
				
				devices = result;				
				callback();
			});
			
	},
		
	deleted: function ( device_homey, callback ){
		devices = devices.filter(function(x) { return x.id != device_homey.id });
	},
	
	name: {
		set: function( device, name, callback ) {
			
		}
	},
	
	capabilities: {
		onoff: {
			get: function( device, callback ){
				requestState( device, function(result) {
					return callback(result);
				});
			},
			set: function( device, value, callback ){
				toggleOnOff( device, value, function(result) {
					return callback(result);
				});
			}
		}
	},
	
	pair: function (socket) {
		socket.on ( "start", function( data, callback ){
			plugwise.find('stretch', function(plugwise_devices){
				stretches = [];
				list_appliance = false;
				
				plugwise_devices.forEach(function(element) {
					stretches.push({	
						data: {
							id: 	element.host, //SSID
							ip: 	element.addresses[0], //IP
							name: 	'stretch' //TYPE
						},
						name: 		element.host
					});
				}, this);
				
				if(stretches.length > 0){
					callback(null, true);
				} else {
					callback(null, false);
				}
			});
		}),
		
		socket.on ( "list_devices", function( data, callback ){
			return callback(null, appliances);
		}),
		
		socket.on ( "authenticate", function( data, callback ){
			callback(null, true);
		}),
		
		socket.on ( "connect", function( data, callback ){
			stretches.forEach(function(stretch) {

				var combined_stretch = {
					id: stretch.data.id,
					ip: stretch.data.ip,
					name: stretch.data.name,
					password: data.stretch.password,
					ssid: data.stretch.ssid
				}

				plugwise.findDevices(combined_stretch, function(err, result) {
					if (err) {
						callback (err, null);
					} else {
						result.forEach(function(element) {
							appliances.push({
								data: {
									id				: element.id, //STRETCH APPLIANCE ID
									name			: element.name,
									ip  			: stretch.data.ip,
									password        : data.stretch.password, 
								},
								name				: element.name
							});
						}, this);
						callback(null, result);
					}
				});
			});
		}),
		
		socket.on ( "add_device", function( data, callback ){
			devices.push(data.data);
			callback(null, true);
		})
	}	
}

function toggleOnOff(device, value, callback) {
	
	var toggle;
	
	if(value) {
		toggle = 'on';
	} else {
		toggle = 'off';
	}
	
	var relay = devices.filter(function(x) { return x.id === device.id })[0];
	var url = 'http://stretch:' + relay.password + '@' + relay.ip + '/core/appliances/' + relay.id + '/relay';
	request({ url: url, method: 'PUT', body : '<relay><state>' + toggle + '</state></relay>', headers: {'Content-Type': 'text/xml'}}, function(){
		
		module.exports.realtime({
			id: device.id
		}, 'onoff', value);
		callback(value);
	});
};


function requestState(device, callback) {

	var relay = devices.filter(function(x) { return x.id === device.id })[0];
	
	var url = 'http://stretch:' + relay.password + '@' + relay.ip + '/core/appliances/' + relay.id;
	request({ url: url, timeout: 2000, method: 'GET' }, function(error, response, body){
		if (error) { //Could not find device, try to get the correct IP address
			module.exports.setUnavailable( device, __('pair.auth.smile.unavailable'), callback );

			Homey.app.refreshIp('smile', function(result){
				if (result != false) { //If something found
					devices.forEach(function(device) {
						if (result.host == device.id && device.ip != result.address[0]) { //If matches the host and IP addresses are not the same
							device.ip = result.address[0]; //Set new IP
							module.exports.setAvailable( device, callback ); //And make it available again
						}
					}, this);
				}
			});
			return error;
		} else {
			module.exports.setAvailable( device, callback );

		    var doc = XML.parse(body);
			
			module.exports.realtime({
				id: device.id
			}, 'onoff', doc.appliance.actuators.relay.state);
			
			callback(doc.appliance.actuators.relay.state);
		}
	});
};

function pollToggles(){

	try {
		devices.forEach(function(element) {
			requestState(element, function(callback) {
				
			});
		}, this);
	}
	catch(err) { }
   	setTimeout(pollToggles, 30000); //30 sec
}