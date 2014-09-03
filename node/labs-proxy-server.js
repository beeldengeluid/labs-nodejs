/**
 * https://blog.nodejitsu.com/node-http-proxy-1dot0/
 */

var httpProxy = require('http-proxy'),
	http = require('http'),
	fs = require("fs"),
	yaml = require('js-yaml'),
	url = require('url');


//**************************************************************************************************************
//READ CONFIGURATION FROM YAML
//**************************************************************************************************************

try {
	CONFIG = yaml.safeLoad(fs.readFileSync('./config/labs-config.yml', 'utf8'));
	console.log(CONFIG);
} catch (e) {
	console.log(e);
}

//**************************************************************************************************************
//PROXY SERVER FUNCTIONS
//**************************************************************************************************************


var proxy = httpProxy.createServer();

proxy.on('error', function (err, req, res) {
	console.log(err);
	res.writeHead(500, {
		'Content-Type': 'text/plain'
	});
	res.end('Something went terribly wrong.');
});

http.createServer(function(req, res) {	
	var service = getIntendedServiceFromRequest(req);
	if(service) {
		req.url = removeProxyPrefixFromUrl(req);
		proxy.web(req, res, {
			target: service
		});
	} else {
		res.writeHead(404, {
			'Content-Type': 'text/plain'
		});
		res.end('Invalid service specified.');
	}
}).listen(CONFIG['proxy-server.port']);


function removeProxyPrefixFromUrl(req) {
	var parts = url.parse(req.url).path.split('/');
	parts = parts.splice(2, parts.length);
	return '/' + parts.join('/');
}

/*
 * Returns the correct back-end host, based on the request URL
 */
function getIntendedServiceFromRequest(req) {	
	var parts = url.parse(req.url).path.split('/');			
	//use the first part of the path to get the correct service from the config
	return CONFIG['services'][parts[1]];
}