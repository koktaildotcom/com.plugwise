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
		plugwise = new Plugwise;		
		var devices_smile = devices_homey.filter(function(x) { return x.id.indexOf('stretch') > -1 });
				
		if(devices_smile.length > 0) {
			plugwise.getDevices(devices_smile, 'stretch', function(result){
				if(result === false)
					return callback();
				
				devices = result;				
				callback();
			});
		} else {
			callback();
		}
		
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
	
	pair: {	
		start: function( callback, event, data ) {
			plugwise.find('stretch', function(plugwise_devices){
				stretches = [];
				list_appliance = false;
				
				plugwise_devices.forEach(function(element) {
					stretches.push({	
						data: {					
							id				: element.host, //SSID
							ip				: element.addresses[0], //IP
							name			: 'stretch' //TYPE
						}, 
						name				: element.host
					});
				}, this);
				
				if(stretches.length > 0){
					callback(true);
				} else {
					callback(false);
				}
			});
		},
		
		list_devices: function(callback, event, data) {
			if(list_appliance == true)
				return callback(appliances);
				
			return callback(stretches);
		},
		
		authenticate: function(callback, event, data) {
			callback(true);
		},
		
		connect: function(callback, event, data) {
			plugwise.findDevices(data.stretch, function(result) {
				result.forEach(function(element) {
					appliances.push({
						data: {
							id				: element.id, //STRETCH APPLIANCE ID
							name			: 'appliance'
						},
						name				: element.name
					});
				}, this);
				callback(result);
			});
		},
		
		list_appliances: function(callback, event, data) {
			callback(appliances);
		},
		
		add_device: function(callback, event, data){
			
			var obj = {
				'id' : data.stretch.id,
				'stretch' : data.device.data.id,
				'password' : data.stretch.password,
				'ip' : data.stretch.ip,
			}
			devices.push(obj);
			callback(true);
		}
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
	var url = 'http://stretch:' + relay.password + '@' + relay.ip + '/core/appliances/' + relay.stretch + '/relay';
	request({ url: url, method: 'PUT', body : '<relay><state>' + toggle + '</state></relay>', headers: {'Content-Type': 'text/xml'}}, function(){
		
		module.exports.realtime({
			id: device.id
		}, 'onoff', value);
		callback(value);
	});
};


function requestState(device, callback) {
	
	var relay = devices.filter(function(x) { return x.id === device.id })[0];
	
	var url = 'http://stretch:' + relay.password + '@' + relay.ip + '/core/appliances/' + relay.stretch;
	request({ url: url, method: 'GET' }, function(error, response, body){
		if(error) {
				console.log("Could not get external location." );
		} else{
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
   	setTimeout(pollToggles, 3000);
}