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
	
		var str = this.getQueryString(query.wordFreqs,10,true,false);
		console.log(query.wordFreqs);
		console.log(str);
		var esQuery = {"query":  
			{"bool": {
				"must":[{"query_string":{"default_field":"words","query":str}}],
				"must_not":[],
				"should":[]}
			},
			"from":0,"size":10,"sort":[],
			"highlight": {
    			"fields": {
      				"words": {}
    			}
  			}
		}
		
		this._esClient.search('woordnl_asr', 'asr_transcript', esQuery)

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
	
	getQueryString : function (wordList, maxWords, boost, power) {
		var maxWords = maxWords ? maxWords: 10;
		var boost = boost ? boost : true;
		var power = power ? power : false;
		if(wordList) {
			if(wordList.length >= maxWords) {
				wordList = wordList.slice(0,maxWords);
			}
			for (i=0;i<wordList.length;i++) {
				// http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_boosting
				if (boost == true) {
					var boostFactor = wordList.length-i;
					if (power == true) {
						boostFactor = Math.pow(boostFactor, 2);
					}
					wordList[i] = wordList[i].word+"^"+boostFactor.toString();
				}
			}
		}
		return wordList.join(" ");
	}
}
