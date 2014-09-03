var woordnlContextFinder = require('./woordnl-context-finder'),
	immixContextFinder = require('./immix-context-finder'),
	anefoContextFinder = require('./anefo-context-finder');

var msgQueue = {};

module.exports = {		
		
	queryContexts : function(query, msg, sources, callback) {
		//add all the sources to the (to be) called array
		msgQueue[msg.id] = {'toBeCalled' : sources, 'msg' : msg, 'callback' : callback, 'data' : {}};
		
		//for each source call the corresponding context finder
		for(s in sources) {
			switch(sources[s]) {
				case 'woordnl' : 
					woordnlContextFinder.search(query, msg, this.contextFetched.bind(this));
					break;					
				case 'immix' :	
					immixContextFinder.search(query, msg, this.contextFetched.bind(this));
					break;
				case 'anefo' :	
					anefoContextFinder.search(query, msg, this.contextFetched.bind(this));
					break;
			}
		}
	},
	
	contextFetched : function(msg, queryString, data, source) {
		if(msgQueue[msg.id]) {
			//aggregate the results to the return data (as JSON object)
			if(data == null) {
				msgQueue[msg.id].data[source] = {'queryString' : queryString, 'data' : null};
			} else {
				msgQueue[msg.id].data[source] = {'queryString' : queryString, 'data' : data};
			}
						
			//mark the context source as finished
			msgQueue[msg.id].toBeCalled.splice(msgQueue[msg.id].toBeCalled.indexOf(source), 1);			
			
			//when all context data is available call back the service with the aggregated data
			if(msgQueue[msg.id].toBeCalled.length == 0) {
				//call back the service
				msgQueue[msg.id].callback(msgQueue[msg.id]);
				//remove the message from the queue
				delete msgQueue[msg.id];
			}
		}
	}

}