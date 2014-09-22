/*
 * POPCORN BASEPLAYER
 * http://popcornjs.org/popcorn-docs/players/
 */

/*******************************************************************
 * GLOBAL VARIABLES
 *******************************************************************/

//TODO all put this in some proper config file
var SERVICE_PREFIX = 'woordnl-rc';
var CONTEXT_DIV = 'context-grid';
var POPCORN_DIV = 'popcorn-player';
var PLAYER_DIV = 'player';
var PLAYER_REPAINT_INTERVAL = 0.5;//10s
var WOORDNL_MP3_BASE_URL = 'http://os-immix-w/woord-nl-mp3/';

var wnl = angular.module('woordnl_lab2', []);

/*******************************************************************
 * HELPER FUNCTIONS
 *******************************************************************/

function toMillis(sec) {
	var ms = sec * 1000 + "";
	if(ms.indexOf(".") == -1) {
		return parseInt(ms);
	} else {
		return parseInt(ms.substring(0, ms.indexOf(".")));
	}
}

function toPrettyDuration(sec) {
	var ms = toMillis(sec);
	var h = m = s = 0;
	while(ms >= 3600000) {
		h += 1;
		ms -= 36000000;
	}
	while(ms >= 60000) {
		m += 1;
		ms -= 60000;
	}
	while(ms >= 1000) {
		s += 1;
		ms -= 1000;
	}
	h = h <= 9 ? '0' + h : h + '';
	m = m <= 9 ? '0' + m : m + '';
	s = s <= 9 ? '0' + s : s + '';
	return h + ':' + m + ':' + s + '.' + ms;
}


