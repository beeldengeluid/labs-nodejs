/* http://www.blastcasta.com/
 * http://www.no-margin-for-errors.com/blog/2010/07/26/deliver-real-time-information-to-your-users-using-node-js/
 * http://expressjs.com/api.html#middleware
 * http://blog.nemikor.com/2010/05/21/long-polling-in-nodejs/
 *
 * http://www.nu.nl/feeds/rss/tag/amsterdam.rss ---> werkt in zekere zin wel
 * http://www.nu.nl/feeds/rss/tag/olie.rss ---> parse error in index.js van http-proxy
 *
 * ANEFO
 * http://www.gahetna.nl/beeldbank-api/opensearch/?q=3.18.20&count=100&startIndex=1
 * http://www.gahetna.nl/beeldbank-api/opensearch/description-document
 *
 * PAPERS over IR:
 * http://ciir.cs.umass.edu/publications/index.html
 *
 * OPMERKELIJK:
 * - in NERD zit een bug waardoor soms de verkeerde entities terug worden gegeven
 *
 * http://www.cis.uni-muenchen.de/~schmid/tools/TreeTagger/
 * http://www.cis.uni-muenchen.de/~schmid/tools/TreeTagger/#Linux
 * http://tst-centrale.org/images/stories/producten/documentatie/ehc_handleiding_nl.pdf
 *
 *
 * http://semanticize.uva.nl/dev/nl?learning=OAIR2013.nSVM&context=276.35818555.asr1.hyp-SPK02-003-test1&text=wij%20wonen%20allemaal%20in%20een%20klein%20landje&normalize=lower,dash&filter=learningProbability&gt;=0
 *
 * */

var http = require("http"),
    sys = require("sys"),
    url = require("url"),
    fs = require("fs"),
    qs = require("querystring"),
    httpProxy = require("http-proxy"),
    parser = require('rssparser'),
    yaml = require('js-yaml'),
    uuid = require('node-uuid'),
    textAnalyzer = require('./tools/text-analyzer'),
    nerdAnalyzer = require('./tools/nerd-analyzer'),
    xtasAnalyzer = require('./tools/xtas-analyzer'),
    queryAnalyzer = require('./tools/query-analyzer'),
    treeTagger = require('./tools/tree-tagger'),
    contextAggregator = require('./context-finder/context-aggregator');

//**************************************************************************************************************
//READ CONFIGURATION FROM YAML
//**************************************************************************************************************

try {
	CONFIG = yaml.safeLoad(fs.readFileSync('./config/woordnl-feed-contextualizer.yml', 'utf8'));
	console.log(CONFIG);
} catch (e) {
	console.log(e);
}

//**************************************************************************************************************
//STATIC PAGE SERVER & PROXY FOR THE MESSAGE SERVER
//**************************************************************************************************************

var MESSAGE_SERVER = 'http://localhost:' + CONFIG['message-server.port'];

var proxy = httpProxy.createProxyServer({});
var express = require('express');
var app = express();

proxy.on('error', function(err) {
	console.log('Proxy error:');
	console.log(err);
});

/* Is called in order to add an entire RSS feed to the list of items */
app.get('/add_rss_feed', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

/* Is called in order to add a new item to the feed list */
app.post('/add_feed_item', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

/* Is polled to get the latest item from the list */
app.get('/real_time_feed', function(req, res) {
	proxy.web(req, res, { target: MESSAGE_SERVER });
});

/* Serves the static content */
app.use('/', express.static('../web/woordnl-feed-contextualizer'));


app.listen(CONFIG['proxy-server.port'], function(err) {
	if (err) {
		return cb(err);
	}

	//only needed when started as root (needed for ports below 2014)
	if(parseInt(CONFIG['proxy-server.port']) < 1024) {
		//Find out which user used sudo through the environment variable
		var uid = parseInt(process.env.SUDO_UID);

	    //Set our server's uid to that user
		if (uid) {
			process.setuid(uid);
		}
		console.log('Server\'s UID is now ' + process.getuid());
	}
});

console.log('Static content served at http://127.0.0.1:' + CONFIG['proxy-server.port']);


//**************************************************************************************************************
//MESSAGE SERVER
//**************************************************************************************************************

//load the stopwords into memory
var STOP_WORDS = textAnalyzer.readStopWordsFile(CONFIG['file.stopwords']);

//load the corpus term frequencies into memory
var IDF_SCORES = textAnalyzer.readIDFFile(CONFIG['file.idf']);

/**
 * Contains all the possible calls to the message server and maps them to handlers
 */
var urlMap = {
	'/real_time_feed' : function (req, res) {
							var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
							feed.query(since, function(data) {
								res.simpleJSON(200, data);
							});
						},
	'/add_feed_item' : function (req, res, json) {
							feed.appendMessage(JSON.parse(json));
							res.simpleJSON(200, {});
						},
	'/add_rss_feed' : function (req, res) {
							var url_parts = url.parse(req.url, true);
							if (url_parts.query['url']) {
								feed.appendRSSFeed(url_parts.query['url']);
							}
							res.simpleJSON(200, {});
						}
}

/**
 * Creates and starts the actual message server
 */

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
}).listen(CONFIG['message-server.port']);

