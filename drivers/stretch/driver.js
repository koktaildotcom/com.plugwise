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
		Homey.log("Stretch driver started", devices_homey);

		devices = devices_homey;

		plugwise = new Plugwise;		

			plugwise.getDevices(devices_homey, 'stretch', function(result){
				if(result === false)
					return callback();
				
				devices = result;				
				callback();
			});
		
		pollToggles();		
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
				console.log("set Unavailable");
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
			console.log("pair: start");
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
			console.log("pair: authenticate");
			callback(null, true);
		}),
		
		socket.on ( "connect", function( data, callback ){
			console.log("pair: connect");
			stretches.forEach(function(stretch) {

				var combined_stretch = {
					id: stretch.data.id,
					ip: stretch.data.ip,
					name: stretch.data.name,
					password: data.stretch.password,
					ssid: data.stretch.ssid
				}

				plugwise.findDevices(combined_stretch, function(err, result) {
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
				});
			});
		}),
		
		socket.on ( "add_device", function( data, callback ){
			console.log("pair: add_device");
			console.log(data);

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
	
	console.log('device.id', device.id);

	console.log('devices', devices);

	var relay = devices.filter(function(x) { return x.id === device.id })[0];

	console.log('relay', relay);
	
	var url = 'http://stretch:' + relay.password + '@' + relay.ip + '/core/appliances/' + relay.id;
	request({ url: url, timeout: 2000, method: 'GET' }, function(error, response, body){
		if (error) { //Could not find device, try to get the correct IP address
			module.exports.setUnavailable( device, __('pair.auth.stretch.unavailable'), callback );
			Homey.app.refreshIp('stretch', function(result){
				if (result != []) {
					devices.forEach(function(device) {
						if (result.host == device.id) {
							device.ip = result.address[0]; //Set new IP
						}
					}, this);

					clearTimeout(Homey.app.refreshIp, 3000);
					module.exports.setAvailable( device, callback );
				} else {
					setTimeout(Homey.app.refreshIp, 3000);
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
   	//setTimeout(pollToggles, 3000);
}