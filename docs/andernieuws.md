Andernieuws 
================================


In a nutshell: 
--------------------------------

this application offers a UI that visualizes the results of topic clustering, triggered by a user search, based on ASR transcripts 
of news content (20:00 o'clock news from 2011 - 2013)

The code involves:
- AngularJS front-end
- Node.js API
- ElasticSearch index


ElasticSearch index
--------------------------------

In andernieuws-server.js please locate the _esClient variable and make sure to set it to use the right server:

var _esClient = new ElasticSearchClient({
    host: 'localhost',
    port: 9200,
});


Techinical references used for making this prototype
--------------------------------


NODE CLIENT
	https://github.com/phillro/node-elasticsearch-client/blob/master/lib/elasticsearchclient/calls/core.js


HOW TO RUN NODE ON 80 WITHOUT BEING ROOT
  http://syskall.com/dont-run-node-dot-js-as-root/


SEMANTISIZE (UVA)
	http://semanticize.uva.nl/doc/


DOCUMENT CLUSTERING!
	http://www.codeproject.com/Articles/439890/Text-Documents-Clustering-using-K-Means-Algorithm