(function(){var a={},b=function(){},c=Array.prototype,d=Object.prototype.toString,e=c.slice,f=/\s/,g=Element.prototype;a.EventEmitter=function(){},a.EventEmitter.prototype={addEventListener:function(a,b){this._purnoHandlers=this._purnoHandlers||{},this._purnoHandlers[a]=this._purnoHandlers[a]||[],this._purnoHandlers[a].push(b)},dispatchEvent:function(a){this._purnoHandlers=this._purnoHandlers||{};if(!!this._purnoHandlers[a]){var b=this._purnoHandlers[a];for(var c=0,d=b.length;c<d;c++)b[c].apply(this,e.call(arguments,1))}},removeEventListener:function(a,b){this._purnoHandlers=this._purnoHandlers||{};if(!!this._purnoHandlers[a]){var c=this._purnoHandlers[a];for(var d=0,e=c.length;d<e;d++){var f=c[d];f===b&&c.splice(d,1)}}}},a.addEventListener=function(a,b,c){a.addEventListener?a.addEventListener(b,c,!1):(a["e"+b+c]=c,a[b+c]=function(){var d=window.event;d.target=d.target||d.srcElement,a["e"+b+c](d)},a.attachEvent("on"+b,a[b+c]))},a.clone=function(a){b.prototype=a;return new b},a.domReady=function(b){/in/.test(document.readyState)?setTimeout(function(){a.domReady(b)},9):b()},a.extend=function(){var a=arguments[0];e.call(arguments,1).forEach(function(b){if(!b)throw new Error("purno.extend: source objects are undefined");for(var c in b){var d=b[c];a[c]=d}});return a},a.makeArray=function(a){var b=[];try{b=e.call(a)}catch(c){for(var d=0,f=a.length;d<f;d++)b.push(a[d])}return b},a.parents=function(a,b){var c=[],d=a.parentNode;while(d.parentNode)c.push(d),d=d.parentNode;return b?c.filter(function(a){return a.matchesSelector(b)}):c},a.query=function(b,c){c=c||document;return a.makeArray(c.querySelectorAll(b))},a.removeEventListener=function(a,b,c){a.removeEventListener?a.removeEventListener(b,c,!1):(a.detachEvent("on"+b,a[b+c]),a[b+c]=null,a["e"+b+c]=null)},a.typeOf=function(a){return a===null||typeof a=="undefined"?String(a):d.call(a).replace(/\[object |\]/g,"").toLowerCase()},typeof module!="undefined"&&module.exports?module.exports=a:typeof define=="function"&&define.amd?define(["vpro/purno/shims"],function(){return a}):window.purno=window.purno||a})()