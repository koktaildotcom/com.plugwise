"use strict"

var driver = require('../drivers/stretch/driver');

driver.init( function( result ) {} );
driver.pair.start( function() {} );

driver.pair.list_plugwises( function( callback ) {
	console.log('\nI found these Plugwise Stretch devices:');
	console.log(callback);
	
	if(callback !== undefined) {
		//select a smile that is not already active
		var smile = callback[0];
		
		//request password
		var password = 'hdrvdbzn';
		
		//list appliances
		driver.pair.list_appliances( smile, password, function( result ) {
			console.log('\nI found these connected devices:');
			console.log(result);
			
			//ADD DEVICE TO HOMEY WITH IP, PASSWORD & ID
			//DEVICES HOWEVER CAN CHANGE IP, SO LET'S SAVE MAC ADDRESS INSTEAD AND MAKE A FIND FUNCTION FOR THE DEVICE
			
			var device = {
				password		: password,
				id				: result[0].id,
				ip				: smile.ip
			};
			
			requestState(device, function(r1){
				console.log(r1);
				
				toggleOnOff(device, 'on', function(r2){
					console.log(r2);
					
					requestState(device, function(r3){
						console.log(r3);
					});
				});
			});
		});
	}
});

function toggleOnOff(device, toggle, callback) {
	var request = require('request');
	var url = 'http://stretch:' + device.password + '@' + device.ip + '/core/appliances/' + device.id + '/relay';
	request({ url: url, method: 'PUT', body : '<relay><state>' + toggle + '</state></relay>', headers: {'Content-Type': 'text/xml'}}, function(){
		callback(toggle);
	});
};

function requestState(device, callback) {
	var url = 'http://stretch:' + device.password + '@' + device.ip + '/core/appliances/' + device.id;
	
	var request = require('request');
	request({ url: url, method: 'GET' }, function(error, response, body){
		if(error) {
				console.log("Could not get external location." );
		} else{
			var XML = require('pixl-xml');
		    var doc = XML.parse(body);
			callback(doc.appliance.actuators.relay.state);
		}
	});
};