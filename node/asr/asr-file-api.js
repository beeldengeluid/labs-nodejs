var http = require('http');
var url = require('url');
var fs = require('fs');
var xml2js = require('xml2js');

var BASE_DIR = '/Users/jblom/projects/woordnl/woordnl_semantics'; //change this ugly setting

module.exports = {
		
	getTranscriptTags : function(id, callerObj, callback) {		
		console.log('Getting tags for ' + id);
		
		var e = [];		
		var parser = new xml2js.Parser();
		fs.readFile(BASE_DIR + '/' + id, function(err, data) {
		    parser.parseString(data, function (err, result) {
		    	
		    	var temp = null;
		    	var entities = [];
		    	var start = -1;
		    	for(s in result.metadata.segments[0].speech) {		    		
		    		start = result.metadata.segments[0].speech[s]['$']['begintime'];
		    		entities = [];
		    		if(result.metadata.segments[0].speech[s].entities[0].entity) {
		    			
		    			console.log(result.metadata.segments[0].speech[s].entities[0].entity);
		    			
		    			temp = result.metadata.segments[0].speech[s].entities[0].entity;
		    			for (var i=0;i<temp.length;i++) {
		    				entities.push({'url' : temp[i]['$'].href, 'label' : temp[i]['$'].label, 'score' : temp[i]['$'].score});
		    			}
		    			e.push({'start' : start, 'entities' : entities});
		    		}
		    	}
		    	console.log(e);
		        console.log('Done');
		        callback({'msg' : callerObj, 'data' : e});
		    });
		});
			
	},
	
	getFileList : function(callerObj, callback) {		
		console.log('Getting the file listing of available transcripts');
		
		var e = [];		
		var parser = new xml2js.Parser();
		fs.readdir(BASE_DIR, function(err, data) {			
			callback({'msg' : callerObj, 'data' : data});
		});
			
	}

}