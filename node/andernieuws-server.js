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
var treeTagger = require('./tools/tree-tagger');
var yaml = require('js-yaml');

//**************************************************************************************************************
//READ CONFIGURATION FROM YAML AND SET GLOBAL VARS
//**************************************************************************************************************

try {
	CONFIG = yaml.safeLoad(fs.readFileSync('./config/andernieuws-config.yml', 'utf8'));
	console.log(CONFIG);
} catch (e) {
	console.log(e);
}

var esConfig = {
	host: CONFIG['es.host'],
    port: CONFIG['es.port'],
    path: CONFIG['es.path']
}
if(CONFIG['user'] && CONFIG['password']) {
	esConfig['auth'] = CONFIG['es.user'] + ':' + CONFIG['es.password'];
}

/* Global vars */
var MESSAGE_SERVER = 'http://'+CONFIG['messageserver.host']+':'+CONFIG['messageserver.port'];

var _esClient = new ElasticSearchClient(esConfig);
var _allKeywords = readJSONFileData(CONFIG['keywords_file']);//stores all words + their freqs
var _kwIndex = readJSONFileData(CONFIG['keywords_index_file']);//stores words + freq per day
var _kwTypes = readJSONFileData(CONFIG['keywords_types_file']);//stores per word the word types
var _dates = null;
var _weird = null;

/********************************************************************************
 * LOAD THE KEYWORD INDEX FILE INTO MEMORY
 ********************************************************************************/

function readJSONFileData(fn) {
	console.log('Loading ' + fn);
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
			dates.push(date);
        } else {
			_weird = _kwIndex[d];
        }
    }
    dates.sort(function(a, b){
    	return a.unix() - b.unix();
    });
    /*for(var i=0;i<dates.length;i++) {
    	console.log(dates[i].toString())
    }*/
    return dates;
}

console.log('Try this out for size');
parseDates();

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

