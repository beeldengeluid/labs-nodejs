module.exports = {
	
	/**
	 * return either: Thing, (Product), Person, (Organization), Location
	 */
	getNormalizedEntityType : function(type, service) {
		if(service == 'nerd') {
			if(type) {
				if(type.indexOf('http://nerd.eurecom.fr/ontology#') != -1) {
					return type.substring('http://nerd.eurecom.fr/ontology#'.length);
				}
			}
		} else if(service == 'xtas') {
			if(type) {
				if(type == 'ORG') { 
					return 'Organization';
				} else if(type == 'LOC') { 
					return 'Location';
				} else if(type == 'PER') { 
					return 'Person';
				} else if(type == 'MISC') { 
					return 'Thing';
				} else if(type == 'UNKNOWN') {
					return 'Thing';
				} else {
					console.log('==================> NEW XTAS TYPE: ' + type);
				}
			}
		}
		return 'unknown';
	},
	
	/**
	 * In case the label contains more than one word, just pick the first word... (bad solution, but for now it helps)
	 */
	getNormalizedEntityLabel : function(label) {
		//if(label.indexOf(' ') == -1) {
			return label;
		//}
		//return label.split(' ')[0];
	},
	
	/**
	 * Possible entityTypes: Thing, Person, Location
	 */
	getKeywordsOfType : function(query, entityType, startsWithCapitalLetter, amount) {
		if(query.entities && query.entities[entityType]) {
			if(amount) {
				if (query.entities[entityType].length >= amount) {
					return query.entities[entityType].slice(0, amount); 
				}
			}
			return query.entities[entityType];
			
		}
		return null;
	},
	
	getMostFrequentWords : function(query, amount) {
		if(query.wordFreqs) {
			if(amount) {
				if (query.wordFreqs.length >= amount) {
					return query.wordFreqs.slice(0, amount); 
				}
			} 
			return query.wordFreqs;
		}
		return null;
	}
		
}