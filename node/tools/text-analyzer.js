fs = require('fs');
sanitizeHtml = require('sanitize-html');

module.exports = {
	
	wordsGrandTotal : -1,

	readStopWordsFile : function(stopWordsFile) {

		if (!stopWordsFile) {
			return null;
		}
		var fileData = fs.readFileSync(stopWordsFile, 'utf8');
		var stopWords = {};
		var data_arr = fileData.split('::');
		for (key in data_arr) {
			word = data_arr[key].trim().replace('\r');
			stopWords[word] = 1;
		}
		return stopWords;
	},

	readIDFFile : function(IDFFile) {
		// uses the .idf file data
		if (!IDFFile) {
			return null;
		}
		var fileData = fs.readFileSync(IDFFile, 'utf8');
		var idf = {};
		var data_arr = fileData.split('\n');
		var line = null;
		for (key in data_arr) {
			line = data_arr[key].split('\t');
			if(line && line[0] && line[2]) {
				idf[line[0].trim().toLowerCase()] = parseFloat(line[2].trim());
			}
		}
		return idf;
	},
				
	getMostImportantWords : function(text, stopWords, IDFScores, isCleanText, minwordlength, simpleList) {
	    if(text == null || text == '') {
	        return null;        
	    }
	    var minwordlength = minwordlength ? minwordlength : 5;
	    var simpleList = simpleList ? simpleList : true;
	    var results_sorted = null;
	    var allwords = {};
	    var results = [];

	    console.log('=============== GetMostImportantWords');
	    //delete all punctuation marks from the text
	    if(!isCleanText) {
	    	text = this.cleanupText(text);
	    }

	    //split up the text in separate words and calculate the frequency of each word (+ the total number of words)
	    var textWords = text.split(/[ ]+/);
		for (i=0;i<textWords.length;i++) {
			word = unescape(textWords[i].toLowerCase());
	        //collect overall word statistics
	        if (!allwords[word]) {
	            allwords[word] = 1
	        } else {
	            allwords[word] += 1
	        }
	    }
	    //if there are IDF scores available use these, otherwise simply use the term frequencies of this document
	    IDFScores = IDFScores ? IDFScores : allwords;
	    
	    //determine the final relevancy score for each word
	    for (word in allwords) {
	        //Check for stopwords and wordlength.
	        if(stopWords && stopWords[word]) {
	            continue;
	        }
	        if(word.length < minwordlength) {
	            continue;
	        }
	        
	        //term frequency-inverse document frequency.
	        var wordFreq = allwords[word];
            var tf = parseFloat(wordFreq) / textWords.length;
			
			var idf = IDFScores[word];
			if (idf === undefined) {
				console.log('New word: '+word);
				idf = 16.11809565;	// equals Math.log(10000000), the same as words that appear in one document only
			}
			
			var tfidf = tf*idf;
			
			// var lengthRelevancy = word.length - minwordlength / minwordlength;
			// console.log(word, lengthRelevancy);
            var largedecision = tfidf * word.length;
            results.push([word, largedecision, wordFreq]);
	    }
		//sort the list by highest score
	    results_sorted = results.sort(function(a, b){return b[1]-a[1]});
		console.log('\n = HIGHEST SCORES =');
		var highestLen = results_sorted.length <= 10 ? results_sorted.length : 10;	// max 10 words
		for (i=0;i<highestLen;i++) {
			console.log(results_sorted[i]);
		}
	    
	    // By default, just return the most frequent words in a simple list without scores
	    if(simpleList && results_sorted) {
	        var fws = [];
	        for(key in results_sorted) {
	            fws.push(results_sorted[key][0]);
	        }
	        return fws;
	    }
	    
	    //Otherwise return the list containing all information
	    return results_sorted;
	},
	
	cleanupText : function(dirty) {
		// preprocess headings, because sanitize will not add space.
		dirty = dirty.replace(/<\/h1>/g," </h1>");
		dirty = dirty.replace(/<\/h2>/g," </h2>");
		dirty = dirty.replace(/<\/h3>/g," </h3>");
		dirty = dirty.replace(/<\/em>/g," </em>");
		var clean = sanitizeHtml(dirty, {
			allowedTags: [],
			allowedAttributes: {}
		});
		// http://feeds.nos.nl/nosnieuwsalgemeen
		// http://www.nu.nl/feeds/rss/algemeen.rss
		// http://www.commit-nl.nl/rss
		// http://www.nrc.nl/rss.php : gaat fout met: &#8216;
		// http://www.nu.nl/feeds/rss/werk-en-prive.rss

		clean = clean.replace(/&#\d{2-4};/g, " ");	//escape html escape character codes
	    clean = clean.replace(/[,#!%&;:=_`\'~\"\t\n]/g, " ");
		clean = clean.replace(/[\-\[\]\.\/\+\?\|\(\)\{\}\\\^\*\$]/g," ");
		// console.log(clean+'\n\n');
		return clean;
	}
};
