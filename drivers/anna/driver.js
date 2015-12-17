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
		Homey.log("Anna driver started", devices_homey);

		devices = devices_homey;
		Homey.log('Anna driver devices', devices);
		
		plugwise = new Plugwise;		
		var devices_smile = devices_homey.filter(function(x) { return x.id.indexOf('smile') > -1 });
				
		if(devices_smile.length > 0) {
			plugwise.getDevices(devices_smile, 'smile', function(result){
				console.log("THESE ARE THE ARGUMENTS:", arguments);
				if(result === false)
					return callback();
				
				devices = result;				
				callback();
			});
		} else {
			callback();
		}

		pollTemperature();		
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
				console.log(arguments);
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
					console.log("I PUSHED THE FOLLOWING DEVICES: ", devices);
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
			if (error)
				return error;
				module.exports.setUnavailable( device, __('error.unavailable'), callback );
			
			module.exports.realtime({
				id: device.id
			}, 'target_temperature', temperature);
			callback(temperature);
		});
	});	
};

function getTarget(device, callback) {
	console.log("GET TARGET DEVICES:", devices);
	var smile = devices.filter(function(x) { return x.id === device.id })[0];
	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna;
	request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
		if (error)
			return error;
			module.exports.setUnavailable( device, __('error.unavailable'), callback );

	    var doc = XML.parse(body);
		var temperature = doc.appliance.actuators.thermostat.setpoint;
		
		module.exports.realtime({
			id: device.id
		}, 'target_temperature', temperature);
		callback(temperature);
	});
};

function measureTemp(device, callback) {
	var smile = devices.filter(function(x) { return x.id === device.id })[0];
	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna;
	request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
		if (error)
			return error;
			module.exports.setUnavailable( device, __('error.unavailable'), callback );

	    var doc = XML.parse(body);
		var temp = doc.appliance.logs.point_log.filter(function(x) { return x.type === 'temperature' })[0];
		callback(temp.period.measurement._Data);
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
   	//setTimeout(pollTemperature, 3000);
}