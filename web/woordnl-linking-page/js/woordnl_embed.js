/*woord.nl*/

jQuery.fn.exists = function(){return this.length>0;}

/*
 * POPCORN BASEPLAYER
 * http://popcornjs.org/popcorn-docs/players/
 * 
 * 
 * TODO
 * - fix syntaxisfout bla bla
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
var CONTEXT_INTERVAL = 10000;
var KEYWORD_LIMIT = 20;


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
wnl.controller('playerCtrl', function ($scope, $compile) {
	
	/*******************************************************************
	 * SCOPE VARIABLES
	 *******************************************************************/
	
	$scope.loading = false;
	$scope.dragging = false;
	
	$scope.startTime = 0;

	$scope.transcriptFiles = [];	
	$scope.transcriptTags = [];	
	
	//the popcorn object
	$scope.pop;
	$scope.lastPlayerUpdate = 0;
	
	$scope.audioElementId = null;

	//for fullscreen mode
	$scope.PICTURE_TIMEOUT = 5000;
	$scope.currentFullscreenImage = 0;
	$scope.fullscreenImages = [];
	
	/*******************************************************************
	 * POPCORN RELATED FUNCTIONS
	 *******************************************************************/
	
	//setup the popcorn player
	$scope.initPopcorn = function() {
		Popcorn.player('baseplayer');

		//$scope.pop = Popcorn.baseplayer('#' + POPCORN_DIV);
		$scope.pop = Popcorn('#' + $scope.audioElementId);
		//$scope.pop.on('timeupdate', function(){});
	}
	
	$scope.goSeek = function(event) {
		var x = event.offsetX;		
		$scope.userSeek(x);
	}
	
	$scope.userSeek = function(x) {
		if($scope.audioPlayer) {
			var w = $('.player-scrubber').width();
			var pc = x / (w / 100);
			var dur = toMillis($scope.audioPlayer.duration);
			$scope.seek((dur / 100) * pc);
		}
	}
	
	/*******************************************************************
	 * XHR FUNCTIONS
	 *******************************************************************/
	
	$scope.loadEnrichedTranscript = function(id) {
		$scope.loading = true;
		$.ajax({
			dataType: 'json',
			type: "GET",
			url: '/'+SERVICE_PREFIX+'/get_context?id=' + id,
			error: function (err) {
				console.debug(err);
			},
			success: function (json) {
				console.debug(json);
				//insert the grid into the embed player
				$scope.injectContextGrid();
				
				//load the transcript tags in popcorn
				$scope.processTranscriptContext(json);
				
				//hide the loading graphic
				$scope.$apply(function() {
					$scope.loading = false;
				});
				
				//play the file
				var mp3 = $scope.mp3 ? $scope.mp3 : WOORDNL_MP3_BASE_URL + '/' + id.split('.')[1] + '.mp3'
				$scope.playFragment(mp3, $scope.startTime);
			}
		});
	}
	
	$scope.injectContextGrid = function() {
		if (!$('.detailsContainer-inner').exists()) {
			//console.debug('it does not exist yet');
			setTimeout($scope.injectContextGrid, 300);
		} else {
			var html = [];
			html.push('<div id="keyword_cloud" ng-show="keywords">');
			html.push('<div class="cloudTag" ng-repeat="kw in keywords" ');
			html.push('style="font-size: {{getKeywordFontSize(kw.score)}}%" ng-click="loadKeywordTimes(kw.word)">');
			html.push('{{kw.word}}</div></div>');			
			$scope.safeApply(function(){
				$('.detailsContainer-inner').after($compile(html.join(''))($scope));			
			});
		}
	}
	
	$scope.processTranscriptContext = function(data) {
		//set the keywords, the template does the rest
		var keywords = data._source.keywords.sort(function(a, b) {
			return b.score - a.score;
		});
		$scope.keywords = keywords.slice(0, KEYWORD_LIMIT);				
		
		//the rest of the context data is based on wikilinks (entities). Process them here
		$scope.transcriptTags = data._source.wikilinks;
		for (var i in $scope.transcriptTags) {
			var s = $scope.transcriptTags[i].begintime / 1000;
			var e = s + 1;			
			$scope.pop.semantictag({
				start: s,
				end: e,
				callback: $scope.setSurroundingTags,
				target: CONTEXT_DIV
			});
			s = e;
		}
	}
	
	//get the keyword times for a certain keyword
	
	$scope.loadKeywordTimes = function(kw) {
		if (kw == $scope.activeKeyword) {
			$scope.seek($scope.activeTimes[++$scope.activeTimeIndex]);
		} else {
			$.ajax({
				dataType: 'json',
				type: "GET",
				url: '/'+SERVICE_PREFIX+'/get_kw_times?id=' + $scope.transcript + '&kw=' + kw,
				error: function (err) {
					console.debug(err);
				},
				success: function (json) {
					//load the transcript tags in popcorn
					console.debug('times');
					console.debug(json);
					if(json.times) {
						$scope.activeKeyword = kw;
						$scope.activeTimes = json.times;
						$scope.activeTimeIndex = 0;
					}
	
					$scope.seek($scope.activeTimes[$scope.activeTimeIndex]);
				}
			});
		}
	}
	
	/*******************************************************************
	 * PLAYER FUNCTIONS
	 *******************************************************************/	
	
	$scope.initPlayer = function() {
		//init the draggable control
		$("div.player-scrubber-head").draggable({
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
		if($scope.currentFragment.start > 0) {
			$scope.seek($scope.currentFragment.start);
		}
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
	}
	
	$scope.onPause = function(e) {
		$scope.safeApply(function() {
			$scope.mediaPlaying = false;
		});
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
			$scope.currentFragment = {url : contentURL, start : start};//start is in ms
			$scope.audioPlayer = document.getElementById($scope.audioElementId);
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
		//$scope.loadTranscriptTags($scope.transcript);
		$scope.loadEnrichedTranscript($scope.transcript);
	}
	
	$scope.getKeywordFontSize = function (score) {
		var pc = 100;
		if (score >= 0.8) {
			pc = 250;
		} else if (score >= 0.6) {
			pc = 230;
		} else if (score >= 0.4) {
			pc = 210;
		} else if (score >= 0.3) {
			pc = 205;
		} else if (score >= 0.2) {
			pc = 180;
		} else if (score >= 0.1) {
			pc = 170;
		} else if (score >= 0.07) {
			pc = 160;
		}  else if (score >= 0.05) {
			pc = 150;
		}  else if (score >= 0.03) {
			pc = 150;
		}  else {
			pc = 120;
		}
		return pc;
	}
	
	/*
	 * This function is used as a callback function for popcorn.semantictag
	 * 
	 * So basically this gets triggered by a single keyword that is attached to an event (a certain timecode). 
	 * This function loads information in the vicinity of this keyword (CONTEXT_INTERVAL) and adds it to a data
	 * object, which is used by the angular templating code (index_embed.html) to display the currently relevant context information
	 */
	$scope.setSurroundingTags = function(start) {		
		start = toMillis(start);
		$scope.foundTags = [];
		var tags = [];
		var secs = 0;
		for(var i in $scope.transcriptTags) {			
			secs = $scope.transcriptTags[i].begintime;
			if(secs >= (start - CONTEXT_INTERVAL) && secs <= (start + CONTEXT_INTERVAL)) {
				tags.push($scope.transcriptTags[i]);
			}
		}
		$scope.safeApply(function() {
			$scope.foundTags = tags;			
		});
		$scope.setImageBar();
	}

	$scope.setImageBar = function() {
		$scope.currentFullscreenImage = 0;
		$scope.fullscreenImages = [];
		$('.imageBar').remove();
		var html = [];
		$.each($scope.foundTags, function(k, tag) {
			$.each(tag.links, function(x, e) {
				if(e && e.ANEFOData) {
					for(var i = 0;i<e.ANEFOData.length > 0;i++) {
						html.push('<div class="barItem">');
						html.push('<div><a href="' + e.ANEFOData[i].url + '" target="_anefo">');
						html.push('<img src="' + e.ANEFOData[i].img1 + '" title="'+e.ANEFOData[i].description+ '">');						
						html.push('</a></div>');
						if(i == 0) {
							html.push('<div><a href="'+e.url+'" target="_wikipedia">' + e.label + '</a></div>');
						} else {
							html.push('<div><a href="'+e.url+'" target="_wikipedia">&nbsp;</a></div>');
						}
						html.push('</div>');
						if(e.ANEFOData[i] && e.ANEFOData[i].img1 && e.ANEFOData[i].img1.indexOf("188x188") != -1) {
							if(e.ANEFOData[i].img1.replace("188x188", "1280x1280") != undefined) {
								$scope.fullscreenImages.push(e.ANEFOData[i].img1.replace("188x188", "1280x1280"));
							}
						}
					}
				}
				//html.push('<a href="'+e.url+'">' + e.label + '</a>');
			});
		});
		$('.barContainer').before('<div class="imageBar">'+html.join('')+'</div>');
	}

	$scope.enterFullScreen = function() {
		$scope.fullscreenMode = true;
		var elem = document.getElementById("FSimage");
		if(elem.requestFullScreen) {
			elem.requestFullScreen();
		} else if(elem.webkitRequestFullScreen ) {
			elem.webkitRequestFullScreen();
		} else if(elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		}
		$scope.changePicture();
	}

	$scope.fullScreenStateChanged = function() {
		console.debug('state changed');
		if (document.fullscreenElement || document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||document.msFullscreenElement) {
			console.debug('(still) in fullscreen');
		} else	{ //if not make sure the variables are reset
			$('#FSimage').attr('src', '/woordnl-rc/images/noFS.png');
			$scope.safeApply(function() {
				$scope.fullscreenMode = false;
			});
		}
	}

	$scope.changePicture = function() {
		//check if the user is still in fullscreen mode
		if($scope.fullscreenMode) {
			setTimeout($scope.changePicture, $scope.PICTURE_TIMEOUT);
			if($scope.currentFullscreenImage + 1 < $scope.fullscreenImages.length) {
				$scope.currentFullscreenImage++;
			} else {
				$scope.currentFullscreenImage = 0;
			}
			if($scope.fullscreenImages.length > 0) {
				document.getElementById("FSimage").src = $scope.fullscreenImages[$scope.currentFullscreenImage];		
			}
		}		
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
	
	$scope.checkLoading = function() {
		if (!$('.player-canvas').exists()) {
			setTimeout($scope.checkLoading, 300);
		} else {
			$scope.audioElementId = $('.player-canvas').attr('id');
			
			//get this from the url
			var urlParams = $scope.getParamsFromUrl();
			var urn = urlParams.urn.replace(/%3A/g, ':');
			$scope.startTime = parseInt(urlParams.start);
			$scope.mp3 = urnMapping[urn];
			var pomsID = $scope.mp3.substring('http://download.omroep.nl/vpro/'.length, $scope.mp3.indexOf('.mp3'));
			$scope.transcript = woordnlMapping[pomsID].asrFile || '230.39847574.asr1.semanticized.hyp';
			
			//alert('Going to load some pretty nifty stuff');
			$scope.initPopcorn();
			$scope.initPlayer();
			$scope.setTranscript();
			$('.fullscreen-btn').css('display', 'block');
			document.addEventListener("fullscreenchange", $scope.fullScreenStateChanged, false);
    		document.addEventListener("webkitfullscreenchange", $scope.fullScreenStateChanged, false);
    		document.addEventListener("mozfullscreenchange", $scope.fullScreenStateChanged, false);
    		document.addEventListener("MSFullscreenChange", $scope.fullScreenStateChanged, false);
			//231.41137297.asr1.semanticized.hyp
		}
	}

	$scope.getParamsFromUrl = function () {  
		var params = {};
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
			// If first entry with this name
			if (typeof params[pair[0]] === "undefined") {
      			params[pair[0]] = pair[1];
				// If second entry with this name
    		} else if (typeof params[pair[0]] === "string") {
      			var arr = [ params[pair[0]], pair[1] ];
      			params[pair[0]] = arr;
    			// If third or later entry with this name
    		} else {
      			params[pair[0]].push(pair[1]);
    		}
  		}  		
    	return params;
	}
/*
	$scope.initCloud = function() {
		//var fontSize = d3.scale.log().range([10, 100]);
		var cloudWords = [];
		$.each($scope.keywords, function(k, w) {
			//var score = $scope.getKeywordFontSize(w.score);
			var size = 10 + Math.random() * 90
			cloudWords.push({text : w.word + '', size: size});
			console.debug(k)
		});
		console.debug(cloudWords);		
		d3.layout.cloud().size([500, 300])      		
      		.padding(5)
      		.timeInterval(20)
      		.rotate(function() { return 0; })
      		.font("Impact")
      		.fontSize(function(d) { return d.size; })
      		.on("word", $scope.showCloudProgress)
      		.on("end", $scope.initCloudComplete)
      		.words([
        		"Hello", "world", "normally", "you", "want", "more", "words", "pickles", "blowtorch", "shit",
        		"than", "this"].map(function(d) {
        		return {text: d, size: 10 + Math.random() * 90};
      		}))
      		.start();
	}

	$scope.showCloudProgress = function(e) {
		console.debug(e);
	}

	$scope.getTransform = function(d) {          	
		return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
	};

	$scope.initCloudComplete = function(words) {
		//$scope.d3keywords = words;
		console.debug(words);
		
		d3.select(".tag-cloud").append("svg")
        .attr("width", 500)
        .attr("height", 300)
      .append("g")
        .attr("transform", "translate(300,150)")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", "rgb(0, 201, 255)")
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
	}*/

	$scope.checkLoading();	
	
});

