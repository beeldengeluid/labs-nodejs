Woord.nl 
================================
whatevsss

In a nutshell: 

labs-nodejs contains two woord.nl apps, namely:
* woordnl-linking-server.js 
* woordnl-feed-contextualizer-server.js


[woordnl-linking-server.js]
--------------------------------

Used by /web/woordnl-linking-page and handles the fetching of:

* word frequencies (to generate word clouds in the UI)
* (timed) named entities (to show as wikilinks in the UI)
* (timed) Anefo links (to show them as a string of photos in the UI)

NOTE: 'timed' means there is a playout time available as well


NOTE! There are two versions of the playout page:
* /web/woordnl-linking-page/index_embed.html (the one you need!)
* /web/woordnl-linking-page/index.html (deprecated)



[woordnl-feed-contextualizer-server.js]
--------------------------------

Use by /web/woordnl-feed-contextualizer and handles the fetching of:

* different context sources (anefo, immix, woordnl)

TODO


Installation
================================



Dependancies
--------------------------------

[woordnl-linking-server.js]
--------------------------------

/context-finder/context-aggregator
* used to fetch the anefo resources (the photos from the National Archive)

/asr/asr-index-api
* to talk to the ElasticSearch index

/asr/asr-file-api	
* actually this is not used for the latest version (/web/woordnl-linking-page/index_embed.html)
* it is used by the old playout page /web/woordnl-linking-page/index.html


[woordnl-feed-contextualizer-server.js]
--------------------------------

TODO


Installing node modules
--------------------------------

**The easy way**

download the modules from the server (ask me)


**The proper way**

1 install npm

2 install the following packages for the playout page (woordnl-linking-server.js):	
* express 
* http-proxy 
* js-yaml
* node-uuid	

3 install the following packages for the feed contextualizer (woordnl-feed-contextualizer-server.js)
* express
* rssparse
* js-yaml
* node-uuid	



Configuration files
================================

[woordnl-linking-server.js]
--------------------------------

The config file is located in config/woordnl-linking-server.yml

NOTE: make sure to configure the correct ElasticSearch server.


[woordnl-feed-contextualizer-server.js]
--------------------------------

The config file is located in config/woordnl-feed-contextualizer.yml

NOTE: make sure to configure the correct ElasticSearch server.


Techinical references used for making this prototype
================================

TODO




[woordnl-feed-contextualizer bower]

Before being able to run the client side code. Please install bower and install the following packages from:

/web/woordnl-feed-contextualizer

	bower install jquery
	bower install angular#1.2.24
	bower install bootstrap
	bower install bootstrap-sass-official
	bower install chieffancypants/angular-hotkeys --save

