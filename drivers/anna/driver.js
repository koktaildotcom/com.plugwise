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
		plugwise = new Plugwise;
		
		if(devices_homey.length > 0) {
			plugwise.getDevices(devices_homey, 'smile', function(result){
				Homey.log(result);
				devices = result;
				callback();
			});
		} else {
			callback();
		}
	},
	
	deleted: function ( device_homey, callback ){
		devices = devices.filter(function(x) { return x.smile.id != device_homey.id });
	},
	
	name: {
		set: function( device, name, callback ) {
			// An Anna device does not have a name
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
					callback(result);
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
	
	pair: {
		start: function(callback, event, data){			
			plugwise.find('smile', function(plugwise_devices){		
				smiles = [];
				
				plugwise_devices.forEach(function(element) {
					smiles.push({
						data: {
							id				: element.host, //SSID
							ip				: element.addresses[0], //IP
							name			: 'smile' //TYPE
						},
						name				: element.host
					});
				}, this);
				
				if(smiles.length > 0){
					callback(true);
				} else {
					callback(false);
				}
			});
		},
	
		list_devices: function(callback, event, data) {
			callback(smiles);
		},
		
		authenticate: function(callback, event, data ) {
			callback(true);
		},
		
		connect: function( callback, event, data ) {
			plugwise.findDevices(data, function(result) {
				devices.push(data);
				callback(result);
			});
		},
	}
}

function setTarget(device, temperature, callback) {
	
	if(temperature > 30){
		temperature = 30;
	}
	
	if(temperature < 4){
		temperature = 4;
	}
	
	var smile = devices.filter(function(x) { return x.id === device.id })[0];
	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna + '/thermostat';
	request({ url: url, method: 'PUT', body : '<thermostat><setpoint>' + temperature + '</setpoint></thermostat>', headers: {'Content-Type': 'text/xml'}}, function(){
		callback(temperature);
	});
};

function getTarget(device, temperature) {
	var smile = devices.filter(function(x) { return x.id === device.id })[0];
	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna;
	request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
	    var doc = XML.parse(body);
		temperature(doc.appliance.actuators.thermostat.setpoint);
	});
};

function measureTemp(device, temperature) {
	var smile = devices.filter(function(x) { return x.id === device.id })[0];
	var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.anna;
	request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
	    var doc = XML.parse(body);
		var temp = doc.appliance.logs.point_log.filter(function(x) { return x.type === 'temperature' })[0];
		temperature(temp.period.measurement._Data);
	});
}