console.log('Server running at http://127.0.0.1:' + CONFIG['message-server.port']);

/**
 * Used whenever a 404 response needs to be returned
 */

function notFound(req, res) {
	res.setHeader(404, [ ["Content-Type", "text/plain"], ["Content-Length", CONFIG['message-server-not-found-message'].length]]);
	res.write(CONFIG['message-server-not-found-message']);
	res.end();
}

/**
 * This object contains all functions related to the processing of (RSS) messages
 */
var feed = new function () {
	var real_time_items = [];
	var callbacks = [];
	var analysis_requests = [];

	this.appendRSSFeed = function(feedURL) {
		parser.parseURL(feedURL, {}, function(err, out) {
			if(err) {
				console.log(err)
			}
			else if(out) {
				//Add the feed items to the list of messages
				for (var i=0;i<out['items'].length;i++) {
					this.addProcessedMessage(out['items'][i]);
				}
			} else {
				console.log('Nothing found in feed');
			}
		}.bind(this));
	};

	this.appendMessage = function(json) {
		// Append the new item.
		this.addProcessedMessage(json);
	};

	this.addProcessedMessage = function(msg) {
		//Set the uuid of each message
		msg.id = uuid.v4();
		//Get the most notable words ordered by 'importance' (for details, see text-analyzer.js)
		// console.log(msg.title+'\n');
		// console.log(msg.summary+'\n');

		var cleanText = textAnalyzer.cleanupText(msg.title + ' ' + msg.summary);
		msg.wordFreqs = textAnalyzer.getMostImportantWords(cleanText, STOP_WORDS, IDF_SCORES, true);

		//TODO find a way to utilize this. Also compare it too what xTas does
		//treeTagger.tagText(msg.wordFreqs.join(' '));

		//If configured, call the NER service to fetch entities (both services don't work anymore...)
		if(CONFIG['service.ner'] == 'nerd') {
			nerdAnalyzer.executeNEROnText(cleanText, msg, this.messageAnalyzed.bind(this));
		} else if(CONFIG['service.ner'] == 'xtas') {
			xtasAnalyzer.executeNEROnText(msg.id, cleanText, 'labs', msg, this.messageAnalyzed.bind(this));
		} else {
			this.messageAnalyzed(msg, {'entities' : {}, 'sourceText' : ''});
		}
	}

	this.messageAnalyzed = function(msg, analysis) {
		var query = {};
		msg.entities = analysis ? analysis.entities : {};

		//construct the query object
		query = {'entities' : msg.entities, 'wordFreqs' : msg.wordFreqs};

		var sources = [];
		sources.push.apply(sources, CONFIG['context-sources']);

		//query all of the desired contexts (TODO add configurability latorrrr)
		contextAggregator.queryContexts(query, msg, sources, this.processedMessageComplete.bind(this));
	}

	this.processedMessageComplete = function(aggregatedData) {
		if(aggregatedData) {
			var msg = aggregatedData.msg;
			var data = aggregatedData.data;

			//Add the time the message was added
			msg.timestamp = new Date().getTime();

			//Add the data (also containing the query) to the message
			msg.related = data;

			real_time_items.push(msg);

			// Make sure we don't flood the server
			while (real_time_items.length > CONFIG['message-cache-size']) {
				real_time_items.shift();
			}

			//Push the message to the clients
			this.pushMessages();
		}
	}

	this.pushMessages = function() {
		// As soon as something is pushed, call the query callback
		while (callbacks.length > 0) {
			var cb = callbacks.shift();
			var data = this.getMessagesSince(cb.timestamp);
			cb.callback(data);
		}
	};

	this.getMessagesSince = function(since) {
		var matching = [];
		for (var i = 0; i < real_time_items.length; i++) {
			var real_time_item = real_time_items[i];
			if (real_time_item.timestamp > since) {
				matching.push(real_time_item);
			}
		}
		return matching;
	}

	this.query = function (since, callback) {
		var matching = this.getMessagesSince(since);

		//if there are messages immediately send them back to the caller
		if (matching.length != 0) {
			callback(matching);
		} else {
			//otherwise put the caller in the wait queue
			callbacks.push({timestamp: new Date().getTime(), callback: callback});
		}
	};

	setInterval(function() {
		// close out requests older than 15 seconds
		var expiration = new Date().getTime() - CONFIG['long-poll.interval'];
		for (var i = callbacks.length - 1; i >= 0; i--) {
			if (callbacks[i].timestamp < expiration) {
				callbacks[i].callback("");
				callbacks.splice(i, 1);
			}
		}
	}, 1000);
};
