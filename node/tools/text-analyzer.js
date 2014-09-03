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
		if (!IDFFile) {
			return null;
		}
		var fileData = fs.readFileSync(IDFFile, 'utf8');
		var wordFreqs = {};
		var data_arr = fileData.split('\n');
		var line = null;
		for (key in data_arr) {
			line = data_arr[key].split(' ');
			if(line && line[0] && line[1]) {
				wordFreqs[line[0].trim()] = parseInt(line[1].trim());
			}
		}
		return wordFreqs;
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
	    var totalWordCount = 0;
	    
	    //delete all punctuation marks from the text
	    if(!isCleanText) {
	    	text = this.cleanupText(text);
	    }
	    
	    //split up the text in separate words and calculate the frequency of each word (+ the total number of words)
	    var word_arr = text.split(' ');	    
	    
	    //for tf-idf calculations
	    if(this.wordsGrandTotal == -1) {
	    	for(key in IDFScores) {
	    		this.wordsGrandTotal += IDFScores[key];
	    	}
	    }
	    var thisDocGrandTotal = word_arr.length;	   
        var docCount = parseFloat(this.wordsGrandTotal/thisDocGrandTotal)
	    
	    var wordID = null;
	    for(key in word_arr) {
	        totalWordCount += 1;
	        wordID = word_arr[key];//.toLowerCase();
	        
	        //collect overall word statistics
	        if (!allwords[wordID]) {
	            allwords[wordID] = 1
	        } else {
	            allwords[wordID] += 1
	        }
	    }
	    
	    //if there are IDF scores available use these, otherwise simply use the term frequencies of this document
	    IDFScores = IDFScores ? IDFScores : allwords;
	    
	    //determine the final relevancy score for each word
	    for (key in allwords) { // key = a word
	        //Check for stopwords and wordlength.
	        if(stopWords && stopWords[key.toLowerCase()]) {
	            continue;
	        }
	        if(key.length < minwordlength) {
	            continue;
	        }
	        
	        //term frequency-inverse document frequency.
	        var key_freq = allwords[wordID];
	        var numDocsContaining = 1.0;
	        if(IDFScores[key]) {	        	
	        	numDocsContaining = (parseFloat(key_freq) / IDFScores[key]) * docCount;
	        }
            var tf = parseFloat(key_freq) / thisDocGrandTotal;
            var idf = Math.log(docCount/numDocsContaining);
            var largedecision = tf * idf * key.length;
            results.push([key, largedecision, key_freq]);
            
	        /*
	        var tfidf = parseFloat(IDFScores[key]) / totalWordCount * 100;
	        var freq = allwords[key];
	        var largedecision = freq * tfidf * parseFloat(key.length);
	        results.push([key, largedecision, freq]);*/
	        
	    }
	    
	    //sort the list by highest score
	    results_sorted = results.sort(function(a, b) {
	    	if (a[1] && b[2]) {
	    		return a[1] - b[1];
	    	}
	    });
	    
	    //By default, just return the most frequent words in a simple list without scores
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
		var clean = sanitizeHtml(dirty, {
			allowedTags: [],
			allowedAttributes: {}
		});
	    clean = clean.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`'~()]/g,"");
		return clean;
	}
  
};