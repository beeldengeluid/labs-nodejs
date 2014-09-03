/*
 * http://xtas.net/documentation/xTas_API_documentation.html
 * TODO check:
 * https://github.com/NLeSC/xtas/
 * */

var http = require('http'),
	url = require('url'),	
	querystring = require('querystring'),
	queryAnalyzer = require('../tools/query-analyzer');

var XTAS_HOST = 'api.xtas.net';
var XTAS_PORT = 8000;
var XTAS_API_KEY = 'bg-78943';

module.exports = {
	
	/**
	 * This function chains two xTas functions, namely uploadDocument() and processDocument() and returns 
	 * named entities processed by xTas NER for the specified text.
	 */
	executeNEROnText : function(docID, text, tags, callerObj, callback) {
		var self = this;
		self.uploadDocument(docID, text, tags, callerObj, function(obj, resp) {
			if (resp != null) {
				self.processDocument(docID, 'ner(stanford,descriptive)', callerObj, function(o, xtasData) {
					if(xtasData && xtasData.status == 'ok') {
						callback(o, {'entities' : self.getNormalizedEntities(xtasData), 'sourceText' : text});
					} else {
						console.log('Could not find anything for: ' + docID);
						callback(o, null);
					}
				});
			} else {
				console.log('Could not execute ner on: ' + docID);
				callback(callerObj, null);
			}
		});
		
	},
	
	getNormalizedEntities : function(xtasData) {
		var entities = {};
		var type = null;
		var label = null;
		for (e in xtasData.result) {
			type = queryAnalyzer.getNormalizedEntityType(xtasData.result[e][3].NE, 'xtas');
			label = queryAnalyzer.getNormalizedEntityLabel(xtasData.result[e][0]);
			if(entities[type]) {
				if(entities[type].indexOf(label) == -1) {
					entities[type].push(label);
				}
			} else {
				entities[type] = [label];
			}
		}
		return entities;
	},
	    
	/**
	* REQUEST => curl "http://api.xtas.net:8000/api/doc?key=bg-78943"
	* RESPONSE => {"status": "ok", "result": {"count": 2, "docs": ["testdoc", "abc"]}}
	*/
	getAccountStatus : function(callback) {	    
	    var options = {
			host: XTAS_HOST,
			port: XTAS_PORT,
			path: '/api/doc?key=' + XTAS_API_KEY,
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
				console.log(error);
				callback(null);
			}).on('end', function() {				
				callback(JSON.parse(body));
			});
		});
	},
		    
    /**
    * REQUEST => curl http://api.xtas.net:8000/api/doc -F key=bg-78943 -F id='bg1' -F document=@asrtest.txt -F tags=test
    * -F metadata='{"language" : "nl", "whatever" : "else"}'
    * RESPONSE => {"status": "ok", "result": {"id": "abc"}}
    */
    uploadDocument : function(docID, text, tags, callerObj, callback) {
		var data = querystring.stringify({
			'key' : XTAS_API_KEY,
			'id' : docID,
			'tags' : tags,
			'metadata' : '{"language" : "nl"}', //TODO make this configurable later on
			'document' : text
		});
		
		var options = {
			host: XTAS_HOST,
			port: XTAS_PORT,
			path: '/api/doc',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length, //avoids getting a chunked response
				'Accept' : 'application/json'
	      	}
		};
	
		var req = http.request(options, function(res) {
			var respData = null;
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				try {
					respData = JSON.parse(chunk);					
				} catch(e) {
					console.log(e);
					callback(callerObj, null);
				}
				if(respData) {					
					callback(callerObj, respData);					
				} else {
					callback(callerObj, null);
				}
			}).on('error', function(error) {
				console.log(error);
				callback(callerObj, null);
			});
		});
	
		//send the request
		req.write(data);
		req.end();
	},
		    
		    
    /**
    * REQUEST => curl "http://api.xtas.net:8000/api/doc?key=bg-78943&id=bg1"
    * RESPONSE => {"status": "ok", "result": {"document": {"updated": "2012-03-28T11:19:01.544000", "docid": "testdoc", "tags": [],
    *    "created": "2012-03-28T11:19:01.544000", "content": "Dit is een test document.\n\n", "key": "irn", "metadata": {}}}}
    */    
    getDocumentStatus: function(docID, callerObj, callback) {
		var options = {
			host: XTAS_HOST,
			port: XTAS_PORT,
			path: '/api/doc?key=' + XTAS_API_KEY + '&id=' + docID,
			headers: {
				'Accept' : 'application/json'
	      	}
		};
	    	    
	    var req = http.get(options, function(res) {
			var body = '';
			//res.setEncoding('utf8');			
			res.on('data', function (data) {
				body += data;
			}).on('error', function(error) {				
				console.log(error);
				callback(callerObj, null);
			}).on('end', function() {
				var resp = JSON.parse(body);
				callback(callerObj, resp);
			});
		});        
	},
	
    /**
    * REQUEST => curl "http://api.xtas.net:8000/api/process?key=myKey&id=testdoc&methods=ner(stanford,descriptive)"
	* RESPONSE => {"status": "ok", "result": [["Amsterdam", 35, 9, {"NE":"LOC", "POS":"UNKNOWN", "STR":"UNKNOWN"}]]}
    *
    * analysisType is either: lingpipe, stanford
    */    
    processDocument : function(docID, methods, callerObj, callback) {		
		var self = this;		
		var options = {
			host: XTAS_HOST,
			port: XTAS_PORT,
			path: '/api/process?key=' + XTAS_API_KEY + '&id=' + docID + '&methods=' + methods,
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
				console.log(error);
				callback(callerObj, null);
			}).on('end', function() {				
				var xtasData = JSON.parse(body);
				if(xtasData && xtasData.status == 'ok') {
					callback(callerObj, xtasData);
				} else if (xtasData && xtasData.status == 'processing') {					
					setTimeout(function(){
						self.processDocument(docID, methods, callerObj, callback);
					}, 2000);
				} else {
					callback(callerObj, null);
				}
			});
		});
	}

}