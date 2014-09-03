var STATIC_PORT = 3002;
var LABS_PORT = 3500;
var LABS_SERVER = 'http://localhost:' + LABS_PORT;

//npm imports
var http = require("http"),
sys = require("sys"),
fs = require("fs"),
url = require("url"),
qs = require("querystring"),
httpProxy = require("http-proxy"),
yaml = require('js-yaml'),
uuid = require('node-uuid'),
express = require('express'),

//custom imports
contextAggregator = require('./context-finder/context-aggregator'),
asrIndexAPI = require('./asr/asr-index-api');
asrFileAPI = require('./asr/asr-file-api');

//**************************************************************************************************************
//READ CONFIGURATION FROM YAML
//**************************************************************************************************************

try {
	CONFIG = yaml.safeLoad(fs.readFileSync('./config/woordnl-linking-server.yml', 'utf8'));
	console.log(CONFIG);
} catch (e) {
	console.log(e);
}


/********************************************************************************
 * ASR API (ON TOP OF ES)
 ********************************************************************************/
var esServerParams = {
	host : CONFIG['woordnl.es.host'],
	port : CONFIG['woordnl.es.port']
}
var searchIndex  = 'woordnl_asr';
var searchType  = 'asr_chunk';
var contextIndex  = 'woordnl_context';
var contextType  = 'asr_doc';

//initialize the asrIndexAPI
asrIndexAPI.initialize(esServerParams, searchIndex, searchType, contextIndex, contextType);

/********************************************************************************
 * STATIC SERVER
 ********************************************************************************/

var proxy = httpProxy.createProxyServer({});
var app = express();

/* Serves the static content */
app.use('/', express.static('../web/woordnl-linking-page'));

app.get('/get_context', function(req, res) {
	proxy.web(req, res, { target: LABS_SERVER });
});

app.get('/get_kw_times', function(req, res) {
	proxy.web(req, res, { target: LABS_SERVER });
});

//@deprecated
app.get('/get_asr_tags', function(req, res) {
	proxy.web(req, res, { target: LABS_SERVER });
});

//@deprecated
app.get('/get_file_list', function(req, res) {
	proxy.web(req, res, { target: LABS_SERVER });
});

app.listen(STATIC_PORT);

console.log('Static content served at http://127.0.0.1:' + STATIC_PORT);


/********************************************************************************
 * LABS SERVER (SUPPORTS JSONP)
 ********************************************************************************/

var urlMap = {
		
	'/get_context' : function (req, res) {
		// fetch the query string from the request
		var id = qs.parse(url.parse(req.url).query).id;
		
		//Use it to query the desired context sources
		getEnrichedTranscript(id, function(data) {
			res.simpleJSON(200, data);
		});
	},
	
	'/get_kw_times' : function (req, res) {
		// fetch the query string from the request
		var id = qs.parse(url.parse(req.url).query).id;
		var kw = qs.parse(url.parse(req.url).query).kw;
		//Now fetch all of the times the selected keyword occurs in the transcript 
		getKeywordTimes(id, kw, function(data) {
			res.simpleJSON(200, data);
		});
	},
	
	//@deprecated
	'/get_asr_tags' : function (req, res) {
		var id = qs.parse(url.parse(req.url).query).id;
		getTranscriptTags(id, function(data){
			res.simpleJSON(200, data);
		});
	}
	
	//@deprecated
	,'/get_file_list' : function (req, res) {
		getFileList(function(data){
			res.simpleJSON(200, data);
		});
	} 	
	
}


/*
 * The LABS server listening on port = LABS_POST
 * */
http.createServer(function (req, res) {
	
	//add a convenience function to each response object
	res.simpleJSON = function (code, obj) {
		var body = JSON.stringify(obj);
		res.setEncoding = 'utf8';
		res.end(body);
	};
	
	//fetch the correct handler from the urlMap
	handler  = urlMap[url.parse(req.url).pathname] || notFound;

	var json = "";

	if(req.method === "POST") {
		// We need to process the post but we need to wait until the request's body is available to get the field/value pairs.
		req.body = '';

		req.addListener('data', function (chunk) {
									// Build the body from the chunks sent in the post.
				 					req.body = req.body + chunk;
								})
			.addListener('end', function () {
									json = JSON.stringify(qs.parse(req.body));
									handler(req, res, json);
		      					}
						);
	} else {
		handler(req, res);
	}
}).listen(LABS_PORT);


/***********************************************************************************************************************
 * LOAD THE ENRICHED TRANSCRIPT FROM ES
 ************************************************************************************************************************/

function getEnrichedTranscript(id, clientCallback) {
	//call the ASR index to fetch the transcript	
	asrIndexAPI.getEnrichedTranscript(
		id, //asr file name
		{'id' : uuid.v4(), 'clientCallback' : clientCallback},//msg object to track who requested the data
		getEnrichedTranscriptComplete //callback after the data has returned
	);
}

function getEnrichedTranscriptComplete(responseData) {
	//call back the client
	responseData.msg.clientCallback(responseData.data);
}

/***********************************************************************************************************************
 * GET KEYWORD TIMES/OCCURANCES
 ************************************************************************************************************************/

function getKeywordTimes(id, kw, clientCallback) {
	//call the ASR index to fetch the transcript	
	asrIndexAPI.getKeywordTimes(
		id, //asr file name
		kw, //keyword to be found
		{'id' : uuid.v4(), 'clientCallback' : clientCallback},//msg object to track who requested the data
		getKeywordTimesComplete //callback after the data has returned
	);
}

function getKeywordTimesComplete(responseData) {
	//call back the client
	responseData.msg.clientCallback(responseData.data);
}

/***********************************************************************************************************************
 * LOAD THE SEMANTIC TAGS FOR A SPECIFIC TRANSCRIPT @deprecated
 ************************************************************************************************************************/

function getTranscriptTags(id, clientCallback) {
	//call the ASR index to fetch the transcript	
	asrFileAPI.getTranscriptTags(
		id, //asr file name
		{'id' : uuid.v4(), 'clientCallback' : clientCallback},//msg object to track who requested the data
		getTranscriptTagsComplete //callback after the data has returned
	);
}

function getTranscriptTagsComplete(responseData) {
	//call back the client
	responseData.msg.clientCallback(responseData.data);
}

/***********************************************************************************************************************
 * GET ALL OF THE POSSIBLE TRANSCRIPTS @deprecated
 ************************************************************************************************************************/

function getFileList(clientCallback) {
	//TODO test only: get the directory listing
	asrFileAPI.getFileList({'id' : uuid.v4(), 'clientCallback' : clientCallback},//msg object to track who requested the data
		getFileListComplete //callback after the data has returned
	);
}

function getFileListComplete(responseData) {
	//call back the client
	responseData.msg.clientCallback(responseData);
}

/***********************************************************************************************************************
 * GET CONTEXT BASED ON A QUERY @depreacted
 ************************************************************************************************************************/
function getContext(query, clientCallback) {
	contextAggregator.queryContexts(
		{'entities' : [], 'wordFreqs' : query.split(' ')}, //query
		{'id' : uuid.v4(), 'clientCallback' : clientCallback}, //msg (for queueing)
		['anefo'], //which context sources to query
		getContextComplete //callback after all context has been fetched and aggregated
	);
}

function getContextComplete(responseData) {
	//call back the client
	responseData.msg.clientCallback(responseData.data);
}