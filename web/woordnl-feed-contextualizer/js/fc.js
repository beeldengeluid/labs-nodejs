/**
 * TODO highlight matches
 * - glyphs fatsoenlijk maken
 * - sowieso de resultaten netjes opmaken
 * 
 */

var fc = angular.module('fc', ['ui.bootstrap']);

//TODO create a client config
var WOORDNL_MP3_BASE_URL = 'http://os-immix-w/woord-nl-mp3/';

/* Main controller */
fc.controller('feedCtrl', function ($scope, $sce) {
	
	/****************************************************************************/
	/* SCOPE VARIABLES */
	/****************************************************************************/
	
	$scope.feedItems = [];
	$scope.selectedFeedItem = null;
	$scope.selectedSource = null;
	$scope.lastMessage = 0;
	$scope.loading = false;
	
	/****************************************************************************/
	/* AJAX FUNCTIONS */
	/****************************************************************************/
	
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
					$scope.loading = false;
					$scope.longPoll_feed();
				}
			});
	}
	
	$scope.processFeed = function() {
		$scope.loading = true;
		$.ajax({
			cache: false,
			dataType: 'json',
			type: "GET",
			url: "/woordnl-fc/add_rss_feed?url=" + encodeURIComponent($scope.feedURL),
			error: function () {
				console.debug('error');
				$scope.loading = false;
			},
			success: function (json) {
				console.debug('success');
			}
		});
	}
	
	$scope.addItemToFeed = function() {
		json = eval("({'title' : 'Dit is een testbericht', 'summary' : 'Hiermee test men de werking van het systeem'})");
		$.ajax({
			cache: false,
			dataType: 'text',
			type: "POST",
			data: json,
			url: "/woordnl-fc/add_feed_item?since=" + $scope.lastMessage,
			error: function () {
				console.debug('error');
			},
			success: function (json) {
				console.debug('success');
			}
		});
	}
	
	/****************************************************************************/
	/* MODEL FUNCTIONS */
	/****************************************************************************/

	$scope.storeFeedItems = function(json) {
		$scope.safeApply(function() {
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
			console.debug(relatedData);
			for(source in relatedData) {
				var rd = relatedData[source].data;
				if(rd) {
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
					} else if (source == 'immix' && rd.hits && rd.hits.total > 0) {
						md[source] = [];
						for(i in rd.hits.hits) {
							md[source].push({
									title : $scope.getIMMixTitel(rd.hits.hits[i]._source),
									description : rd.hits.hits[i]._source.expressie.niveaus[0].beschrijving,
									score : rd.hits.hits[i]._score
							});
						}
					} else if (source == 'anefo' && rd['item'] && rd['item'].length > 0) {
						md[source] = [];
						console.debug(rd['item']);
						var img = '';
						for(i in rd['item']) {
							img = rd['item'][i]['ese:isShownBy'] ? rd['item'][i]['ese:isShownBy'][2] : '';
							md[source].push({
									title : rd['item'][i].title[0],
									description : rd['item'][i].description[0],
									image : img,
									score : 0
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
	
	/****************************************************************************/
	/* CONTROLLER FUNCTIONS */
	/****************************************************************************/
	
	$scope.selectFeedItem = function(index) {
		$scope.selectedFeedItem = $scope.feedItems[index];
		
		if($scope.selectedFeedItem.related) {
			$scope.selectedSource = $scope.selectedFeedItem.sourceOrder[0];
		}
		//destroy all popovers
		$('#query_input').popover('destroy');
		$('#context_query').popover('destroy');
	}
	
	$scope.selectSource = function(source) {
		$scope.selectedSource = source;
		//destroy all popovers
		$('#query_input').popover('destroy');
		$('#context_query').popover('destroy');
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
	
	$scope.getTemplateUrl = function(source) {
		return './woordnl-fc/templates/'+source+'-context.html';
	}
	
	$scope.getSourceIconUrl = function(source) {
		return './woordnl-fc/images/'+source+'.ico';
	}
	
	/****************************************************************************/
	/* (AUDIO) PLAYER FUNCTIONS */
	/****************************************************************************/
	
	$scope.onLoadedData = function(e) {
		if(!e) {
			e = window.event;
		}
		$scope.seek($scope.currentFragment.start);
		$scope.audioPlayer.play();
	}
	
	$scope.onLoadStart = function(e) {
		console.debug('loading...');
	}
	
	$scope.onStalled = function(e) {
		console.debug('stalled...');
	}
	
	$scope.onError = function(e) {
		console.debug('An unknown error occurred.');
	}
	
	$scope.onPlay = function(e) {
		$scope.safeApply(function() {
			$scope.mediaPlaying = true;
		});
		console.debug('play');
	}
	
	$scope.onPause = function(e) {
		$scope.safeApply(function() {
			$scope.mediaPlaying = false;
		});
		console.debug('pause');
	}
	
	$scope.seek = function(millis) {
		$scope.audioPlayer.currentTime = millis / 1000;
	}
	
	$scope.playFragment = function(contentURL, start) {
		if(!$scope.currentFragment || ($scope.currentFragment && contentURL != $scope.currentFragment.url)) {
			$scope.mediaPlaying = false;
			$scope.currentFragment = {url : contentURL, start : toMillis(start)};						
			$scope.audioPlayer = document.getElementById('audioPlayer');
			$('#audioSource').attr('src', contentURL);
			$scope.audioPlayer.addEventListener('play', $scope.onPlay, false);
			$scope.audioPlayer.addEventListener('pause', $scope.onPause, false);
			$scope.audioPlayer.addEventListener('loadeddata', $scope.onLoadedData, false);
			$scope.audioPlayer.addEventListener('loadstart', $scope.onLoadStart, false);
			$scope.audioPlayer.addEventListener('error', $scope.onError, true);
			$scope.audioPlayer.addEventListener('stalled', $scope.onStalled, false);
			canPlayMP3 = (typeof $scope.audioPlayer.canPlayType === "function" && $scope.audioPlayer.canPlayType("audio/mpeg") !== "");
			if (canPlayMP3) {
			    $scope.audioPlayer.pause();
			    $scope.audioPlayer.load();			
			} else {
				alert('Your browser does not support mp3...');
			}
		} else {
			$scope.audioPlayer.play();
		}
		
	}
	
	$scope.pauseFragment = function(contentURL, start) {
		$scope.audioPlayer.pause();
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