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

var CONFIG = {};
CONFIG['treetagger.cmd-dir'] = '';

module.exports = {

		tagText : function(text, cb) {
			var command = 'echo "'+text+'" | '+CONFIG['treetagger.cmd-dir']+'tree-tagger-dutch';
			console.log(command);
			child = exec(command, function (error, stdout, stderr) {
				sys.print('stdout: ' + stdout);
				sys.print('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
					cb(null);
				} else {
					cb(stdout);
				}
			});
		},

		tagWord : function(text, cb) {
			if(text.indexOf(' ') == -1) {
				this.tagText(text, function(res) {
					if(res.indexOf('noun') != -1) {
						cb('noun');
					} else if(res.indexOf('verb') != -1) {
						cb('verb');
					} else {
						cb(null);
					}
				});
			}
		}



}