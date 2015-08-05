/* global Homey */
"use strict";

var XML = require('pixl-xml');
var request = require('request');
var Plugwise = require('plugwise');
var plugwise = '';

var smiles = [];
var pairing = {};

module.exports = {
        
	init: function( devices, callback ){
		plugwise = new Plugwise;
		callback();
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
				setTarget( device, target_temperature, callback );
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
				callback(result);
			});
		},
	}
}

function setTarget(device, temperature, callback) {
	plugwise.getDevice(device, function(smile){
		var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.id + '/thermostat';
		request({ url: url, method: 'PUT', body : '<thermostat><setpoint>' + temperature + '</setpoint></thermostat>', headers: {'Content-Type': 'text/xml'}}, function(){
			return callback(temperature);
		});
	});
};

function getTarget(device, temperature) {
	plugwise.getDevice(device, function(smile){
		var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.id;
		request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
		    var doc = XML.parse(body);
			return temperature(doc.appliance.actuators.thermostat.setpoint);
		});
	});
};

function measureTemp(device, temperature) {
	plugwise.getDevice(device, function(smile){
		var url = 'http://smile:' + smile.password + '@' + smile.ip + '/core/appliances;id=' + smile.id;
		request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
		    var doc = XML.parse(body);
			var temp = doc.appliance.logs.point_log.filter(function(x) { return x.type === 'temperature' })[0];
			return temperature(temp.period.measurement._Data);
		});
	});
}