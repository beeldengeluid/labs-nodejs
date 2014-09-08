var ElasticSearchClient = require('elasticsearchclient'),
	queryAnalyzer = require('../tools/query-analyzer');
// let's get started!
module.exports = {
	
	_esClient : null,
		
	search : function(query, callerObj, callback) {
		
		if(!this._esClient) {
			this._esClient = new ElasticSearchClient({
				host: CONFIG['woordnl.es.host'],
				port: CONFIG['woordnl.es.port']
			});
		}
	
		var str = this.getQueryString(query.wordFreqs);
		var esQuery = {"query":
			{"bool": {
				"must":[{"query_string":{"default_field":"_all","query":str}}],
				"must_not":[],
				"should":[]}
			},
			"from":0,"size":10,"sort":[],"facets":{}
		}		
		this._esClient.search('woordnl', 'asr_chunk', esQuery)
			.on('data', function(data) {
				//console.log(data);
				callback(callerObj, JSON.stringify(esQuery), JSON.parse(data), 'woordnl');
			})
			.on('done', function() {
				//always returns 0 right now			
			})
			.on('error', function(error) {
				console.log('While connecting to woordnl: ');
				console.log(error);
				callback(callerObj, JSON.stringify(esQuery), null, 'woordnl');
			})
			.exec();
	},
	
	getQueryString : function (wordList) {
		if(wordList) {
			if(wordList.length >= 5) {
				return wordList.slice(0,5).join(' ');
			} else {
				return wordList.join(' ');
			}
		}
	}

}