var andernieuws = angular.module('andernieuws', []);

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