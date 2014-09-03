angular.module('andernieuws').factory('audioPlayer', function() {
	
	var currentFragment = null;
	var audioPlaying = false;
	var isLoaded = false;
	
	function onLoadedData(e) {
		if(!e) {
			e = window.event;
		}		
		seek(currentFragment.start);
		isLoaded = true;
		audioPlayer.play();
	}

	function onLoadStart(e) {
		console.debug('loading...');
	}
	
	function onStalled(e) {
		console.debug('stalled...');
	}
	
	function onError(e) {
		console.debug('An unknown error occurred.');
	}
	
	function onPlay(e) {
		audioPlaying = true;
	}
	
	function onPause(e) {
		audioPlaying = false;
	}
	
	function seek(millis) {
		audioPlayer.currentTime = millis / 1000;
	}
	
	function play(audioFile, start) {
		console.debug('Playing: ' + audioFile + ' (' + start + ')');
		if(audioFile && typeof(start) == "number") {
			var audioUrl = 'http://os-immix-w/an-mp3/' + audioFile;
			audioPlaying = false;
			currentFragment = {url : audioUrl, start : toMillis(start)};
			
			//create the player if it does not exists
			audioPlayer = document.getElementById('audioPlayer');
			$('#audioSource').attr('src', audioUrl);
			audioPlayer.addEventListener('play', onPlay, false);
			audioPlayer.addEventListener('pause', onPause, false);
			audioPlayer.addEventListener('loadeddata', onLoadedData, false);
			audioPlayer.addEventListener('loadstart', onLoadStart, false);
			audioPlayer.addEventListener('error', onError, true);
			audioPlayer.addEventListener('stalled', onStalled, false);
			
			canPlayMP3 = (typeof audioPlayer.canPlayType === "function" && audioPlayer.canPlayType("audio/mpeg") !== "");
			if (canPlayMP3) {
			    audioPlayer.pause();
			    audioPlayer.load();
			} else {
				alert('Your browser does not support mp3...');
			}
		} else {
			audioPlayer.play();
		}
		
	}
	
	function pause(contentURL, start) {
		audioPlayer.pause();
	}
	
	function isPlaying() {
		return audioPlaying;
	}
	
	return {
		play : play,
		pause : pause,
		isLoaded : isLoaded,
		isPlaying : isPlaying
	};

});