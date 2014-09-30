var http = require('http');
var url = require('url');
var uuid = require('node-uuid');
var ElasticSearchClient = require('elasticsearchclient');
var querystring = require('querystring');

module.exports = {
		
	_esClient : null,	
	_searchIndex: null,
	_searchType: null,
	_contextIndex: null,
	_contextType: null,
	
	//set the elasticsearch and index name
	initialize : function(esServerParams, searchIndex, searchType, contextIndex, contextType) {
		this._esClient = new ElasticSearchClient(esServerParams);		
		this._searchIndex = searchIndex;
		this._searchType = searchType;
		this._contextIndex = contextIndex;
		this._contextType = contextType;
	},
	
	//get the enriched transcript from the ASR context index
	getEnrichedTranscript : function(id, callerObj, callback) {
		if(!this._esClient) {
			callback(callerObj, JSON.stringify({error: 'No ES host specified!'}), null);
		}
		this._esClient.get(this._contextIndex, this._contextType, id)
		.on('data', function(data) {
			callback({'msg' : callerObj, 'data' : JSON.parse(data)});
		})
		.on('done', function() {			
			//always returns 0 right now
		})
		.on('error', function(error) {
			console.log('While connecting to: ' + this._contextIndex);
			console.log(error);
			callback({'msg' : callerObj, 'data' : JSON.parse('{"error" : "Error while fetching context from ES"}')});
		})
		.exec();
	},
	
	getKeywordTimes: function(asrFile, kw, callerObj, callback) {
		console.log('Looking for kw: '+kw+ ' in ' + asrFile + ' in the ASR index...');
		if (asrFile.indexOf('.semanticized') != -1) {
			asrFile = asrFile.replace('.semanticized', '');
		}
		query = {"query":{"bool":{
			"must":[
			        {"query_string":{"default_field":"asr_chunk.asr_file","query":"\""+asrFile+"\""}},
			        {"query_string":{"default_field":"asr_chunk.keywords.word","query":"\""+kw+"\""}}
			],
			"must_not":[],
			"should":[]}},
			"from":0,"size":10,"sort":[],"facets":{}
		}
		console.log(JSON.stringify(query));
		this._esClient.search(this._searchIndex, this._searchType, query)
		.on('data', function(data) {
			kwData = JSON.parse(data);
			times = [];
			var kws = null;
			for (hit in kwData.hits.hits) {
				kws = kwData.hits.hits[hit]._source.keywords;
				for (k in kws) {
					if(kws[k].word == kw) {						
						times = times.concat(kws[k].times);						
					}
				}
			}			
			callback({'msg' : callerObj, 'data' : {'times' : times}});
		})
		.on('done', function() {
			//always returns 0 right now
		})
		.on('error', function(error) {
			console.log('While connecting to: ' + this._contextIndex);
			console.log(error);
			callback({'msg' : callerObj, 'data' : JSON.parse('{"error" : "Error while fetching context from ES"}')});
		})
		.exec();
		
	},
	
	getSearchResults: function(id, term, callerObj, callback) {
		console.log('Looking for term: '+term+ 'in the ASR index...');
		query = {"query":{"common":{"words":{"query":term,"cutoff_frequency":0.001}}}}
		console.log(JSON.stringify(query));
		this._esClient.search(this._searchIndex, this._searchType, query)
		.on('data', function(data) {
			kwData = JSON.parse(data);
			scores = [];
			var kws = null;
			for (hit in kwData.hits.hits) {
				kws = kwData.hits.hits[hit]._score;				
				scores = scores.concat(kws);
			}			
			callback({'msg' : callerObj, 'data' : {'ThemData' : kwData}});
		})
		.on('done', function() {
			//always returns 0 right now
		})
		.on('error', function(error) {
			console.log('While connecting to: ' + this._contextIndex);
			console.log(error);
			callback({'msg' : callerObj, 'data' : JSON.parse('{"error" : "Error while fetching context from ES"}')});
		})
		.exec();
	},
	
	
	getTranscript : function(id, callerObj, callback) {
		if(!this._esClient) {
			callback(callerObj, JSON.stringify({error: 'No ES host specified!'}), null);
		}
		this._esClient.get(this._searchIndex, 'asr_transcript', id)
		.on('data', function(data) {
			callback({'msg' : callerObj, 'data' : JSON.parse(data)});
		})
		.on('done', function() {
			//always returns 0 right now
		})
		.on('error', function(error) {
			console.log('While connecting to: ' + this._contextIndex);
			console.log(error);
			callback({'msg' : callerObj, 'data' : JSON.parse('{"error" : "Error while fetching ASR transcript from search index"}')});
		})
		.exec();
	}

}