app.get('/postag', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

app.listen(CONFIG['localhost.port']);

console.log('Static content & API served at http://127.0.0.1:' + CONFIG['localhost.port']);

/********************************************************************************
 * MESSAGE SERVER
 ********************************************************************************/


var urlMap = {

	'/search' : function (req, res) {
		var s = qs.parse(url.parse(req.url).query).s;
		var startDate = qs.parse(url.parse(req.url).query).sd;
		var endDate = qs.parse(url.parse(req.url).query).ed;
		var clusterInterval = qs.parse(url.parse(req.url).query).i;
		var wordTypeFilters = {
			includeNouns : qs.parse(url.parse(req.url).query).i_n == 'y' ? true : false,
			includeVerbs : qs.parse(url.parse(req.url).query).i_v == 'y' ? true : false,
			includeAdjectives : qs.parse(url.parse(req.url).query).i_adj == 'y' ? true : false,
			includeAdverbs : qs.parse(url.parse(req.url).query).i_adv == 'y' ? true : false,
			includePronouns : qs.parse(url.parse(req.url).query).i_pro == 'y' ? true : false,
			includeNumbers : qs.parse(url.parse(req.url).query).i_num == 'y' ? true : false,
			includePrepositions : qs.parse(url.parse(req.url).query).i_pre == 'y' ? true : false,
			includeDeterminers : qs.parse(url.parse(req.url).query).i_det == 'y' ? true : false,
			includeInterjections : qs.parse(url.parse(req.url).query).i_int == 'y' ? true : false,
			includeConjunctions : qs.parse(url.parse(req.url).query).i_con == 'y' ? true : false
		}
		if(!clusterInterval) {
			clusterInterval = CONFIG['cluster_interval'];
		}
		search(
			s,
			startDate,
			endDate,
			wordTypeFilters,
			{},
			0,
			parseInt(clusterInterval),
			function(data) {
				res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
				res.simpleJSON(200, data);
			}
		);
	},

	'/searchkw' : function (req, res) {
		var startDate = qs.parse(url.parse(req.url).query).sd;
		var endDate = qs.parse(url.parse(req.url).query).ed;
		var sort = qs.parse(url.parse(req.url).query).sort;
		var order = qs.parse(url.parse(req.url).query).ord;
		var limit = qs.parse(url.parse(req.url).query).l;
		var wordTypeFilters = {
			includeNouns : qs.parse(url.parse(req.url).query).i_n == 'y' ? true : false,
			includeVerbs : qs.parse(url.parse(req.url).query).i_v == 'y' ? true : false,
			includeAdjectives : qs.parse(url.parse(req.url).query).i_adj == 'y' ? true : false,
			includeAdverbs : qs.parse(url.parse(req.url).query).i_adv == 'y' ? true : false,
			includePronouns : qs.parse(url.parse(req.url).query).i_pro == 'y' ? true : false,
			includeNumbers : qs.parse(url.parse(req.url).query).i_num == 'y' ? true : false,
			includePrepositions : qs.parse(url.parse(req.url).query).i_pre == 'y' ? true : false,
			includeDeterminers : qs.parse(url.parse(req.url).query).i_det == 'y' ? true : false,
			includeInterjections : qs.parse(url.parse(req.url).query).i_int == 'y' ? true : false,
			includeConjunctions : qs.parse(url.parse(req.url).query).i_con == 'y' ? true : false
		}
		if(!limit) {
			limit = CONFIG['keyword_limit'];
		}
		searchkw(
			startDate,
			endDate,
			sort,
			order,
			parseInt(limit),
			wordTypeFilters,
			function(data) {
				res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
				res.simpleJSON(200, data);
			}
		);
	},

	'/all_keywords' : function (req, res) {
		var startDate = qs.parse(url.parse(req.url).query).sd;
		var endDate = qs.parse(url.parse(req.url).query).ed;
		getAllKeywords(startDate, endDate, {}, 0, function(data) {
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
			res.simpleJSON(200, data);
		});
	},

	'/postag' : function (req, res) {
		var text = qs.parse(url.parse(req.url).query).text;
		getPOSTags(text, function(data) {
			res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
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
}).listen(CONFIG['messageserver.port']);

console.log('Message server running at http://127.0.0.1:' + CONFIG['messageserver.port']);

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
	_esClient.search(CONFIG['es.index.name'], 'asr_chunk', query, {size: CONFIG['es.search.size'], from : offset , analyzer : 'text_nl'})
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
			if((offset + CONFIG['es.search.size']) >= data.hits.total) {
				//call back the client when all has been fetched.
				console.log('Got it all, calling back the client');
				var c = 0;
				for (k in keywords) {
					c++;
				}
				console.log('Unique keywords: '  + c);
				cb(keywords);
			} else {
				console.log('Fetching some more: ' + (offset + CONFIG['es.search.size']));
				getAllKeywords(startDate, endDate, keywords, offset + CONFIG['es.search.size'], cb);
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

function search(s, startDate, endDate, wordTypeFilters, results, offset, clusterInterval, cb) {
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
	_esClient.search(CONFIG['es.index.name'], 'asr_chunk', query, {size : CONFIG['es.search.size'], from : offset, analyzer : 'text_nl'})
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
				} else if((offset + CONFIG['es.search.size']) >= data.hits.total) {
					//all occurances of the search have been retrieved, now prepare the data for the next call
					console.log(data.hits.total + ' results found');
					var id = uuid.v4();
					var toBeFound = [];
					for (asrFile in results) {
						toBeFound.push(asrFile);
					}
					msgQueue[id] = {
						'toBeCalled' : toBeFound,
						'clientCallback' : cb,
						'keywords' : {},
						'search' : s,
						'wordTypeFilters' : wordTypeFilters
					};
					//for each segment find the surrounding keywords
					for (var key in results) {
						getSurroundingKeywords(id, key, results[key], clusterInterval);
					}
				} else {
					//if there are more results fetch them first, before going into the surrounding keyword fray
					search(s, startDate, endDate, wordTypeFilters,
						results, offset + CONFIG['es.search.size'], clusterInterval, cb);
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
function searchkw(startDate, endDate, sort, order, limit, wordTypeFilters, cb) {
	if(_dates == null) {
		//load all the dates with precalculated keywords in memory
		_dates = parseDates();
	}
	var rankedKeywords = [];
	var sd = startDate ? moment(startDate, 'DD-MM-YYYY') : null;
	var ed = endDate ? moment(endDate, 'DD-MM-YYYY') : null;
	var d = null;
	var kws = null;
	var kwCounts = {};
	var dateCount = 0;
	var inPeriod = false;
	//select the dates within the provided range
    for(dt in _dates) {
    	inPeriod = false;
    	d = _dates[dt];
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
    		dateCount++;
    	}
    }
    temp = [];
    //put all of the counted keywords of this period in a list so it can be sorted for the UI
    var freq = 0;
    var prediction = 0;
    var score = 0;
    var score2 = 0;
    for(kw in kwCounts) {
    	//THIS IS THE KEY PART OF THE ALGORITHM WHICH SHOULD BE IMPROVED
    	//prediction = _allKeywords[kw] / 100 * (dateCount / (_dates.length / 100));

    	freq = kwCounts[kw];

    	prediction = (parseFloat(_allKeywords[kw]) / parseFloat(_dates.length)) * parseFloat(dateCount);

    	if(Math.round(freq) != 0 && Math.round(prediction) != 0) {
    		score = Math.round(freq) / Math.round(prediction);
    	} else {
    		score = 0;
    	}

    	score2 = freq - prediction;

    	if(includeKeywordBasedOnWordType(kw, wordTypeFilters)) {
	    	temp.push({
	    		score : score,
	    		score2 : score2,
	    		freq : freq,
	    		prediction : prediction,
	    		word : kw,
	    		all : _allKeywords[kw],
	    		dateCount : dateCount,//FXIME this variable is completely meaningless for the client?
	    		alldates : _dates.length,
	    		type : _kwTypes[kw]
	    	});
	    }
    }

    //sort based on freq and prediction
    temp.sort(function(a, b){
    	if(order == 'desc') {
	    	if(sort == 'f') {
	    		return b.freq - a.freq;
	    	} else if (sort == 's') {
	    		return b.score - a.score;
	    	} else if (sort == 's2') {
	    		return b.score2 - a.score2;
	    	}
	    } else {
	    	if(sort == 'f') {
	    		return a.freq - b.freq;
	    	} else if (sort == 's') {
	    		return a.score - b.score;
	    	} else if (sort == 's2') {
	    		return a.score2 - b.score2;
	    	}
	    }
    });

    //call back
    cb(temp.slice(0, limit));
}

function includeKeywordBasedOnWordType(word, filters) {
	var wordType = _kwTypes[word];
	if(filters.includeNouns && filters.includeVerbs && filters.includeAdjectives && filters.includeAdverbs
		&& filters.includePronouns && filters.includeNumbers
		&& filters.includePrepositions && filters.includeDeterminers && filters.includeInterjections
		&& filters.includeConjunctions) {
		return true;
	}
	if(!filters.includeNouns && wordType.indexOf('noun') != -1) {
		return false;
	}
	if(!filters.includeVerbs && wordType.indexOf('verb') != -1) {
		return false;
	}
	if(!filters.includeAdjectives && wordType.indexOf('adj') != -1) {
		return false;
	}
	if(!filters.includeAdverbs && wordType.indexOf('adv') != -1) {
		return false;
	}
	if(!filters.includePronouns && wordType.indexOf('pro') != -1) {
		return false;
	}
	if(!filters.includeNumbers && wordType.indexOf('num') != -1) {
		return false;
	}
	if(!filters.includePrepositions && wordType.indexOf('pre') != -1) {
		return false;
	}
	if(!filters.includeDeterminers && wordType.indexOf('det') != -1) {
		return false;
	}
	if(!filters.includeInterjections && wordType.indexOf('int') != -1) {
		return false;
	}
	if(!filters.includeConjunctions && wordType.indexOf('con') != -1) {
		return false;
	}
	return true;
}

function getPOSTags(text, cb) {
	treeTagger.tagWord(text, function(wordType) {
		cb(wordType);
	});
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
		queries.push({size : '1000', index : CONFIG['es.index.name'], type : 'asr_chunk'});
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
		if(includeKeywordBasedOnWordType(k, queueItem.wordTypeFilters)) {//filter only the desired word types
			td.push({topic : k, type : _kwTypes[k], mediaItems : mi, itemCount : mi.length});
		}
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