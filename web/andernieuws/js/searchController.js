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

	$scope.keywords = null;
	$scope.kwGroups = null;

	$scope.sort = 's';
	$scope.sortOrder = 'desc';

	$scope.init = function() {
		//for quick testing
		$scope.startDate = '01-03-2011';
		$scope.endDate = '31-03-2011';

		$('#start_dp').datepicker({
			format: "dd-mm-yyyy",
			startDate: "01-01-2010",
			autoclose: true
		}).on('hide', function(e) {
			$scope.handleDatepickerHide(true);
		});
		$('#end_dp').datepicker({
			format: "dd-mm-yyyy",
			startDate: "01-01-2010",
			setDate: moment($scope.endDate, 'DD-MM-YYYY'),
			autoclose: true,
		}).on('hide', function(e){
			$scope.handleDatepickerHide(true);
		});
		$('#start_dp_kw').datepicker({
			format: "dd-mm-yyyy",
			startDate: "01-01-2010",
			autoclose: true
		}).on('hide', function(e){
			$scope.handleDatepickerHide(false);
		});
		$('#end_dp_kw').datepicker({
			format: "dd-mm-yyyy",
			startDate: "01-01-2010",
			setDate: moment($scope.endDate, 'DD-MM-YYYY'),
			autoclose: true,
		}).on('hide', function(e){
			$scope.handleDatepickerHide(false);
		});

		$scope.updateDatepickers();
	}

	$scope.handleDatepickerHide = function(firstTab) {
		var startPicker = firstTab ? '#start_date' : '#start_date_kw';
		var endPicker = firstTab ? '#end_date' : '#end_date_kw';
		if($scope.checkDate($(startPicker).val(), $(endPicker).val())) {
			$scope.startDate = $(startPicker).val();
			$scope.endDate = $(endPicker).val();
		} else {
			alert('De einddatum '+$(endPicker).val()+'ligt voor de startdatum ' + $(startPicker).val());
		}
		$scope.updateDatepickers();
	}

	$scope.checkDate = function(start, end) {
		var sd = moment(start, 'DD-MM-YYYY');
		var ed = moment(end, 'DD-MM-YYYY');
		if(sd.isAfter(ed) || ed.isBefore(sd)){
			return false;
		}
		return true;
	}

	$scope.updateDatepickers = function() {
		var sd = moment($scope.startDate, 'DD-MM-YYYY').toDate();
		var ed = moment($scope.endDate, 'DD-MM-YYYY').toDate();
		$('#start_dp').datepicker('setDate', sd);
		$('#end_dp').datepicker('setDate', ed);
		$('#start_dp_kw').datepicker('setDate', sd);
		$('#end_dp_kw').datepicker('setDate', ed);
	}

	$scope.searchTopic = function(topic) {
		$('#anchor_tabs a:eq(0)').tab('show');
		$scope.s = topic;
		$scope.search();
	}

	/**
	 * Sends a search request to the server and returns an object with ASR segments and keywords
	 FIXME weird mix of jQuery and Angular... ah well who cares?
	 */
	$scope.search = function() {
		var includeNouns = $('#s_include_nouns').is(':checked') ? 'y' : 'n';
		var includeVerbs = $('#s_include_verbs').is(':checked') ? 'y' : 'n';
		var includeAdjectives = $('#s_include_adjectives').is(':checked') ? 'y' : 'n';
		var includeAdverbs = $('#s_include_adverbs').is(':checked') ? 'y' : 'n';
		var includePronouns = $('#s_include_pronouns').is(':checked') ? 'y' : 'n';
		var includeNumbers = $('#s_include_numbers').is(':checked') ? 'y' : 'n';
		var includePrepositions = $('#s_include_prepositions').is(':checked') ? 'y' : 'n';
		var includeDeterminers = $('#s_include_determiners').is(':checked') ? 'y' : 'n';
		var includeInterjections = $('#s_include_interjections').is(':checked') ? 'y' : 'n';
		var includeConjunctions = $('#s_include_conjunctions').is(':checked') ? 'y' : 'n';
		var url = '/andernieuws/search?s=' + $scope.s;
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
				console.debug(data);
				$scope.processResults(data);
			}
		});
	}

	$scope.processResults = function(data) {
		console.debug(data[0]);
		if(!data.message) {
			$scope.$apply(function() {
				$scope.loading = false;
				$scope.numTopics = data.length;
				if(data.length > 0) {
					$scope.searchFreq = data[0].searchFreq;
				}
				$scope.topicData = data;
			});
		} else {
			//the search engine did not find anything or returned an error
			$scope.$apply(function() {
				$scope.loading = false;
				$scope.numTopics = 0;
				$scope.searchFreq = 0;
				$scope.topicData = null;
			});
		}
	}

	$scope.searchKeywords = function(sort) {
		sort = sort == undefined ? 's' : sort;
		$scope.sort = sort;
		$scope.keywords = null;

		order = $('#kw_order').is(':checked') ? 'desc' : 'asc';
		$scope.sortOrder = order;

		if(sort == 's') {
			$('#sort_score').removeClass('btn-default');
			$('#sort_score').addClass('btn-primary');
			$('#sort_freq').removeClass('btn-primary');
			$('#sort_freq').addClass('btn-default');
		} else {
			$('#sort_score').removeClass('btn-primary');
			$('#sort_score').addClass('btn-default');
			$('#sort_freq').removeClass('btn-default');
			$('#sort_freq').addClass('btn-primary');
		}

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
		url += '&sort=' + sort + '&ord=' + order;
		$scope.loading = true;
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: url,
			error: function (err) {
				$scope.loading = false;
			},
			success: function (data) {
				console.debug(data);
				$scope.showKeywords(data);
			}
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

	$scope.getKwClass = function(kw) {
		if($scope.sort == 's') {
			var cl = 'primary';
			if(kw.score < 2) {
				cl = 'primary';
			} else if (kw.score >= 2 && kw.score < 12) {
				cl = 'success';
			} else if (kw.score >= 12 && kw.score < 25) {
				cl = 'warning';
			} else if (kw.score >= 25) {
				cl = 'danger';
			}
		} else if($scope.sort == 's2') {
			if(kw.score2 < 50) {
				cl = 'primary';
			} else if (kw.score2 >= 50 && kw.score2 < 100) {
				cl = 'success';
			} else if (kw.score2 >= 100 && kw.score2 < 150) {
				cl = 'warning';
			} else if (kw.score2 >= 150) {
				cl = 'danger';
			}
		} else if($scope.sort == 'f') {
			if(kw.freq < 50) {
				cl = 'primary';
			} else if (kw.freq >= 50 && kw.freq < 100) {
				cl = 'success';
			} else if (kw.freq >= 100 && kw.freq < 150) {
				cl = 'warning';
			} else if (kw.freq >= 150) {
				cl = 'danger';
			}
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

	$scope.init();


}]);