/* Main controller */
wnl.controller('playerCtrl', function ($scope) {
	
	/*******************************************************************
	 * SCOPE VARIABLES
	 *******************************************************************/
	
	$scope.loading = false;
	$scope.dragging = false;
	
	$scope.transcriptFiles = [];
	
	$scope.transcriptTags = [];
	
	//the popcorn object
	$scope.pop;
	$scope.lastPlayerUpdate = 0;
	
	/*******************************************************************
	 * POPCORN RELATED FUNCTIONS
	 *******************************************************************/
	
	//setup the popcorn player
	$scope.initPopcorn = function() {
		Popcorn.player('baseplayer');

		//$scope.pop = Popcorn.baseplayer('#' + POPCORN_DIV);
		$scope.pop = Popcorn('#audioPlayer');

		$scope.pop.on('timeupdate', function() {
			//show the current time
			document.getElementById('time').innerHTML = toPrettyDuration(this.currentTime());
			
			//update the visual player every now and then
			if($scope.lastPlayerUpdate + PLAYER_REPAINT_INTERVAL <= this.currentTime() || $scope.lastPlayerUpdate == -1) {
				$scope.lastPlayerUpdate = this.currentTime();
				$scope.repaintPlayer();
			}
			
			//update the scrubber
			$scope.updateProgress();		
		});
	}
	
	$scope.updateProgress = function() {
		var dur = toMillis($scope.audioPlayer.duration);
		var ct = toMillis($scope.audioPlayer.currentTime);
		var pc = ct / (dur / 100);
		if(!$scope.dragging) {
			$('.player-scrubber-head').css('left', pc + '%');
		}
		$('.player-scrubber-elapsed').css('width', pc + '%');
		$('.player-scrubber-progress').css('left', '0px');
		$('.player-scrubber-progress').css('width', pc + '%');
	}
	
	$scope.goSeek = function(event) {
		var x = event.offsetX;		
		$scope.userSeek(x);
	}
	
	$scope.userSeek = function(x) {
		var w = $('.player-scrubber').width();		
		var pc = x / (w / 100);
		var dur = toMillis($scope.audioPlayer.duration);
		$scope.seek((dur / 100) * pc);
	}
	
	//load some dummy data in the popcorn object
	$scope.loadPopcornEventData = function() {		
		for(var i=0;i<10;i++) {
			$scope.pop.footnote({
				start: i * 5 + 1,
				end: i * 5 + 2,
				text: "Showing the number: " + i,
				target: "test_div"
			});
		}
	}
	
	/*******************************************************************
	 * XHR FUNCTIONS
	 *******************************************************************/
	
	//fetch context from the server and load it into popcorn
	$scope.getContext = function() {
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: '/'+SERVICE_PREFIX+'/getcontext?q=' + $scope.contextQuery,
			error: function (err) {
				console.debug(err);
			},
			success: function (json) {
				console.debug('Got something back');
				$scope.processReturnedItems(json);
			}
		});
	}
	
	$scope.processReturnedItems = function(data) {
		//TODO change this later
		console.debug(data);		
		var s = $scope.pop.currentTime();
		for (var i in data.anefo.data.item) {
			console.debug(data.anefo.data.item[i].title);
			var e = s + 1;
			$scope.pop.contextitem({
				start: s,
				end: e,
				text: data.anefo.data.item[i].title,
				image: data.anefo.data.item[i]['ese:isShownBy'][3],
				target: CONTEXT_DIV
			});
			s = e;
		}
	}
	
	//fetch a semantisized ASR transcript into popcorn
	$scope.loadTranscriptTags = function(id) {
		$scope.loading = true;
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: '/'+SERVICE_PREFIX+'/get_asr_tags?id=' + id,
			error: function (err) {
				console.debug(err);
			},
			success: function (json) {
				console.debug('Got something back');
				
				//load the transcript tags in popcorn
				$scope.processTranscriptTags(json);
				
				//hide the loading graphic
				$scope.$apply(function() {
					$scope.loading = false;
				});
				
				//play the file
				$scope.playFragment(WOORDNL_MP3_BASE_URL + '/' + id.split('.')[1] + '.mp3', 0);
			}
		});
	}
	
	$scope.processTranscriptTags = function(data) {
		$scope.transcriptTags = data;
		for (var i in data) {			
			var s = toMillis(data[i].start) / 1000;
			var e = s + 1;
			$scope.pop.semantictag({
				start: s,
				end: e,
				callback: $scope.setSurroundingTags,
				//entities: data[i].entities,
				target: CONTEXT_DIV
			});
			s = e;
		}
	}
	
	//fetch the list of available transcript files
	$scope.loadFileList = function() {
		$scope.loading = true;
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: '/'+SERVICE_PREFIX+'/get_file_list',
			error: function (err) {
				console.debug(err);
			},
			success: function (json) {
				console.debug('Got something back related to the file listing');				
				console.debug(json);
				$scope.$apply(function() {
					$scope.transcriptFiles = json.data;
					$scope.loading = false;
				});
			}
		});
	}
	
	
	/*******************************************************************
	 * PLAYER FUNCTIONS
	 *******************************************************************/	
	
	$scope.initPlayer = function() {
		var h = 0;
		for(var i=0;i<100;i++) {
			h = parseInt(Math.random() * 20) + 1;
			$('#' + PLAYER_DIV).append('<div class="bar"></div>');			
			$('#' + PLAYER_DIV + ' :last-child').css('height', h);
			$('#' + PLAYER_DIV + ' :last-child').css('margin-top', parseInt((32 - h) / 2));
		}
		//init the draggable control
		$(".player-scrubber-head").draggable({
			axis: "x",
			start: function( event, ui ) {
				$scope.dragging = true;
			},
			drag: function( event, ui ) {
				$scope.userSeek(ui.position.left);				
			},
			stop: function( event, ui ) {
				$scope.dragging = false;
				$scope.userSeek(ui.position.left);				
			}
		});
	}
	
	$scope.repaintPlayer = function() {
		console.debug('repainting the player');
		var h = 0;
		var ph = 0;
		$($('#' + PLAYER_DIV + ' .bar').get().reverse()).each(function() {
			h = parseInt($(this).css('height'));
			if(ph != 0) {				
				//update the hight according to the previous element
				$(this).css('height', ph);
				$(this).css('margin-top', parseInt((32 - ph) / 2));
				//set the previous height
				ph = h;
			} else {
				ph = parseInt($(this).css('height'));
				//set a new random bar on the far right
				h = parseInt(Math.random() * 20) + 1;
				$(this).css('height', h);
				$(this).css('margin-top', parseInt((32 - h) / 2));
			}
		});
	}
	
	$scope.pause = function() {
		$scope.pop.pause();
	}
	
	$scope.play = function(startOver) {
		if (startOver) {
			$scope.pop.play(0);
		} else {
			$scope.pop.play();
		}
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
		console.debug(e);
		console.debug('An unknown error occurred.');
	}
	
	$scope.onPlay = function(e) {
		$scope.safeApply(function() {
			$scope.mediaPlaying = true;
		});
		//$scope.play();
	}
	
	$scope.onPause = function(e) {
		$scope.safeApply(function() {
			$scope.mediaPlaying = false;
		});
		//$scope.pause();
	}
	
	$scope.onSeeked = function(e) {
		if($scope.audioPlayer.currentTime > 0) {
			$scope.setSurroundingTags($scope.audioPlayer.currentTime);
			//reset the player update for the pretty timeline
			$scope.lastPlayerUpdate = -1;
		}
	}
	
	$scope.onSeeking = function(e) {
		if($scope.audioPlayer.currentTime > 0) {
			$scope.setSurroundingTags($scope.audioPlayer.currentTime);
		}
	}
	
	$scope.seek = function(millis) {
		if($scope.audioPlayer) {
			$scope.audioPlayer.currentTime = millis / 1000;
			//$scope.pop.currentTime(millis / 1000);
			if(millis > 0) {
				$scope.setSurroundingTags(millis / 1000);
			}
			$scope.lastPlayerUpdate = -1;
		}
	}
	
	$scope.playFragment = function(contentURL, start) {
		if(!$scope.currentFragment || ($scope.currentFragment && contentURL != $scope.currentFragment.url)) {
			$scope.mediaPlaying = false;
			$scope.currentFragment = {url : contentURL, start : toMillis(start)};						
			$scope.audioPlayer = document.getElementById('audioPlayer');
			$('#audioSource').attr('src', contentURL);
			$scope.audioPlayer.addEventListener('play', $scope.onPlay, false);
			//$scope.audioPlayer.addEventListener('seeked', $scope.onSeeked, false);
			$scope.audioPlayer.addEventListener('seeking', $scope.onSeeking, false);
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
	
	
	/*******************************************************************
	 * MAIN FUNCTIONS
	 *******************************************************************/
	
	$scope.setTranscript = function() {
		$scope.transcriptTags = [];
		if($scope.mediaPlaying) {					
			$scope.pause();
			$scope.seek(0);
		}
		$scope.loadTranscriptTags($scope.transcript);
	}
	
	$scope.setSurroundingTags = function(start) {		
		start = toMillis(start);
		$scope.foundTags = [];
		var tags = [];
		var secs = 0;
		for(var i in $scope.transcriptTags) {			
			secs = toMillis($scope.transcriptTags[i].start);
			if(secs >= (start - 10000) && secs <= (start + 10000)) {
				tags.push($scope.transcriptTags[i]);
			}
		}
		$scope.safeApply(function() {
			$scope.foundTags = tags;
		});
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
	
	/*******************************************************************
	 * INITIALIZATION
	 *******************************************************************/
	
	$scope.initPopcorn();	
	$scope.initPlayer();
	$scope.loadFileList();	
	
});

