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
	$scope.kwGroups = null;
	$scope.sortByScore = false;

	$scope.init = function() {
		$('#anchor_tabs a').click(function (e) {
			console.debug('yes??')
			e.preventDefault();
			$(this).tab('show');
		});
	}

	$scope.searchTopic = function(topic) {
		$('#anchor_tabs a:eq(0)').tab('show');
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
			url: '/andernieuws/resources/monthly-keywords-proper-idf.json',
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
		var limit = $scope.kwlimit ? $scope.kwlimit : 50;
		var includeNouns = $('#include_nouns').is(':checked') ? 'y' : 'n';
		var includeVerbs = $('#include_verbs').is(':checked') ? 'y' : 'n';
		var includeAdjectives = $('#include_adjectives').is(':checked') ? 'y' : 'n';
		var includeAdverbs = $('#include_adverbs').is(':checked') ? 'y' : 'n';
		var includePronouns = $('#include_pronouns').is(':checked') ? 'y' : 'n';
		var includeNumbers = $('#include_numbers').is(':checked') ? 'y' : 'n';
		var includePrepositions = $('#include_prepositions').is(':checked') ? 'y' : 'n';
		var includeDeterminers = $('#include_determiners').is(':checked') ? 'y' : 'n';
		var includeInterjections = $('#include_interjections').is(':checked') ? 'y' : 'n';
		var includeConjunctions = $('#include_conjunctions').is(':checked') ? 'y' : 'n';
		var url = '/andernieuws/searchkw?l=' + limit;
		url += '&i_n=' + includeNouns + '&i_v=' + includeVerbs + '&i_adj=' + includeAdjectives;
		url += '&i_adv=' + includeAdverbs + '&i_pro=' + includePronouns + '&i_num=' + includeNumbers;
		url += '&i_pre=' + includePrepositions + '&i_det=' + includeDeterminers;
		url += '&i_int=' + includeInterjections + '&i_con=' + includeConjunctions;
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

	$scope.sortKeywords = function() {
		$scope.sortByScore = !$scope.sortByScore;
		$.each($scope.kwGroups, function(type, kws){
			$scope.kwGroups[type] = $scope.sortKeywordType(kws);
		});

		$scope.keywords = $scope.sortKeywordType($scope.keywords);
	}

	$scope.sortKeywordType = function(keywords) {
		return keywords.sort(function(a, b){
			if ($scope.sortByScore) {
				return b.freq - a.freq;
			} else {
				return b.score - a.score;
			}
		})
	}

	$scope.showMontlyKeywords = function(data) {
		$scope.$apply(function(){
			$scope.monthly = data;
			$scope.loading = false;
		});
	}

	$scope.showKeywords = function(data) {
		var kwGroups = {};

		$.each(data, function(i, kw) {
			if(kwGroups[kw.type] == undefined) {
				kwGroups[kw.type] = [kw];
			} else {
				kwGroups[kw.type].push(kw);
			}
		});
		console.debug(kwGroups);
		//TODO
		$scope.$apply(function(){
			$scope.keywords = data;
			$scope.kwGroups = kwGroups;
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

	$scope.getKwClass = function(score) {
		var cl = 'primary';
		if(score < 50) {
			cl = 'primary';
		} else if (score >= 50 && score < 100) {
			cl = 'success';
		} else if (score >= 100 && score < 200) {
			cl = 'warning';
		} else if (score >= 200) {
			cl = 'danger';
		}
		return cl;
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