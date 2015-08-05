var mdns = require('mdns-js');
var browser = mdns.createBrowser(mdns.tcp("plugwise"));

var plugwise_devices = [];
	
browser.on('ready', function () {
	browser.discover(); 
	console.log('Looking for "' + 'smile' + '" plugwise devices...');
});

browser.on('update', function (data) {
	plugwise_devices.push(data);
});

var device = '';

setTimeout(function() {
	browser.stop();
	device = plugwise_devices.filter(function(x) { return x.txt[0].indexOf('smile') > -1 })[0];
	device.password = 'twnnbmhp';
	device.name = 'smile';
	device.ip = device.addresses[0];
	device.id = '5e6a36869ccb4463b2c9227a9280b154';
	goahead(device);
}, 5000);

function goahead(device){
	var request = require('request');
	console.log(device.ip);
	console.log(device.id);
	var url = 'http://smile:' + 'twnnbmhp' + '@' + device.ip + '/core/appliances;id=' + device.id;
		request({ url: url, method: 'GET', headers: {'Content-Type': 'text/xml'}}, function(error, response, body){
		    
			var XML = require('pixl-xml');
			var doc = XML.parse(body);
			
			var log = doc.appliance.logs.point_log.filter(function(x) { return x.type === 'temperature' })[0];
			console.log(log.period.measurement._Data);
		});

/*
console.log(device);

var url = 'http://' + device.name + ':' + device.password + '@' + device.ip + '/core/appliances';
	request({ url: url, method: 'GET'}, function (error, response, body){
		
		var XML = require('pixl-xml');
	    var doc = XML.parse(body);
		
		var devices = [];
		
		if(doc.appliance instanceof Array){
			doc = doc.appliance;
		} else if (doc.appliance instanceof Object){
			doc = [doc.appliance];
		}
		
		doc.forEach(function(element) {
			var date = new Date();
			date.setTime(date.getTime());
			
			var updated_time = new Date(element.modified_date);
			
			if(element.type == 'thermostat'){
				devices.push({'id': element.id, 'name': element.name, 'temp': element.actuators.thermostat.setpoint});
			} else if (element.type == 'zz_misc' && date.getTime() - updated_time.getTime() < (60 * 1000)){
				devices.push({'id': element.id, 'name': element.name, 'state': element.actuators.relay.state});
			}
		}, this);
		 
		console.log(devices[0].id);
		
		*/
	//});
}

