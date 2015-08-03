"use strict"

var driver = require('../drivers/anna/driver');

driver.init( function( result ) {} );
driver.pair.start( function() {} );

driver.pair.list_plugwises( function( callback ) {
	console.log('\nI found these devices:');
	console.log(callback);
	
	if(callback !== undefined) {
		//select a smile that is not already active
		var smile = callback[0];
		
		//request password
		var password = 'twnnbmhp';
		
		//list appliances
		driver.pair.list_appliances( smile, password, function( result ) {
			console.log('\nI found this Anna:');
			console.log(result[0]);
			
			//ADD DEVICE TO HOMEY WITH IP, PASSWORD & ID
			//DEVICES HOWEVER CAN CHANGE IP, SO LET'S SAVE MAC ADDRESS INSTEAD AND MAKE A FIND FUNCTION FOR THE DEVICE
			
			var device = {
				password		: password,
				id				: result[0].id,
				ip				: smile.ip
			};
			
			
			
		});
	}
});