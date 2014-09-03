/*
 * http://www.cis.uni-muenchen.de/~schmid/tools/TreeTagger/#Linux
 * 
 * BETEKENIS VAN DE TAGS (morfocodes)
 * http://tst-centrale.org/images/stories/producten/documentatie/ehc_handleiding_nl.pdf
 * 
 * */

var sys = require('sys')
var exec = require('child_process').exec;
var child;
	
module.exports = {

		tagText : function(text) {
			child = exec('echo "'+text+'" | '+CONFIG['treetagger.cmd-dir']+'tree-tagger-dutch', function (error, stdout, stderr) {
				sys.print('stdout: ' + stdout);
				sys.print('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
				}
			});
		}
		
}