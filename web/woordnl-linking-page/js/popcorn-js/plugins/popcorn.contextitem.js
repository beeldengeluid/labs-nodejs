/**
 * The options contain:
 * 
 * options.time is the key to fetch the NE data from _nestimes
 */

(function (Popcorn) {
  Popcorn.plugin("contextitem", {
	//********************** SETUP **************************

	_setup : function(options) {
	  console.debug(options);
	  var i = options.index
	  //TODO add something to the options
	  
    },
    //********************** START **************************
    
    start: function(event, options) {
    	//TODO group every six items in a row (<div class="row">)
    	var html = [];
    	html.push('<div class="panel panel-default col-md-2 context-item">');
    	html.push('<div class="panel-body">');
    	html.push('<h6>'+options.text+'</h6>');
    	html.push('<img src="' + options.image + '" alt="' + options.text + '"/>');
    	html.push('</div></div>');
    	$('#' + options.target).append(html.join(''));
        $('#' + options.target + ' .context-item:last-child').fadeIn('slow');
    },
	//********************** END **************************
    
    end: function(event, options) {
    	//$('#' + options.target).html('OVER');
        //$('#' + options.target).hide('slow');
    }
  });
})(Popcorn);