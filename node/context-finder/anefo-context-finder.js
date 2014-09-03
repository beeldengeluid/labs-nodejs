var http = require('http'),
	url = require('url'),	
	querystring = require('querystring'),
	queryAnalyzer = require('../tools/query-analyzer'),
	parseString = require('xml2js').parseString;

module.exports = {
		
	/** 
	 * EXAMPLE URL http://www.gahetna.nl/beeldbank-api/opensearch/?searchTerms=Trefwoorden:glas&count=10&startIndex=1	 
	 */
	search : function(query, callerObj, callback) {
		var self = this;
		
		//var person = queryAnalyzer.getKeywordsOfType(query, 'Person', true, 1);
		//person = person ? person[0] : null;
		
		var location = queryAnalyzer.getKeywordsOfType(query, 'Location', true, 1);
		location = location ? location[0] : null;
		
		var keyword = queryAnalyzer.getMostFrequentWords(query, 1);
		var thing = undefined; //queryAnalyzer.getKeywordsOfType(query, 'Thing', 1);
		keyword = thing ? thing[0] : keyword ? keyword[0] : '*';
				
		var urlParams = null;
		if (query.entities.length == 0) {
			urlParams = 'searchTerms=' + encodeURIComponent(keyword);
		} else {
			urlParams = 'searchTerms=Trefwoorden:' + encodeURIComponent(keyword);
		}
		if(location) {
			urlParams += '%20OR%20Geografisch_trefwoord:' + encodeURIComponent(location);
		}
		urlParams += '&count=10&startIndex=1'; 
				
		
		var options = {
			host: 'www.gahetna.nl',
			port: 80,
			path: '/beeldbank-api/opensearch/?' + urlParams,
			method: 'GET',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml'
	      	}
		};
	
		var queryString = options['host'] + options['path'];
				
		var req = http.request(options, function(res) {
			res.setEncoding('utf8');
			var data = '';
			res.on('data', function (chunk) {
				data += chunk;
			}).on('error', function(error) {
				console.log(queryString);
				console.log(error);
				callback(callerObj, null, 'anefo');
			}).on('end', function() {
				try {
					self.parseResponse(data, queryString, callerObj, callback);
				} catch(e) {
					console.log(e);
					callback(callerObj, queryString, null, 'anefo');
				}
			});
		});
	
		//send the request
		req.end();
	},
	
	parseResponse : function(xml, queryString, callerObj, callback) {
		parseString(xml, function(err, result){
			json = JSON.parse(JSON.stringify(result));
			if(json && json['rss']) {
				//console.log(queryString);
				callback(callerObj, queryString, json['rss']['channel'][0], 'anefo');
			} else {
				callback(callerObj, queryString, null, 'anefo');
			}
		});
	}

}