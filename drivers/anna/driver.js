/* global Homey */
"use strict";

var XML = require('pixl-xml');
var request = require('request');
var Plugwise = require('plugwise');
var plugwise = '';

var smiles = [];
var pairing = {};

var devices = [];

module.exports = {
        
	init: function( devices_homey, callback ){
		Homey.log("Anna driver started");

		devices = devices_homey;
		
		plugwise = new Plugwise;

		var devices_smile = devices_homey.filter(function(x) { return x.id.indexOf('smile') > -1 });

		pollTemperature();
				
		if(devices_smile.length > 0) {
			plugwise.getDevices(devices_smile, 'smile', function(result){
				if(result === false)
					return callback();
				
				devices = result;				
				callback();
			});
		} else {
			callback();
		}
	},
	
	deleted: function ( device_homey, callback ){
		devices = devices.filter(function(x) { return x.id != device_homey.id });
	},
	
	name: {
		set: function( device, name, callback ) {
			
		}
	},
	
	capabilities: {
		target_temperature: {
			get: function( device, callback ){
				getTarget( device, function(target){
					return callback( target );
				});
			},
			set: function( device, target_temperature, callback ){
				setTarget( device, target_temperature, function(result){
					return callback(result);
				});
			}
		},
		measure_temperature: {
			get: function( device, callback ){
				measureTemp( device, function(temp){
					return callback( temp );
				});
			}
		}
	},
	
	pair: function (socket) {
		socket.on ( "start", function( data, callback ){
			plugwise.find('smile', function(plugwise_devices){
				smiles = [];
				
				plugwise_devices.forEach(function(element) {
					smiles.push({
						data: {
							id: 	element.host, //SSID
							ip: 	element.addresses[0], //IP
							name: 	'smile' //TYPE
						},
						name: 		element.host
					});
				}, this);
				
				if(smiles.length > 0){
					callback(null, true);
				} else {
					callback(null, false);
				}
			});
		}),
	
		socket.on ( "list_devices", function( data, callback ){
			callback(null, smiles);
		}),
		
		socket.on ( "authenticate", function( data, callback ){
			callback(null, true);
		}),
		
		socket.on ( "connect", function( data, callback ){
			plugwise.findDevices(data.smile, function(err, result) {
				if (err) {
					callback (err, null);
				} else {
					var device = {
						'id' : data.smile.id,
						'anna' : result[0].id,
						'password' : data.smile.password,
						'ip' : data.smile.ip
					}

					devices.push(device);
					callback(null, result);
				}
			});
		})
	}
}

function setTarget(device, input, callback) {
	validate(input, function(temperature){		
		var smile = devices.filter(function(x) { return x.id === device.id })[0];
		var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna + '/thermostat';
		request({ url: url, method: 'PUT', body : '<thermostat><setpoint>' + temperature + '</setpoint></thermostat>', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
			if (error) {
				return error;
				module.exports.setUnavailable( device, __('pair.stretch.unavailable'), callback );
			} else {

				module.exports.realtime({
					id: device.id
				}, 'target_temperature', temperature);
				callback(temperature);
			}
		});
	});	
};

function getTarget(device, callback) {

	var smile = devices.filter(function(x) { return x.id === device.id })[0];

	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna;
	request({ url: url, timeout: 2000, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){ //Timout 2000 to make a quick time-out if not found
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
			var temperature = doc.appliance.actuators.thermostat.setpoint;
			
			module.exports.realtime({
				id: device.id
			}, 'target_temperature', temperature);
			callback(temperature);
		}
	});
};

function measureTemp(device, callback) {

	var smile = devices.filter(function(x) { return x.id === device.id })[0];

	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna;
	request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
		if (error) {	
			return error;
		} else {

	    var doc = XML.parse(body);
		var temp = doc.appliance.logs.point_log.filter(function(x) { return x.type === 'temperature' })[0];
		callback(temp.period.measurement._Data);
		}
	});
}

function validate(temperature, callback){

	if(temperature > 30){
		return callback(30);
	}
	else if(temperature < 4){
		return callback(4);
	} else {	
		callback(Math.round(temperature * 2) / 2);
	}	
}

function pollTemperature(){

	try {
		devices.forEach(function(element) {
			getTarget(element, function(callback) {
				
			});
		}, this);
	}
	catch(err) { }
   	setTimeout(pollTemperature, 30000); //30 sec
}