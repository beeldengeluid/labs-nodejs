angular.module('andernieuws').controller('searchCtrl', ['$scope', 'audioPlayer', function ($scope, audioPlayer) {
	
	$scope.results = {};
	$scope.resultsPerASRFile = {};
	$scope.entities = [];
	$scope.asrFile = null;
	$scope.audioChunk = null;
	$scope.allWords = null;
	$scope.currentFragmentTime = 0;
	$scope.entities = {};
	$scope.loadingEntities = false;
	$scope.overallKeywordStatistics = null;
	$scope.keywordsPerTranscript = null;
	$scope.audioPlaying = false;
	$scope.audioLoaded = false;
	
	$scope.searchTopic = function(topic) {
		$scope.s = topic;
		$scope.search();		
	}	
	
	/**
	 * Sends a search request to the server and returns an object with ASR segments and keywords
	 */
	$scope.search = function() {
		console.debug('searching stuff in ASR...');	
		$scope.loading = true;		
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: '/andernieuws/search?s=' + $scope.s,
			error: function (err) {
				$scope.loading = false;
			},
			success: function (data) {
				$scope.processResultsNew(data);
			}
		});
	}
	
	$scope.processResultsNew = function(data) {
		if(!data.message) {
			$scope.$apply(function() {
				$scope.loading = false;
				$scope.numTopics = data.length;
				$scope.topicData = data;
			});
		} else {
			//the search engine did not find anything or returned an error
			$scope.$apply(function() {
				$scope.loading = false;
				$scope.numTopics = 0;
				$scope.topicData = null;
			});
		}
	}
	
	/**
	 * @depreacted Processes the data obtained by the search call, so it's suitable for display
	 */
	$scope.processResults = function(data) {
		if (data && data.ASRChunks) {
			console.debug(data);
			//set the result total
			$scope.resultTotal = data.ASRChunks.hits.total;
			
			var results = {};
			var resultsPerASRFile = {};
			var res = null;
			
			//group relevant keywords per transcript
			$scope.calculateKeywordsPerTranscript(data.keywords);
			
			//convert ES response data into the client model
			$.each(data.ASRChunks.hits.hits, function(key, value) {
				res = {
					id : value._id,
					asrFile : value._source.asr_file,
					mp3URL : 'http://os-immix-w/woord-nl-mp3/' + value._source.asr_file.split('.')[1] + '.mp3',
					asrChunk : value._source,
					keywords : $scope.getKeywords(value._source.keywords),
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
	
	$scope.getKeywords = function(keywordData) {
		var keywords = [];
		if (keywordData) {
			for(k in keywordData) {
				keywords.push(keywordData[k].word);
			}
			return keywords;
		}
		return null;
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
	
	$scope.playFragment = function(mediaItem) {
		audioPlayer.play(mediaItem.audioUrl, mediaItem.spokenAt[0][0] / 1000);
		$scope.audioPlaying = true;
		$scope.audioLoaded = true;
	}
	
	$scope.toggleAudio = function() {
		if($scope.audioLoaded) {
			if (audioPlayer.isPlaying()) {
				audioPlayer.pause();
				$scope.audioPlaying = false;
			} else {
				audioPlayer.play();
				$scope.audioPlaying = true;
			}
		}
	}
	
	$scope.getKeywordClass = function(freq) {		
		var cl = 'primary';
		switch(freq) {
			case 1: cl = 'primary';break;
			case 2: cl = 'success';break;
			case 3: cl = 'warning';break;
		}
		return freq > 3 ? 'danger' : cl;
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

}]);