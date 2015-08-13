"use strict";

var XML = require('pixl-xml');
var request = require('request');
var Plugwise = require('plugwise');
var plugwise = '';

var current_stretch;
var stretches = [];
var appliances = [];
var pairing = {};

var devices = [];

module.exports = {
        
	init: function( devices_homey, callback ){
		plugwise = new Plugwise;
		if(devices_homey.filter(function(x) { return x.id.indexOf('stretch') > -1 }).length > 0) {
			plugwise.getDevices(devices_homey, 'stretch', function(result){
				devices = result;
				callback();
			});
		} else {
			callback();
		}
		
		pollToggles();		
	},
		
	deleted: function ( device_homey, callback ){
		devices = devices.filter(function(x) { return x.smile.id != device_homey.id });
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
		start: function( callback ) {
			plugwise.find('stretch', function(plugwise_devices){
				stretches = [];
				
				plugwise_devices.forEach(function(element) {
					stretches.push({	
						data: {					
							id				: element.host, //SSID
							ip				: element.addresses[0], //IP
							name			: 'stretches' //TYPE
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
			callback(stretches);
		},
		
		authenticate: function(callback, event, data) {
			callback(true);
		},
		
		connect: function(callback, event, data) {
			plugwise.findDevices(data, function(result) {
				appliances.push(data);
				callback(result);
			});
		},
		
		list_appliances: function(callback, event, data) {
			//current_stretch = data;
			callback(appliances);
		},
		
		add_device: function(callback, event, data){
			devices.push(data);
			//callback(current_stretch);
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
	request({ url: url, method: 'GET' }, function(error, response, body){
		if(error) {
				console.log("Could not get external location." );
		} else{
		    var doc = XML.parse(body);
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