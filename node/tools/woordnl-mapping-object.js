/* Mapping object. 
	- It reads the mapping document from VPRO.
	- Creates an object that, given any ID available, can be queried for:
			- Media ID, POMS-ID (is the same as woord.nl) and MMBase-ID
			- Title information
			- Date information
			- Tag information
	Usage: create object using node require module: 
			for example: wmo = require('./woordnl-mapping-object');
			use utility function like this:
				var asrID = '39847574';
				console.log(wmo.getDate(asrID));
				console.log(wmo.getPublishStart(asrID));
				console.log(wmo.getBroadcasters(asrID));
				console.log(wmo.getDuration(asrID));
				console.log(wmo.getURN(asrID));
				console.log(wmo.getTitleMain(asrID));
				console.log(wmo.getTitleSub(asrID));
				console.log(wmo.getTags(asrID));
*/

var mappingFile = '../resources/mapping-woordnl/mapping-woordnl.json';
var jsontext = fs.readFileSync(mappingFile, 'utf8');
var mappingObj = JSON.parse(jsontext);

function testModule() {
	for (key in mappingObj) {
		console.log(mappingObj[key].sortDate);
		console.log(mappingObj[key].publishStart);
		// console.log(getCreationDate(key));	// not working, see 'node exports'
		
		console.log(mappingObj[key].titles);
		titles = mappingObj[key].titles;
		for (i=0; i<titles.length;i++) {
			console.log(titles[i].type,titles[i].value);
		}
		console.log(mappingObj[key].broadcasters);
		console.log( mappingObj[key].duration);
		console.log( mappingObj[key].urn);
		console.log(mappingObj[key].tags);
		break;
	}
};
// testModule();

function getTitle(key, type) {
	var type = type ? type : "MAIN";
	var title = "";
	titles = mappingObj[key].titles;
	for (i=0; i<titles.length;i++) {
		if (titles[i].type == type) {
			title = titles[i].value;
			break;
		}
	}
	return title;
};

module.exports = {
	/* Use these to get the properties using the mmbaseID as key.
	*/
	getDate : function(key) {
		return mappingObj[key].sortDate;
	},
	getPublishStart : function(key) {
		return mappingObj[key].publishStart;
	},
	getBroadcasters : function(key) {
		return mappingObj[key].broadcasters;
	},
	getDuration : function(key) {
		return mappingObj[key].duration
	},
	getURN : function(key) {
		return mappingObj[key].urn
	},
	getTags : function(key) {
		return mappingObj[key].tags
	},
	getTitleMain : function(key) {
		return getTitle(key,"MAIN");
	},
	getTitleSub : function(key) {
		return getTitle(key,"SUB");
	}
};