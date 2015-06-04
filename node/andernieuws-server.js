/* Imports */

var http = require('http');
var url = require("url");
var fs = require('fs');
var qs = require("querystring");
var httpProxy = require("http-proxy");
var express = require('express');
var uuid = require('node-uuid');
var ElasticSearchClient = require('elasticsearchclient');
var querystring = require('querystring');
var moment = require('moment');

/* Global vars */

var ANDERNIEUWS_INDEX = 'andernieuws_kwindex';
var KEYWORD_ALL_FILE = '../web/andernieuws/resources/allkeywords.json';
var KEYWORD_INDEX_FILE = '../web/andernieuws/resources/kwindex.json';
var CLUSTER_INTERVAL = 3000 * 1;
var KEYWORD_LIMIT = 30;
var MESSAGE_PORT = 1337;
var MESSAGE_SERVER = 'http://localhost:' + MESSAGE_PORT;
var STATIC_PORT = 3000;
var FETCH_SIZE = 1000;

var _esClient = new ElasticSearchClient({
	host: 'localhost',
    port: 9200,
});

var _allKeywords = readJSONFileData(KEYWORD_ALL_FILE);
var _kwIndex = readJSONFileData(KEYWORD_INDEX_FILE);
var _dates = null;
var _weird = null;

/********************************************************************************
 * LOAD THE KEYWORD INDEX FILE INTO MEMORY
 ********************************************************************************/

function readJSONFileData(fn) {
	console.log('Loading the kwindex.json file');
	if (!fn) {
		return null;
	}
	var fileData = fs.readFileSync(fn, 'utf8');
	return JSON.parse(fileData);
}

function parseDates() {
	var dates = [];
	_weird = null;
	for (d in _kwIndex) {
        if (d && d != 'null') {
			date = moment(d, 'DD-MM-YYYY');
			dates.push(date)
        } else {
			_weird = _kwIndex[d];
        }
    }
    dates.sort(function(a, b){
    	return a.unix() - b.unix();
    });
    return dates;
}

/********************************************************************************
 * STATIC/PROXY/API SERVER
 ********************************************************************************/

var proxy = httpProxy.createProxyServer({});
var app = express();

/* Serves the static content */
app.use('/', express.static('../web/andernieuws'));

