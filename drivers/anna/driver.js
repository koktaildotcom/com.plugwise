"use strict";

var Plugwise = require('plugwise');
var plugwise = '';

var smiles = [];
var annas = [];
var pairing = {};

module.exports = {
        
	init: function( callback ){
		plugwise = new Plugwise;
		callback;
	},
	
	name: {
		set: function( device, name, callback ) {
			// An Anna device does not have a name
		}
	},
	
	capabilities: {
		
		//TODO: TESTING
		measure_temperature: {
			get: function( device, callback ){
				requestTemp( device );
			}
		},
		
		//TODO: TESTING / CLEANUP
		target_temperature: {
		    get: function(device, temperature, callback){ 
		        // device_data is the object as saved during pairing
		        var anna = device;
				
				//update anna with a new temperature
				var temp = changeTemp( device, temperature );
				console.log('Temperature changed to: ' + temp);
				
		        // send the anna to Homey
		        if( typeof callback == 'function' ) {
		            callback( anna );
		        }
	    	}
		}
	},
	
	pair: {
		start: function(callback, event, data){			
			plugwise.find('smile', function(plugwise_devices){
				
				plugwise_devices.forEach(function(element) {
					smiles.push({
						ip				: element.addresses[0],
						name			: 'smile'
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
			//TEST
			smiles.push({
				ip				: '192.111.1.1',
				name			: 'smile'
			});
			
			callback(smiles);
		},
		
		list_appliances: function( smile, password, callback ) {
			plugwise.findDevices(smile, password, function(result) {
				callback(result);
			});
		},
	}
}

function changeTemp(device, temperature) {
	var request = require('request');
	var url = 'http://smile:' + device.password + '@' + device.ip + '/core/appliances;id=' + device.id + '/thermostat';
	request({ url: url, method: 'PUT', body : '<thermostat><setpoint>' + temperature + '</setpoint></thermostat>', headers: {'Content-Type': 'text/xml'}}, function(){
		return temperature;
	});
};

function requestTemp(device, temperature) {
	plugwise.findDevices(device.ip, device.password, function(callback) {
		return temperature(callback.filter(function(x){return x.id == device.id})[0].temp);
	});
};