var http = require('http'),
	url = require('url'),	
	querystring = require('querystring'),
	queryAnalyzer = require('../tools/query-analyzer');

var NERD_API = 'http://nerd.eurecom.fr/api';
var NERD_API_KEY = 'vau6q2safpgd25q4f84k2sqhau3q0v1c';

module.exports = {

	/*
	 * Calls the NERD API to fetch named entities for the given text. This function is actually the first in a chain of API calls.
	 * The eventual response is returned in getNERDEntities() (unless an error occurs earlier in the chain). 
	 * curl -i -X POST http://nerd.eurecom.fr/api/document -d "uri=http://www.bbc.co.uk/news/world-us-canada-19644448&key=YOUR_API_KEY"
	 */
	executeNEROnText : function(text, callerObj, callback) {
		var self = this;
		var data = querystring.stringify({
			'text' : text,
			'key' : NERD_API_KEY
		});
		
		var options = {
			host: 'nerd.eurecom.fr',
			port: 80,
			path: '/api/document',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length //avoids getting a chunked response
	      	}
		};
	
		var req = http.request(options, function(res) {
			var respData = null;
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				try {
					respData = JSON.parse(chunk);					
				} catch(e) {
					console.log('error 1');
					console.log(e);
					callback(callerObj, null);
				}
				if(respData && respData['idDocument']) {					
					self.getNERDAnnotation(respData['idDocument'], text, callerObj, callback);
				} else {
					callback(callerObj, null);
				}
			}).on('error', function(error) {
				console.log('error 2');
				console.log(error);
				callback(callerObj, null);
			});
		});
	
		//send the request
		req.write(data);
		req.end();
	},

	/*
	 * One of the NERD API calls in the getNERDAnalysis() chain.
	 * curl -i -X POST http://nerd.eurecom.fr/api/annotation -d "key=YOUR_API_KEY&idDocument=164&extractor=alchemyapi&ontology=core&timeout=10"
	 */
	getNERDAnnotation : function(docID, text, callerObj, callback) {		
		var self = this;
		var data = querystring.stringify({
			'idDocument' : docID,
			'key' : NERD_API_KEY,
			//combined, alchemyapi, dbspotlight, extractiv, lupedia, opencalais, saplo, semitags, textrazor, thd, wikimeta, yahoo, zemanta
			'extractor' : 'textrazor', 
			'timeout' : '8'
		});
		
		var options = {
			host: 'nerd.eurecom.fr',
			port: 80,
			path: '/api/annotation',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length //avoids getting a chunked response
	      	}
		};
		
		var req = http.request(options, function(res) {
			var respData = null;
			res.setEncoding('utf8');
			res.on('data', function (data) {
				try{		
					respData = JSON.parse(data);					
				} catch(e) {
					console.log('error 3');
					console.log(e);
					console.log(data);
					callback(callerObj, null);
				}
				if(respData && respData['idAnnotation']) {
					self.getNERDEntities(respData['idAnnotation'], text, callerObj, callback);
				} else {
					callback(callerObj, null);
				}
			}).on('error', function(error) {
				console.log('error 4');
				console.log(error);
				callback(callerObj, null);
			});
		});
		
		
		//send the request with the data
		req.write(data);
		req.end();
	},

	/*
	 * The final NERD API call in the getNERDAnalysis() chain. Writes to the clientResponse to return data to the client.
	 * curl -i -X GET -H "Accept: application/json" "http://nerd.eurecom.fr/api/entity?key=YOUR_API_KEY&idAnnotation=427"
	 */
	getNERDEntities : function(annotationID, text, callerObj, callback) {		
		var self = this;
		var data = querystring.stringify({
			'key' : NERD_API_KEY,
			'idAnnotation' : annotationID
		});
		
		var options = {
			host: 'nerd.eurecom.fr',
			port: 80,
			path: '/api/entity?' + data ,
			headers: {
				'Accept' : 'application/json'
	      	}
		};
			
		var req = http.get(options, function(res) {
			var body = '';
			res.setEncoding('utf8');			
			res.on('data', function (data) {
				body += data;
			}).on('error', function(error) {
				console.log('error 5');
				console.log(error);
				callback(callerObj, null);
			}).on('end', function() {
				callback(callerObj, {'entities' : self.getNormalizedEntities(JSON.parse(body)), 'sourceText' : text});
			});
		});
	}, 
	
	getNormalizedEntities : function(nerdData) {
		var entities = {};
		var type = null;
		var label = null;
		for (e in nerdData) {
			type = queryAnalyzer.getNormalizedEntityType(nerdData[e].nerdType, 'nerd');
			label = queryAnalyzer.getNormalizedEntityLabel(nerdData[e].label);
			if(entities[type]) {
				if(entities[type].indexOf(label) == -1) {
					entities[type].push(label);
				}
			} else {
				entities[type] = [label];
			}
		}
		return entities;
	}

}