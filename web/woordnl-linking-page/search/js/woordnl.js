/* woord.nl client side js*/

function toMillis(sec) {
	var ms = sec * 1000 + "";
	if(ms.indexOf(".") == -1){
		return ms;
	} else {
		return ms.substring(0, ms.indexOf("."));
	}
}

function supportsHTML5Storage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

var woordnl = angular.module('woordnl', []);


/* Main controller */
woordnl.controller('searchCtrl', function ($scope) {
	
	$scope.TYPE_B_MAPPINGS = {'Thing' : 'default', 'Amount' : 'danger', 'Animal' : 'danger', 'Event' : 'warning', 
	'Function' : 'danger', 'Location' : 'primary', 'Organization' : 'success', 'Person' : 'info',
		'Product' : 'success', 'Time' : 'warning'}
	
	$scope.results = {};
	$scope.resultsPerASRFile = {};
	$scope.entities = [];
	$scope.asrFile = null;
	$scope.audioChunk = null;	
	$scope.allWords = null;	
	$scope.currentFragmentTime = 0;
	$scope.entities = {};
	$scope.loadingEntities = false;	
	
	$scope.search = function() {
		console.debug('searching stuff in ASR...');		
		$.ajax({
			type : 'GET',
			url : 'http://localhost:1337?s=' + $scope.s,
			dataType : 'jsonp',
			jsonp : 'callback',
			success : function(data) {
				$scope.processResults(data);
			},
			error : function (err) {
				console.debug(err);
			}
		});
	}
	
	$scope.getEntitiesOfTranscript = function() {
		console.debug('getting full transcript: ' + $scope.asrFile);
		var e = localStorage.getItem($scope.asrFile);
		if(e) {
			console.debug('Got the entities from cache!');
			$scope.safeApply(function() {
				var data = JSON.parse(e);
				$scope.entities = data.entities;
				$scope.allWords = data.sourceText;
			});
		} else {
			$scope.loadingEntities = true;
			$.ajax({
				type : 'GET',
				url : 'http://localhost:1337?asr=' + $scope.asrFile,
				dataType : 'jsonp',
				jsonp : 'callback',
				success : function(data) {
					console.debug(data);
					$scope.processEntities(data, true);
					$scope.$apply(function() {
						$scope.loadingEntities = false;
					});
				},
				error : function (err) {
					console.debug(err);
					$scope.$apply(function() {
						$scope.loadingEntities = false;
					});
				}
			});
		}
	}
	
	$scope.getEntitiesOfText = function(text) {
		console.debug('Getting entities for ASR text...');
		$scope.loadingEntities = true;
		$scope.entities = {};
		$.ajax({
			type : 'POST',
			url : 'http://localhost:1337',
			data : {
				'text' : text
			},
			dataType : 'jsonp',
			jsonp : 'callback',
			success : function(data) {
				$scope.processEntities(data, false);
				$scope.$apply(function() {
					$scope.loadingEntities = false;
				});
			},
			error : function (err) {
				console.debug(err);
				$scope.$apply(function() {
					$scope.loadingEntities = false;
				});
			}
		});
	}
	
	$scope.processResults = function(data) {
		if (data) {
			var results = {};
			var resultsPerASRFile = {};
			var res = null;
			$.each(data.hits.hits, function(key, value) {
				res = {
					id : value._id,
					asrFile : value._source.asr_file,
					mp3URL : 'http://os-immix-w/woord-nl-mp3/' + value._source.asr_file.split('.')[1] + '.mp3',
					asrChunk : value._source.words,
					wordTimes : value._source.wordTimes,
					occurances : $scope.getOccurances(value._source.words, value._source.wordTimes)
				}				
				results[value._id] = res;
				if(resultsPerASRFile[value._source.asr_file]){
					resultsPerASRFile[value._source.asr_file].push(res);
				} else {
					resultsPerASRFile[value._source.asr_file] = [res];
				}
			});
			/*
			results.sort(function(a, b){
				return a.asrFile - b.asrFile;
			});*/
			$scope.$apply(function() {
				$scope.results = results;
				$scope.resultsPerASRFile = resultsPerASRFile;
			});
		}
	}
	
	/*
	 * This function is called to visualize the results from $scope.getEntitiesOfText() and $scope.getEntitiesOfTranscript()
	 */
	$scope.processEntities = function(data, fullTranscript) {
		if (data) {
			var entities = {};
			$.each(data.entities, function(key) {
				if(entities[data.entities[key].label]) {
					entities[data.entities[key].label].count++;
				} else {
					entities[data.entities[key].label] = {obj : data.entities[key], count : 1};
				}
			});
			$scope.$apply(function() {
				$scope.entities = entities;
				if(fullTranscript) {
					$scope.allWords = data.sourceText;
				}
			});
			if (supportsHTML5Storage()) {
				localStorage.setItem($scope.asrFile, JSON.stringify({'entities' : entities, 'sourceText' : data.sourceText}))
			}
		}
	}
	
	$scope.isEntity = function (word) {
		return $scope.entities[word] ? true : false;
	}
	
	$scope.isDBpediaLink = function(uri) {
		return uri.indexOf('dbpedia') != -1;
	}
	
	$scope.getOccurances = function(asrChunk, wordTimes) {
		if(asrChunk && wordTimes) {
			var words = asrChunk.split(' ');
			var times = wordTimes.split(' ');
			var o = [];
			for (w in words) {
				if(words[w] == $scope.s) {
					o.push(times[w]);
				};
			}
			return o;
		}
		return [];
	}
	
	/* VIDEO READ UP: 
	 * - http://www.w3schools.com/tags/ref_av_dom.asp
	 * - 
	 */

	$scope.onLoadedData = function(e) {
		if(!e) {
			e = window.event;
		}
		console.debug('Player data loaded!')
		$scope.seek(toMillis($scope.currentFragmentTime) / 1000);
		$scope.player.play();
	}
	
	$scope.onLoadStart = function(e) {
		console.debug('loading...');
	}
	
	$scope.onStalled = function(e) {
		console.debug('stalled...');
	}
	
	$scope.seek = function(millis) {	
		console.debug('going to: ' + millis)
		$scope.player.currentTime = millis / 1000;
	}
	
	$scope.setAudioChunk = function(id) {
		$scope.audioChunk = $scope.results[id];
		
		//get the entities based on the chunk only (TODO change later to make sure to check the entire ASR file blah blah)
		$scope.getEntitiesOfText($scope.audioChunk.asrChunk);
		
		//activate later again for playout
		if(1 == 2) {
			$scope.player = document.getElementById('player');	
			$scope.player.addEventListener('loadeddata', $scope.onLoadedData, false);
			$scope.player.addEventListener('loadstart', $scope.onLoadStart, false);
			$scope.player.addEventListener('stalled', $scope.onStalled, false);
			canPlayMP3 = (typeof $scope.player.canPlayType === "function" && $scope.player.canPlayType("audio/mpeg") !== "");
			if (canPlayMP3) {
				$scope.currentFragmentTime = toMillis($scope.audioChunk.occurances[0]);
				$scope.player.load();
			} else {
				alert('Your browser does not support mp3...');
			}
    	}
	}
	
	$scope.setASRFile = function(asrFile) {
		$scope.asrFile = asrFile;
		//get the entities based on the entire transcript
		$scope.getEntitiesOfTranscript();
	}
	
	$scope.gotoOnlineRepresentation = function(uri) {
		window.open(uri);
	}
	
	$scope.safeApply = function(fn) {
		var phase = this.$root.$$phase;
		if(phase == '$apply' || phase == '$digest') {
			if(fn && (typeof(fn) === 'function')) {
				fn();
			}
		} else {
			this.$apply(fn);
		}
	};

});