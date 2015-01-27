Prerender
=========

Google, Facebook, Twitter, Yahoo, and Bing are constantly trying to view your website... but they don't execute javascript. Prerender is perfect for AngularJS SEO, BackboneJS SEO, EmberJS SEO, and any other javascript framework.

It should be used in conjunction with middleware libraries to serve the prerendered HTML to crawlers for SEO. 

Prerender adheres to google's _escaped_fragment_ proposal, which we recommend you use. It's easy:

    Just add <meta name="fragment" content="!"> to the <head> of all of your pages
    If you use hash urls (#), change them to the hash-bang (#!)
    That's it! Perfect SEO on javascript pages.

Prerender includes lots of plugins, for example using Amazon S3 to cache your prerendered HTML.
Prerender also starts multiple phantomjs processes to maximize throughput.

Install
-------

https://prerender.io/documentation

https://github.com/prerender/prerender

	$ git clone https://github.com/prerender/prerender.git
	$ cd prerender
	$ npm install
	$ node server.js

Open port
---------

	$ export PORT=1337 (default is port 3000)

Caching: Amazon Web Services
----------------------------

	$ export AWS_ACCESS_KEY_ID=<aws access key>
	$ export AWS_SECRET_ACCESS_KEY=<aws secret access key>
	$ export S3_BUCKET_NAME=<bucket name>
	$ export AWS_REGION=eu-west-1

Caching: MongoDB
----------------

https://github.com/lammertw/prerender-mongodb-cache

In your local prerender project run:

	$ npm install prerender-mongodb-cache --save

Then in the server.js that initializes the prerender:

	server.use(require('prerender-mongodb-cache'));


Installing on localhost
-----------------------

There might be some dependencies issues when installing this on your localhost.
You need Python (v2.7 recommended, v3.x.x is not supported) and a C++ compiler.
