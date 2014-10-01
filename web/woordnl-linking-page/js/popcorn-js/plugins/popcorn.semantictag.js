/**
 * The options contain:
 * 
 * options.time is the key to fetch the NE data from _nestimes
 */

(function (Popcorn) {
  Popcorn.plugin("semantictag", {

	_setup : function(options) {
	  //
    },
    
    start: function(event, options) {
    	options.callback(options.start);
    	        
    },
    
    end: function(event, options) {
    	//
    }
  });
})(Popcorn);