app.get('/search', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

app.get('/searchkw', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

app.get('/all_keywords', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

app.listen(STATIC_PORT);

console.log('Static content & API served at http://127.0.0.1:' + STATIC_PORT);

/********************************************************************************
 * MESSAGE SERVER
 ********************************************************************************/


var urlMap = {

	'/search' : function (req, res) {
		var s = qs.parse(url.parse(req.url).query).s;
		var startDate = qs.parse(url.parse(req.url).query).sd;
		var endDate = qs.parse(url.parse(req.url).query).ed;
		var clusterInterval = qs.parse(url.parse(req.url).query).i;
		if(!clusterInterval) {
			clusterInterval = CLUSTER_INTERVAL;
		}
		search(s, startDate, endDate, {}, 0, parseInt(clusterInterval), function(data) {
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
			res.simpleJSON(200, data);
		});
	},

	'/searchkw' : function (req, res) {
		var startDate = qs.parse(url.parse(req.url).query).sd;
		var endDate = qs.parse(url.parse(req.url).query).ed;
		var limit = qs.parse(url.parse(req.url).query).l;
		if(!limit) {
			limit = KEYWORD_LIMIT;
		}
		searchkw(startDate, endDate, parseInt(limit), function(data) {
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
			res.simpleJSON(200, data);
		});
	},

	'/all_keywords' : function (req, res) {
		var startDate = qs.parse(url.parse(req.url).query).sd;
		var endDate = qs.parse(url.parse(req.url).query).ed;
		getAllKeywords(startDate, endDate, {}, 0, function(data) {
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
			res.simpleJSON(200, data);
		});
	}

}

http.createServer(function (req, res) {

	//add a convenience function to each response object
	res.simpleJSON = function (code, obj) {
		var body = JSON.stringify(obj);
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
}).listen(MESSAGE_PORT);

console.log('Message server running at http://127.0.0.1:' + MESSAGE_PORT);

function notFound(req, res) {
    res.sendwriteHeadHeader(404, [ ["Content-Type", "text/plain"], ["Content-Length", CONFIG['message-server-not-found-message'].length]]);
    res.write(CONFIG['message-server-not-found-message']);
    res.end();
}

/*-------------------------------------------------------------------------------
 * MESSAGE SERVER - SEARCH FUNCTIONS
 *-------------------------------------------------------------------------------*/

//recursive function
function getAllKeywords(startDate, endDate, keywords, offset, cb) {
	console.log('OFFSET: ' + offset);
	query = {
			"_source": {
		        "include": ["keywords.*"]
			},
		  "query": {
			    "filtered": {
			    	"query": {
			    		"match_all": {}
			    	},
			    	"filter": {

			    	}
			   }
		  }
	}
	if(startDate && endDate) {
		query["query"]["filtered"]["filter"]["range"] = {"metadata.broadcast_date":{"from": startDate,"to":endDate}};
	} else if(startDate) {
		query["query"]["filtered"]["filter"]["range"] = {"metadata.broadcast_date":{"from": startDate}};
	} else if(endDate) {
		query["query"]["filtered"]["filter"]["range"] = {"metadata.broadcast_date":{"to": endDate}};
	}
	_esClient.search(ANDERNIEUWS_INDEX, 'asr_chunk', query, {size: FETCH_SIZE, from : offset , analyzer : 'text_nl'})
	.on('data', function(data) {
		var id = uuid.v4();
		data = JSON.parse(data);
		var hit = kw = null;
		if (data && data.hits) {
			for (var h=0;h<data.hits.hits.length;h++) {
				hit = data.hits.hits[h];
				if(hit._source.keywords) {
					for (var k=0;k<hit._source.keywords.length;k++) {
						kw = hit._source.keywords[k];
						if(keywords[kw.word]) {
							keywords[kw.word] += parseInt(kw.freq);
						} else {
							keywords[kw.word] = parseInt(kw.freq);
						}
					}
				}
			}
			if((offset + FETCH_SIZE) >= data.hits.total) {
				//call back the client when all has been fetched.
				console.log('Got it all, calling back the client');
				var c = 0;
				for (k in keywords) {
					c++;
				}
				console.log('Unique keywords: '  + c);
				cb(keywords);
			} else {
				console.log('Fetching some more: ' + (offset + FETCH_SIZE));
				getAllKeywords(startDate, endDate, keywords, offset + FETCH_SIZE, cb);
			}
		}
	})
	.on('done', function() {
		//always returns 0 right now
	})
	.on('error', function(error) {
		console.log(error);
	})
	.exec();
}

/*-------------------------------------------------------------------------------
 * MESSAGE SERVER - SEARCH FUNCTIONS
 *-------------------------------------------------------------------------------*/

//the search message queue
var msgQueue = {};

function search(s, startDate, endDate, results, offset, clusterInterval, cb) {
	query = {
			"query" : {
				"filtered": {
					"query":{"bool":{
						"must":[
						        {"query_string":{"default_field":"words","query": "\"" + s + "\""}}
						        ], "must_not":[],"should":[]}
						},
						"filter" : {}
				}
			}
	};
	if(startDate && endDate) {
		query["query"]["filtered"]["filter"]["range"] = {"metadata.broadcast_date":{"from": startDate,"to":endDate}};
	} else if(startDate) {
		query["query"]["filtered"]["filter"]["range"] = {"metadata.broadcast_date":{"from": startDate}};
	} else if(endDate) {
		query["query"]["filtered"]["filter"]["range"] = {"metadata.broadcast_date":{"to": endDate}};
	}
	_esClient.search(ANDERNIEUWS_INDEX, 'asr_chunk', query, {size : FETCH_SIZE, from : offset, analyzer : 'text_nl'})
		.on('data', function(data) {
			var data = JSON.parse(data);
			if(data && data.hits) {
				var f = null;
				//find the ids (file names) of the ASR transcripts
				for (var i in data.hits.hits) {
					f = data.hits.hits[i]._source.asr_file;
					if(results[f]) {
						results[f].push([data.hits.hits[i]._source.start, data.hits.hits[i]._source.end]);
					} else {
						results[f] = [[data.hits.hits[i]._source.start, data.hits.hits[i]._source.end]];
					}
				}
				if (offset == 0 && data.hits.total == 0) {
					//immediately call back the client in case of no results
					console.log('No results found for: ' + s);
					cb({message : 'No results found for: ' + s});
				} else if((offset + FETCH_SIZE) >= data.hits.total) {
					//all occurances of the search have been retrieved, now prepare the data for the next call
					console.log(data.hits.total + ' results found');
					var id = uuid.v4();
					var toBeFound = [];
					for (asrFile in results) {
						toBeFound.push(asrFile);
					}
					msgQueue[id] = {'toBeCalled' : toBeFound, 'clientCallback' : cb, 'keywords' : {}, 'search' : s};
					//for each segment find the surrounding keywords
					for (var key in results) {
						getSurroundingKeywords(id, key, results[key], clusterInterval);
					}
				} else {
					//if there are more results fetch them first, before going into the surrounding keyword fray
					search(s, startDate, endDate, results, offset + FETCH_SIZE, clusterInterval, cb);
				}
			} else {
				//something went wrong. Call back the client.
				cb({message : 'Error: the search engine returned with an error'});
			}


		})
		.on('done', function() {
			//always returns 0 right now
		})
		.on('error', function(error) {
			console.log(error)
		})
		.exec();
}

/**
* Keyword search
* */
function searchkw(startDate, endDate, limit, cb) {
	if(_dates == null) {
		_dates = parseDates();
	}
	var rankedKeywords = [];
	var sd = startDate ? moment(startDate, 'DD-MM-YYYY') : null;
	var ed = endDate ? moment(endDate, 'DD-MM-YYYY') : null;
	var d = null;
	var kws = null;
	var kwCounts = {};
	var count = 0;
	var inPeriod = false;
	//select the dates within the provided range
    for(k in _dates) {
    	inPeriod = false;
    	d = _dates[k];
    	if (sd && !ed) {
    		inPeriod = d.isSame(sd) || d.isAfter(sd);
    	} else if(!sd && ed) {
    		inPeriod = d.isSame(ed) || d.isBefore(ed);
    	}
    	else if(sd && ed && (ed.isAfter(sd) || sd.isSame(ed, 'day'))) {
			inPeriod = d.isBetween(sd, ed) || d.isSame(sd, 'day') || d.isSame(ed, 'day');
    	}
    	if(inPeriod) {
    		//if the date is within the range fetch the related keywords
    		kws = _kwIndex[d.format('DD-MM-YYYY')];

    		//add the keywords to a hash and update the counts for each occurance
    		for(k in kws) {
    			if(kwCounts[k]) {
    				kwCounts[k] += kws[k];
    			} else {
    				kwCounts[k] = kws[k];
    			}
    		}
    		count++;
    	}
    }
    temp = [];
    //put all of the counted keywords of this period in a list so it can be sorted for the UI
    var prediction = 0;
    for(k in kwCounts) {
    	prediction = _allKeywords[k] / 100 * (count / (_dates.length / 100));
    	temp.push({
    		score : kwCounts[k] - prediction,
    		word : k,
    		freq : kwCounts[k],
    		prediction : prediction,
    		all : _allKeywords[k],
    		count : count,
    		alldates : _dates.length
    	})
    }

    //sort based on freq and prediction
    temp.sort(function(a, b){
    	return (b.freq - b.prediction) - (a.freq - a.prediction);
    });

    //call back
    cb(temp.slice(0, limit));
}

/**
 * Gets the surrounding keywords per segment (only a couple of keywords per query)
 * */
function getSurroundingKeywords(id, asrFile, segmentTimes, timeRadius) {
	//console.log('Looking for surrounding keywords in: ' + asrFile + ' ('+startTimes + ' '+ timeRadius + ')');
	var queries = []
	var query = null;
	for(t in segmentTimes) {

		//define the interval of keywords
		var start = segmentTimes[t][0] - timeRadius > 0 ? segmentTimes[t][0] - timeRadius : 0;
		var end = segmentTimes[t][1] + timeRadius;

		//build the query
		query =
			{"query" : {
				"filtered": {
					"query": {
						"bool": {
							"must":[
							        {"query_string":{"default_field":"asr_chunk.asr_file","query": "\""+asrFile+"\""}}
							        ], "must_not":[], "should":[]
							}
					},
					"filter" : {
						"range":{"asr_chunk.end":{"from": start,"to":end}}
					}
				}
			}
		}

		//add the query to the list of queries (will be executed in one go, using msearch)
		queries.push({size : '1000', index : ANDERNIEUWS_INDEX, type : 'asr_chunk'});
		queries.push(query);
	}

	//send all the queries (related to one ASR transcript) to the ES
	_esClient.multisearch(queries)
	.on('data', function(data) {
		data = JSON.parse(data);
		keywordsFound(id, asrFile, data);
	})
	.on('done', function(){
		//always returns 0 right now
	})
	.on('error', function(error) {
		console.log(error)
	})
	.exec();
}

function keywordsFound(id, asrFile, transcriptData) {
	//console.log('Found a transcript!');
	//console.log(transcriptData);
	if(msgQueue[id]) {

		//aggregate the results to the return data (as JSON object)
		msgQueue[id].keywords[asrFile] = {'data' : transcriptData};

		//mark the context source as finished
		msgQueue[id].toBeCalled.splice(msgQueue[id].toBeCalled.indexOf(asrFile), 1);

		//when all context data is available call back the service with the aggregated data
		if(msgQueue[id].toBeCalled.length == 0) {
			//call back the service
			callbackClient(msgQueue[id]);

			//remove the message from the queue
			delete msgQueue[id];
		}
	}
}

function callbackClient(queueItem) {
	queueItem.clientCallback(formatResponseData(queueItem));
}

function formatResponseData(queueItem) {
	var topicData = {};
	var kws = queueItem.keywords;
	var item, asrFile, audioUrl, videoUrl, topic, topicTimes, date = null;
	//loop through each of the results, which are grouped by asr file
	for(asrFile in kws) {
		//per file loop through the found chunks that (possibly) contain the needed keywords (i.e. topics) we are looking for
		for(var hit in kws[asrFile].data.responses[0].hits.hits) {
			item = kws[asrFile].data.responses[0].hits.hits[hit];
			for(var kw in item._source.keywords) {
				asrFile = item._source.asr_file;
				audioUrl = asrFile.replace(/.xml/g, '.mp3');
				videoUrl = getVideoUrl(item);
				if(audioUrl) {//&& videoUrl
					topic = item._source.keywords[kw].word;
					//topicTimes = getTimes(item._source.keywords[kw]);
					topicTimes = item._source.keywords[kw].times;
					date = item._source.metadata.broadcast_date;
					if(topicData[topic]) {
						if(topicData[topic].mediaItems[asrFile]) {
							for(var i in topicTimes) {
								if(topicData[topic].mediaItems[asrFile].spokenAt) {
									topicData[topic].mediaItems[asrFile].spokenAt.push(topicTimes[i]);
								}
							}
						} else {
							topicData[topic].mediaItems[asrFile] = {
								topic : topic,
								videoUrl : videoUrl,
								audioUrl : audioUrl,
								date : date,
								spokenAt : topicTimes
							}
						}
					} else {
						mediaItems = {};
						mediaItems[asrFile] = {
							videoUrl : videoUrl,
							audioUrl : audioUrl,
							date : date,
							spokenAt : topicTimes
						}
						topicData[topic] = {
							mediaItems : mediaItems
						};
					}
				} else {
					console.log('====>\tThere is some weird ass shit going on');
					console.log(item);
				}
			}
		}
	}
	var td = [];
	var mi = null;
	for (k in topicData) {
		mi = [];
		for(var m in topicData[k].mediaItems) {
			mi.push(topicData[k].mediaItems[m]);
		}
		//sort the mediaitems per topic by date
		mi = mi.sort(function(a, b) {
			return moment(b.date, 'DD-MM-YYYY').isBefore(moment(a.date, 'DD-MM-YYYY'));
		});

		td.push({topic : k, mediaItems : mi, itemCount : mi.length});
	}
	td = td.sort(function(a, b) {
		//always put the searched topic on top. The rest is ordered by the amount of fragments
		if (a.topic == queueItem.search) {
			return b.itemCount - 9999;
		} else if (b.topic == queueItem.search) {
			return 9999 - a.itemCount;
		} else {
			return b.itemCount - a.itemCount;
		}
	});
	return td;
}

function getVideoUrl(item) {
	var dragernr, start, end = null;
	if(item._source.metadata.video_data) {
		dragernr = item._source.metadata.video_data.dragernummer;
		start = item._source.metadata.video_data.start;
		end = item._source.metadata.video_data.end;
		return dragernr + '_' + start + '_' + end + '.mp4';
	}
	return null;
}

function getTimes(keyword) {
	var times = [];
	if(keyword.times) {
		var t_arr = keyword.times.split(' ');
		for (var i in t_arr) {
			times.push(toMillis(t_arr[i]));
		}
	}
	return times;
}

function toMillis(sec) {
	var ms = sec * 1000 + "";
	if(ms.indexOf(".") == -1) {
		return parseInt(ms);
	} else {
		return parseInt(ms.substring(0, ms.indexOf(".")));
	}
}