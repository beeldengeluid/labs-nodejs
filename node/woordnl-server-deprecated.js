/*
 * Woord.nl Node.js server
 * 
 * MP3 staan hier gehost
 * 		http://os-immix-w/woord-nl-mp3/
 * 
 * LEZEN:
 * 		http://expressjs.com/guide.html
 *		http://stackoverflow.com/questions/17690803/node-js-getaddrinfo-enotfound
 * 
 * NERD doc id= 520113
 * 
 * 
 * FEED
 * http://www.nu.nl/feeds/rss/tag/amsterdam.rss
 */


/* Imports */

var http = require('http');
var url = require('url');
var ElasticSearchClient = require('elasticsearchclient');
var querystring = require('querystring');

/* Global vars */

var NERD_API = 'http://nerd.eurecom.fr/api';
var NERD_API_KEY = 'vau6q2safpgd25q4f84k2sqhau3q0v1c';
var ASR_BASE_DIR = 'asr';

var _esClient = new ElasticSearchClient({
    host: 'localhost',
    port: 9200,
});


/* The HTTP server listening to JS client calls */

http.createServer(function (req, res) {
	var url_parts = url.parse(req.url, true);
	if (url_parts.query['s']) {
		searchASRIndex(url_parts.query['s'], url_parts.query['callback'], res);
	} else if (url_parts.query['text']) {
		getNERDAnalysis(url_parts.query['text'], url_parts.query['callback'], res);
	} else if (url_parts.query['asr']) {
		getNERDAnalysisOfASRFile(url_parts.query['asr'], url_parts.query['callback'], res);
	}
}).listen(1337, '127.0.0.1');

console.log('Server running at http://127.0.0.1:1337/');


/* Serves the static content */

var express = require('express');
var app = express();
app.use(express.static('../woordnl'));
app.listen(3000);

console.log('Static content served at http://127.0.0.1:3000/');



/*
 * Searches through the ASR index
 */

function searchASRIndex(s, cb, clientResponse) {
	console.log('Looking for ' + s + ' in the ASR index...');
	query = {"query":{"bool":{"must":[{"query_string":{"default_field":"words","query": "\"" + s + "\""}}],"must_not":[],"should":[]}}};

	_esClient.search('woordnl', 'asr_chunk', query)
		.on('data', function(data) {
			cb = cb ? cb : 'service_callback';
			clientResponse.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8'});
			clientResponse.end(cb + '(' + data + ')');
		})
		.on('done', function(){
			//always returns 0 right now			
		})
		.on('error', function(error) {
			console.log(error)
		})
		.exec();
}

/*
 * Analyses a whole ASR file with NERD
 */ 
 
function getNERDAnalysisOfASRFile(asrFile, cb, clientResponse) {
	console.log('Looking for ' + asrFile + ' in the ASR index...');
	query = {"query":{"bool":{"must":[{"query_string":{"default_field":"_id","query": "\"" + asrFile + "\""}}],"must_not":[],"should":[]}}, fields : ["all_words"]};

	_esClient.search('woordnl', 'asr_transcript', query)
		.on('data', function(data) {
			data = JSON.parse(data);
			//console.log(data.hits.hits[0].fields.all_words);
			var words = data.hits.hits[0].fields.all_words;
			getNERDAnalysis(words, cb, clientResponse);
		})
		.on('done', function(){
			//always returns 0 right now			
		})
		.on('error', function(error){
			console.log(error)
		})
		.exec();
}

/*
 * Calls the NERD API to fetch named entities for the given text. This function is actually the first in a chain of API calls.
 * The eventual response is returned in getNERDEntities() (unless an error occurs earlier in the chain). 
 * curl -i -X POST http://nerd.eurecom.fr/api/document -d "uri=http://www.bbc.co.uk/news/world-us-canada-19644448&key=YOUR_API_KEY"
 */
function getNERDAnalysis(text, cb, clientResponse) {
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
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			try {
				respData = JSON.parse(chunk);
				if(respData['idDocument']) {
					getNERDAnnotation(respData['idDocument'], text, cb, clientResponse);
				} else {
					writeClientErrorResponse(clientResponse, cb,  'Could not upload document');
				}
			} catch(e) {
				writeClientErrorResponse(clientResponse, cb, 'Could not upload document');
			}
		}).on('error', function(error) {
			console.log(error)
		});
	});

	//send the request
	req.write(data);
	req.end();
}

/*
 * One of the NERD API calls in the getNERDAnalysis() chain.
 * curl -i -X POST http://nerd.eurecom.fr/api/annotation -d "key=YOUR_API_KEY&idDocument=164&extractor=alchemyapi&ontology=core&timeout=10"
 */
function getNERDAnnotation(docID, text, cb, clientResponse) {
	console.log('getting NERD annotations for: ' + docID);
	var data = querystring.stringify({
		'idDocument' : docID,
		'key' : NERD_API_KEY,
		'extractor' : 'combined',
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
		res.setEncoding('utf8');
		res.on('data', function (data) {
			try{		
				respData = JSON.parse(data);
				if(respData['idAnnotation']) {
					getNERDEntities(respData['idAnnotation'], text, cb, clientResponse);
				} else {
					writeClientErrorResponse(clientResponse, cb, 'Could not get an annotation for document: ' + docID);
				}
			} catch(e) {
				console.log(data);
				writeClientErrorResponse(clientResponse, cb, 'Error while getting the annotations for document: ' + docID);
			}
		}).on('error', function(error) {
			console.log(error)
		});
	});
	
	
	//send the request with the data
	req.write(data);
	req.end();
}

/*
 * The final NERD API call in the getNERDAnalysis() chain. Writes to the clientResponse to return data to the client.
 * curl -i -X GET -H "Accept: application/json" "http://nerd.eurecom.fr/api/entity?key=YOUR_API_KEY&idAnnotation=427"
 */
function getNERDEntities(annotationID, text, cb, clientResponse) {
	console.log('Getting entities for: ' + annotationID);
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
		res.setEncoding('utf8');
		var body = '';
		res.on('data', function (data) {
			body += data;
		}).on('error', function(error) {
			console.log(error)
		}).on('end', function() {			
			entities = JSON.parse(body);			
			resp = {'entities' : entities, 'sourceText' : text}
			cb = cb ? cb : 'service_callback';
			clientResponse.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8'});
			clientResponse.end(cb + '(' + JSON.stringify(resp) + ')');
		});
	});
			
}

/*
 * This function offers a uniform way of returning an error response back to the client.
 */
function writeClientErrorResponse(clientResponse, cb, msg) {
	clientResponse.writeHead(500, {'Content-Type': 'application/json; charset=UTF-8'});
	clientResponse.end(cb + '({"error" : "'+msg+'"})');
}
