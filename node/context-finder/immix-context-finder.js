/*
 *curl -XGET 'http://elastic-a.beeldengeluid.nl/search_expressie/searchable_expressie/_search?pretty&timeout=10s' -d '{"query": {"match": {"samenvatting": "amsterdam vandaag"}}}'
 *
 * 
 * curl -XGET 'http://elastic-a.beeldengeluid.nl/search_expressie/searchable_expressie/_search?pretty&timeout=10s' -d '{"query": {"bool": {"must":[{"query_string":{"default_field":"_all","query":"amsterdam"}}], "must_not":[], "should":[]}},"from":0,"size":10,"sort":[],"facets":{}}'
 * 
 * NOTE BENE:
 * 	ik heb de node_modules/elasticsearchclient/lib/elasticsearchclient/calls/core.js moeten aanpassen zodat ie GET search requests doet!!!
 * 
 * 
 * esQuery = {"query":	{"match":{"samenvatting": keyword}}, timeout : 10*1000};
 * */

var es = require('elasticsearch'),
	queryAnalyzer = require('../tools/query-analyzer');

module.exports = {
		
	_esClient : null,

	search : function(query, callerObj, callback) {
		if(!this._esClient) {			
			var esHost = 'http://';
			if(CONFIG['immix.es.user'] && CONFIG['immix.es.password']) { 
				esHost += CONFIG['immix.es.user'] + ':' + CONFIG['immix.es.password'] + '@';
			}
			esHost += CONFIG['immix.es.host'];
			if(CONFIG['immix.es.path']) {
				esHost += '/' + CONFIG['immix.es.path'];
			}
			this._esClient = new es.Client({
				//host : 'http://dev:PuddingBroodje@labs-test.beeldengeluid.nl/espx4bengLB'
				host : esHost
			});
		}
	
		var person = queryAnalyzer.getKeywordsOfType(query, 'Person', true, 1);
		person = person ? person[0] : '*';
		
		var product = queryAnalyzer.getKeywordsOfType(query, 'Product', true, 1);
		product = product ? product[0] : '*';
		
		var location = queryAnalyzer.getKeywordsOfType(query, 'Location', true, 1);
		location = location ? location[0] : '*';
		
		var keyword = queryAnalyzer.getMostFrequentWords(query, 1);
		var thing = undefined;//queryAnalyzer.getKeywordsOfType(query, 'Thing', 1);
		keyword = thing ? thing[0] : keyword ? keyword[0] : '*';						
		
		keyword = keyword.toLowerCase();
		
		var esQuery = {'query':
			{'bool':
				{
				'must':[{'query_string':{'default_field':'doc.expressie.niveaus.beschrijving','query':'"'+keyword+'"'}}],
				'must_not':[],
				'should':[				          
				          {'query_string':{'default_field':'doc.expressie.niveaus.namen.low','query':'"'+product+'"'}},
				          {'query_string':{'default_field':'doc.expressie.niveaus.geografische_namen.low','query':'"'+location+'"'}},
				          {'query_string':{'default_field':'doc.expressie.maker.naam.low','query':'"'+person+'"'}},
				          {'query_string':{'default_field':'doc.expressie.niveaus.persoonsnamen.low','query':'"'+person+'"'}}
				         ]
				}
			}
		}	
		
		console.log(JSON.stringify(esQuery));
		
		this._esClient.search({
			index: 'zoekflex',
			type: 'doc',
			body: esQuery
		}).then(function (data) {
			callback(callerObj, JSON.stringify(esQuery), data, 'immix');
		}, function (error) {
			console.log(error.message);
			callback(callerObj, JSON.stringify(esQuery), null, 'immix');
		});		
	}

}