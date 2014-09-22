/* Mapping object. 
	- It reads the mapping document from VPRO.
	- Creates an object that, given any ID available, can be queried for:
			- Media ID, POMS-ID (is the same as woord.nl) and MMBase-ID
			- Title information
			- Date information
*/
var mappingFile = '../resources/mapping-woordnl/MGNL11326.txt';

module.exports = {

	readMappingFile : function() {
		var fileData = fs.readFileSync(mappingFile, 'utf8');
		var mappingObj = {};
		var data_arr = fileData.split('\r\n');
		var line = null;
		for (key in data_arr) {
			if (parseInt(key)<2) {	// don't use header
				continue;
			}
			line = data_arr[key].split("|");
			if(line && line[0] && line[1]) {
				var item = {
					mmbaseID : line[0].trim(),
					pomsID : line[1].trim(),
					mediaID : line[2].trim(),
 					mediaUrl : line[3].trim()
				}
				mappingObj[item.mmbaseID] = item;
			}
		}
		return mappingObj
	}
	
	/*
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
	*/
};