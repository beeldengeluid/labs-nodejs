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

	$scope.monthly = null;
	$scope.keywords = null;

	$scope.init = function() {
		$('#anchor_tabs a').click(function (e) {
			console.debug('yes??')
			e.preventDefault();
			$(this).tab('show');
		});
	}

	$scope.searchTopic = function(topic) {
		$scope.s = topic;
		$scope.search();
	}

	/**
	 * Sends a search request to the server and returns an object with ASR segments and keywords
	 */
	$scope.search = function() {
		var url = '/andernieuws/search?s=' + $scope.s;
		if($scope.startDate) {
			url += '&sd=' + $scope.startDate;
		}
		if($scope.endDate) {
			url += '&ed=' + $scope.endDate;
		}
		if($scope.interval) {
			url += '&i=' + $scope.interval;
		}
		$scope.loading = true;
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: url,
			error: function (err) {
				$scope.loading = false;
			},
			success: function (data) {
				$scope.processResults(data);
			}
		});
	}

	$scope.processResults = function(data) {
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

	$scope.loadMonthlyKeywords = function() {
		$scope.monthly = null;
		var url = '/andernieuws/searchkeywords?t=0';
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: '/andernieuws/resources/monthly-keywords.json',
			error: function (err) {
				console.debug(err);
				$scope.loading = false;
			},
			success: function (data) {
				$scope.showMontlyKeywords(data);
			}
		});
	}

	$scope.searchKeywords = function() {
		$scope.keywords = null;
		var url = '/andernieuws/searchkw?l=50'
		if($scope.startDate) {
			url += '&sd=' + $scope.startDate;
		}
		if($scope.endDate) {
			url += '&ed=' + $scope.endDate;
		}
		$scope.loading = true;
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: url,
			error: function (err) {
				$scope.loading = false;
			},
			success: function (data) {
				$scope.showKeywords(data);
			}
		});
	}

	$scope.showMontlyKeywords = function(data) {
		$scope.$apply(function(){
			$scope.monthly = data;
			$scope.loading = false;
		});
	}

	$scope.showKeywords = function(data) {
		$scope.$apply(function(){
			$scope.keywords = data;
			$scope.loading = false;
		});
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

	//load the monthly keywords

	$scope.loadMonthlyKeywords();

}]);