"use strict";

var XML = require('pixl-xml');
var request = require('request');
var Plugwise = require('plugwise');
var plugwise = '';

var stretches = [];

module.exports = {
        
	init: function( callback ){
		plugwise = new Plugwise;
		callback;
	},
	
	name: {
		set: function( device, name, callback ) {
			// A Stretch device does not have a name
		}
	},
	
	capabilities: {
		off: {
			set: function( device, callback ){
				toggleOnOff( device, 'off' );
			}
		},
		on: {
			set: function( device, callback ){
				toggleOnOff( device, 'on' );
			}
		},
		check: {
			get: function( device, callback ){
				callback( requestState( device ) );
			}
		},
	},
	
	pair: {
		start: function(){
			console.log('Home Stretch 2.0 pairing has started');
		},
	
		list_plugwises: function( callback ) {
			plugwise.find('stretch', function(plugwise_devices){
				var devices = [];
				
				plugwise_devices.forEach(function(element) {
					devices.push({
						ip				: element.addresses[0],
						name			: 'stretch'
					});
				}, this);
				
				if(devices.length > 0){
					callback( devices );
				} else {
					console.log( 'No items found' );
					callback();
				}
				
			});
		},
		
		list_appliances: function( stretch, password, callback ) {
			plugwise.findDevices(stretch, password, function(result) {
				callback(result);
			});
		},
	}
}

function toggleOnOff(device, toggle, callback) {
	var url = 'http://stretch:' + device.password + '@' + device.ip + '/core/appliances/' + device.id + '/relay';
	request({ url: url, method: 'PUT', body : '<relay><state>' + toggle + '</state></relay>', headers: {'Content-Type': 'text/xml'}}, function(){
		callback(toggle);
	});
};

function requestState(device, callback) {
	var url = 'http://stretch:' + device.password + '@' + device.ip + '/core/appliances/' + device.id;
	request({ url: url, method: 'GET' }, function(error, response, body){
		if(error) {
				console.log("Could not get external location." );
		} else{
		    var doc = XML.parse(body);
			callback(doc.appliance.actuators.relay.state);
		}
	});
};