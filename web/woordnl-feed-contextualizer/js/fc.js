var fc = angular.module('woordnl', ['cfp.hotkeys']);

//TODO create a client config
var WOORDNL_MP3_BASE_URL = 'http://os-immix-w/woord-nl-mp3/';

fc.filter('slice', function() {
  return function(arr, start, end) {  	
    return (arr || []).slice(start, end);
  };
});


/* Main controller */
fc.controller('feedCtrl', function ($scope, $sce, hotkeys) {
	
	/****************************************************************************/
	/* SCOPE VARIABLES */
	/****************************************************************************/
	
	$scope.feedItems = [];
	$scope.selectedFeedItem = null;
	$scope.selectedSource = null;
	$scope.lastMessage = 0;	
	$scope.searched = false;
	$scope.fetchButtonText = 'Analyseer';

	$scope.offset = 0;
	$scope.LIMIT = 3;
	
	hotkeys.add({
	    combo: 'left',
	    description: 'Go back in time',
	    callback: function() {
			$scope.previousItems();
		}
	});

	hotkeys.add({
	    combo: 'right',
	    description: 'Go forward in time',
	    callback: function() {
			$scope.nextItems();
		}
	});	

	/****************************************************************************/
	/* AJAX FUNCTIONS */
	/****************************************************************************/
	
	//polls the server for new feed items (NodeJS power yeah!)
	$scope.longPoll_feed = function() {
		console.debug('Long polling...');
		$.ajax({
				dataType: 'json',
				type: "GET",
				url: "/woordnl-fc/real_time_feed?since=" + $scope.lastMessage,
				error: function () {
					setTimeout($scope.longPoll_feed, 10*1000);
				},
				success: function (json) {
					$scope.$apply($scope.storeFeedItems(json));
					$scope.longPoll_feed();
				}
			});
	}
	
	//submits the feed to the server
	$scope.processFeed = function() {
		$scope.loading = true;
		$scope.fetchButtonText = 'Loading...';
		alert($scope.feedURL);
		$.ajax({
			cache: false,
			dataType: 'json',
			type: "GET",
			url: "/woordnl-fc/add_rss_feed?url=" + $scope.feedURL,			
			error: function () {
				console.debug('error');
				$scope.$apply(function() {					
					$scope.searched = true;
				});
			},
			success: function (json) {
				console.debug('success');
				$scope.$apply(function() {					
					$scope.searched = true;
				});
			}
		});
	}
	
	/****************************************************************************/
	/* MODEL FUNCTIONS */
	/****************************************************************************/

	//stores retrieved feed items in the client
	$scope.storeFeedItems = function(json) {
		console.debug(json);
		$scope.safeApply(function() {
			$scope.offset = 0;
			//Loop door alle (RSS) feed items
			for(var i=0;i<json.length;i++) {
				var d = json[i].timestamp ? new Date(json[i].timestamp) : null;
				var md = $scope.getFormattedRelatedMetadata(json[i].related);
				$scope.feedItems.unshift({
					id : json[i].id,
					title: typeof json[i].title == 'string' ? $sce.trustAsHtml(json[i].title) : 'Geen titel',
					summary : typeof json[i].summary == 'string' ? $sce.trustAsHtml(json[i].summary) : 'Geen omschrijving',
					pubDate : d ? d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear() : '',
					url : json[i].url,
					categories : typeof json[i].categories == 'string' ? json[i].categories : '',
					wordFreqs : json[i].wordFreqs,
					entities : json[i].entities,
					related : md,
					sourceOrder : $scope.getSourceOrder(md),
					queries : $scope.getContextQueries(json[i].related)
				});
				if($scope.lastMessage < json[i].timestamp) {
					$scope.lastMessage = json[i].timestamp;
				}
			}
			$scope.searched = true;
			$scope.fetchButtonText = 'Analyseer';
		});				
	}	
	
	$scope.getContextQueries = function(relatedData) {
		var qs = {};
		var i =0;
		for (key in relatedData) {			
			qs[key] = relatedData[key].queryString;
			i++;
		}
		return qs;
	}
	
	$scope.getFormattedRelatedMetadata = function(relatedData) {
		var md = {};
		if(relatedData) {
			for(source in relatedData) {
				var rd = relatedData[source].data;
				if(rd) { //more types of resources can be retrieved from the server
					if (source == 'woordnl' && rd.hits && rd.hits.total > 0) { 					
						md[source] = [];
						for(i in rd.hits.hits) {
							md[source].push({
								contentURL : $sce.trustAsResourceUrl(WOORDNL_MP3_BASE_URL + rd.hits.hits[i]._source.asr_file.split('.')[1] + '.mp3'),
								snippet : rd.hits.hits[i]._source.words,
								start : rd.hits.hits[i]._source.wordTimes.trim().split(' ')[0],
								score : rd.hits.hits[i]._score
							});
						}
					} 
				}
			}
		}
		return md;
	}
	
	$scope.getSourceOrder = function(sources) {
		var ordered = [];
		for(key in sources) {
			ordered.push(key);
		}
		return ordered.sort();
	}
	
	$scope.getIMMixTitel = function(immixSrc) {
		var t = [];
		if(immixSrc.expressie && immixSrc.expressie.titel) {
			t.push(immixSrc.expressie.titel.tekst.tekst);
		}
		if(immixSrc.realisatie && immixSrc.realisatie.titel) {
			t.push(immixSrc.realisatie.titel.tekst);
		}
		if(immixSrc.reeks && immixSrc.reeks.titel) {
			t.push(immixSrc.reeks.titel.tekst);
		}
		if(immixSrc.werk && immixSrc.werk.titel) {
			t.push(immixSrc.werk.titel.tekst);
		}	
		return t.join(' - ');
	}

	$scope.previousItems = function() {
		$scope.offset = $scope.offset <= 0 ? 0 : $scope.offset - $scope.LIMIT;		
	}

	$scope.nextItems = function() {
		if($scope.offset + $scope.LIMIT < $scope.feedItems.length) {
			$scope.offset += $scope.LIMIT;
		}
	}
	
	/****************************************************************************/
	/* VIEW FUNCTIONS */
	/****************************************************************************/
	
	$scope.popover = function(elmID) {
		if($scope.selectedFeedItem) {
			var html = '';
			if(elmID == 'query_input') {
				html = $scope.getQueryHTML($scope.selectedFeedItem);
			} else if(elmID == 'context_query') {
				html = '<div class="query">' + $scope.selectedFeedItem.queries[$scope.selectedSource] + '</div>';
			}
			if($('#' + elmID).next().hasClass('popover')) {
				$('#' + elmID).popover('toggle');
			} else {
				$('#' + elmID).popover({'content': html, 'html' : true, 'trigger' : 'manual'});
				$('#' + elmID).popover('toggle');
			}
		}
	}
	
	$scope.getQueryHTML = function(item) {
		var html = ['<span class="freq_word">'];
		html.push(item.wordFreqs.join(' '));
		html.push('</span>');
		html.push('<br>');
		for (key in item.entities) {
			html.push('<span class="ne_type">' + key + '</span>:&nbsp;');			
			for(var i=0;i<item.entities[key].length;i++) {
				html.push(item.entities[key][i] + ' ');
			}
		}
		return html.join(' ');
	}
	
	
	/****************************************************************************/
	/* ANGULAR HELPER FUNCTIONS */
	/****************************************************************************/
	
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
	
	//start polling for messages
	$scope.longPoll_feed();		
	
});


/****************************************************************************/
/* HELPER FUNCTIONS */
/****************************************************************************/

function toMillis(sec) {
	var ms = sec * 1000 + "";
	if(ms.indexOf(".") == -1){
		return parseInt(ms);
	} else {
		return parseInt(ms.substring(0, ms.indexOf(".")));
	}
}