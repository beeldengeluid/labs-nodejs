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
textAnalyzer = require('./tools/text-analyzer'),

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

app.get('/get_search_results', function(req, res) {
	proxy.web(req, res, { target: LABS_SERVER });
});


app.listen(STATIC_PORT);

console.log('Static content served at http://127.0.0.1:' + STATIC_PORT);


/********************************************************************************
 * LABS SERVER (SUPPORTS JSONP)
 ********************************************************************************/

var urlMap = {
		
	'/get_context' : function (req, res) {
		//fetch the asr file name (used as id) from the request
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
		console.log("THEMOS");
		//Now fetch all of the times the selected keyword occurs in the transcript 
		getKeywordTimes(id, kw, function(data) {
			res.simpleJSON(200, data);
		});
	},
	
	//Themis
	'/get_search_results' : function (req, res) {
		// fetch the query string from the request
		var id = qs.parse(url.parse(req.url).query).id;
		var term = qs.parse(url.parse(req.url).query).term;
		//var kw = qs.parse(url.parse(req.url).query).kw;
		//Now fetch all of the times the selected keyword occurs in the transcript
		//console.log('your term is'+term);
		getSearchResults(id,term, function(data) {
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
 * LOAD THE STOPWORDS/IDF SCORES FOR THE TAG CLOUD
 ************************************************************************************************************************/

//load the stopwords into memory
var STOP_WORDS = textAnalyzer.readStopWordsFile(CONFIG['file.stopwords']);

//load the corpus term frequencies into memory
var IDF_SCORES = textAnalyzer.readIDFFile(CONFIG['file.idf']);

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
	//uncomment this if you want to use the keywords from the index, rather than calculate it on the fly
	responseData.msg.clientCallback(responseData.data);

	//fetches the transcript from the index. Following that it will use the transcript to calculate the tag cloud
	//getTranscript(responseData)
}

function getTranscript(contextData) {	
	//254.41136104.asr1.semanticized.hyp ==> 254.41136104.asr1.hyp	
	var id = contextData.data._id;
	if(id.indexOf('.semanticized') == -1) {
		console.log('Returning the tag cloud from the index');
		contextData.msg.clientCallback(responseData.data);
	} else {
		id = id.replace('.semanticized', '');
		console.log('Fetching the tag cloud from the transcript');
		//call the ASR index to fetch the transcript
		contextData.msg.contextData = contextData.data;
		asrIndexAPI.getTranscript(
			id, //asr file name
			contextData.msg,//msg object to track who requested the data
			getTranscriptComplete //callback after the data has returned
		);
	}
}

function getTranscriptComplete(responseData) {
	//this function finally calculates the tag cloud using the text analyzer on the transcript text
	var cleanText = null;
	if(responseData.data && responseData.data._source.words) {
		cleanText = responseData.data._source.words;
		//fetch the cloud data passing the words obtained from the transcript
		var cloudData = textAnalyzer.getMostImportantWords(cleanText, STOP_WORDS, IDF_SCORES, false, 5 , false);
		responseData.msg.contextData._source.keywords = cloudData;//replace the indexed keywords with the fetched keywords		
		responseData.msg.clientCallback(responseData.msg.contextData);//finally send the response back to the client
	}
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
 * GET search Results from ES, based on a search term ---> THEMIS
 ************************************************************************************************************************/

function getSearchResults(id, term, clientCallback) {
	//call the ASR index to fetch the transcript
	asrIndexAPI.getSearchResults(
		id, //asr file name
		term, //keyword to be found
		{'id' : uuid.v4(), 'clientCallback' : clientCallback},//msg object to track who requested the data
		getSeachResultsComplete //callback after the data has returned
	);
}

function getSeachResultsComplete(responseData) {
	//call back the client
	responseData.msg.clientCallback(responseData.data);
}