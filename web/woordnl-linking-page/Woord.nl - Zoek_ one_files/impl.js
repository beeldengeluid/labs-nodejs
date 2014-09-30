//  /* DO NOT REMOVE THIS LINE */

//  /* DO NOT REMOVE THIS LINE */

// This is the main bootstrap file for setting all the correct paths and stuff

// Domain-config sets paths for image server, api server, etc.
define("domain-config", {
    imageServer : "http://images.poms.omroep.nl/image/",
    couchDbServer : "http://couchdb.vpro.nl",
    jsServer: "http://js.vpro.nl",
    apiServer: "http://rs.vpro.nl",
    embedServer: "http://embed.vpro.nl",
    woordEmbedServer: "http://embed.woord.nl",
    npoCookieCSS: "//cookiesv2.publiekeomroep.nl/static/css/npo_cc_styles.css",
    npoCookieJs: "//cookiesv2.publiekeomroep.nl/data/script/cconsent.min",
    googleApiKey: "AIzaSyA6kZmkM8yTDGAugfJ-tOzEQ5uhlMr8hTY",
    locationApiKey: "vprodigitaal",
    locationApiSecret: "tndzOIjEwhxSBO5x"
});
(function() {
    var conf = {};

    function debugArgs() {
        /*
         * Debug magic for easily turning on and off components
         *
         * A list of all possible options
         *   - logrequireloads : Put all loads in Require through console.log
         *   - nocachebust - Don't add a ?cachebust argument to Javascript urls
         */
        var m = window.location.href.match(/(?:\?|&)debug=([^&]*)/);
        return (!m) ? false : ((m[1].split(",")).indexOf(arguments[0]) !== -1);
    };

    function getAttribute(name) {
        return document.getElementById('meta-' + name).getAttribute('content');
    }

    function getRequireConf() {
        // Get all the javascript attributes
        conf.js = {
            "remotehost" : getAttribute('jsremotehost'),
            "version" : getAttribute('jsversion'),
            "develop" : (getAttribute('jsmgnldevelop')).toString() == 'true'
        };

        var requireConf = {
            "paths" : {
                "vpro" : conf.js.remotehost + "/" + conf.js.version + "/vpro",
                "ext" : conf.js.remotehost + "/ext"
            },
            "shim": {
                // Takes care of initializing the NPO cookie functionality, depending on jquery.
                // path and require should be defined in the impl.js files
                "npo_cookies": {
                    "deps": ["jquery"],
                    "exports": "npo_cookies",
                    "init": function(jQuery) {
                        this.npo_cookies.init();
                    }
                }
            }
        };

        if (conf.js.develop) {
            if (!vpro.debugArgs('nocachebust')) {
                requireConf.urlArgs = 'cachebust=' + Math.random();
            }

            requireConf.waitSeconds = 3;
        }

        return requireConf;
    }

    // Expose to global scope
    window.vpro = window.vpro || {};
    window.vpro.conf = conf;
    window.vpro.debugArgs = debugArgs;
    window.vpro.getRequireConf = getRequireConf;
})();
(function(){
    // Trace RequireJS loads?
    if (vpro.debugArgs('logrequireloads')) {
        require.onResourceLoad = function(ctx, map, dep) {
            console.log(map, dep);
        };
    }

    var requireConf = window.vpro.getRequireConf();
    requireConf.paths.jquery = "//ajax.googleapis.com/ajax/libs/jquery/1.8/jquery.min";
    requireConf.paths.npo_cookies = "//cookiesv2.publiekeomroep.nl/data/script/cconsent.min";
    requireConf.useHandlebarsForXmltemplate = true;

    var queryParameters = (function(){
            var vars = {};
            var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
                vars[key] = value;
            });
            return vars;

        })();

    var viewVariant = 'full',               // selected/default view variant
        viewVariants = ['full', 'small'];   // available view variants

    var iOSVersion = (parseFloat(('' + (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0,''])[1]).replace('undefined', '3_2').replace('_', '.').replace('_', '')) || 0) || 0;

    // viewVariant can be forced by defining so in the url
    // this will overwrite all behaviour
    if ( queryParameters.viewVariant && viewVariants.indexOf( queryParameters.viewVariant ) != -1 ){
        viewVariant = queryParameters.viewVariant;
        startLoading();
    } else if (
        // detects Posible iPad 1
        navigator.platform.indexOf("iPad") != -1
        // iPad 1 has a low pixelRatio
        &&  (window.devicePixelRatio || 1) == 1
        // iOS 6 cant be installed on iPad 1
        // this check detects the iOS version
        && 6 > iOSVersion
    ) {
        // the iPad 1 needs to be using the small variant to boost the performance
        // iPad 1 only difference is that is has no acceleration
        // so we have to wait on the ondevicemotion event to occur to detect this
        var time = (+new Date()) - window._perfStartTime;

        var detectIpadVersion = function(event) {
            if (!event.acceleration){
                viewVariant = 'small';
            }
            window.ondevicemotion = null;

            startLoading();
        };

        window.ondevicemotion = detectIpadVersion;

        // fallback if no event occurs
        // chooses the small variant after 1.5s
        setTimeout(function(){
            if ( window.ondevicemotion === detectIpadVersion ){
                window.ondevicemotion = null;
                viewVariant = 'small';
                startLoading();
            }

            detectIpadVersion = null;
        }, 1500);
    } else {
        // small touch devices should use the smaller view variation
        if ( Modernizr.touch ){
            var documentElement = document.documentElement,
                screenWidth = documentElement.clientWidth || documentElement.offsetWidth,
                screenHeight = documentElement.clientHeight || documentElement.offsetHeight;

            if ( !( screenWidth > 768 || screenHeight > 768 ) ){
                viewVariant = 'small';
            }
        }

        startLoading();
    }

    function startLoading() {
        var htmlEl = document.getElementsByTagName('html')[0];

        htmlEl.classList.add( 'viewvariant-' + viewVariant );

        // iOS should be hardware accelerated if possible
        // otherwise low-end iOS devices will only partially
        // render the page
        if ( iOSVersion && iOSVersion >= 1 ){
            htmlEl.classList.add( 'hardware-accelerate' );
        }

        require(
            requireConf,

            // Dependencies
            ["domain-config", "vpro/woord/js/woord", "npo_cookies"],

            // Init callback
            function (domainConfig, woord, npo_cookies) {

                var siteRootRelative = $("meta[name=siteroot]").attr('content'),
                    siteRoot = ''.concat(
                        window.location.protocol,
                        '//',
                        window.location.host,
                        siteRootRelative
                    );

                // MGNL-9856
    // MGNL-9856 - blueconic should honor the cookie permissions
    // TODO remove the try catch after NPO released it's update, currently it throws an error see: MGNL-11259
    try {
        if( typeof npo_cookies !== 'undefined' && npo_cookies.has_permission('recommendations') ) {
            require(['vpro/util/blueconic'], function ( blueconic ) {
                blueconic();
            });
        }
    } catch(e) {
    }

                if(npo_cookies.has_permission("social")) {

                    // UserVoice JavaScript SDK and config
                    (function(){
                        var uv=document.createElement('script');
                        uv.type='text/javascript';
                        uv.async=true;
                        uv.src='//widget.uservoice.com/zzHEauPow8ZvSF45VMQFA.js';
                        var s=document.getElementsByTagName('script')[0];
                        s.parentNode.insertBefore(uv,s)
                    })();
                    window.UserVoice = window.UserVoice || [];
                    UserVoice.push(['showTab', 'classic_widget', {
                        mode: 'feedback',
                        primary_color: '#cc6d00',
                        link_color: '#007dbf',
                        forum_id: 212521,
                        support_tab_name: 'Support',
                        feedback_tab_name: 'Feedback',
                        tab_label: 'Feedback',
                        tab_color: '#00c8ff',
                        tab_position: 'middle-right',
                        tab_inverted: false
                    }]);
                }

                var oldShow_banner = npo_cookies.show_banner;

                if( $('#npo_cc_notification').length > 0){
                    $('html').addClass('npo_cookieBar');
                }

                npo_cookies.show_banner = function(){

                    oldShow_banner();

                    if( $('#npo_cc_notification').length > 0){
                        $('html').addClass('npo_cookieBar');
                    }

                };

                var jsRootUrl = ''.concat(
                    window.vpro.conf.js.remotehost,
                    '/',
                    window.vpro.conf.js.version
                );

                woord.on('error', function(msg, level) {
                    if (level === 0) {
                        $("#wrapper").html( msg );
                    }
                });

                woord.init({
                    // 'autoscrolltop' repositions the document to the top after
                    // every routechange. This is needed on touch devices that
                    // don't support overflowscrolling (Android 2.3),
                    // because otherwise the current scroll position is used.
                    // On devices that do support overflowScrolling this is not
                    // needed because the height of the total app is always
                    // the height of the window
                    autoScrollTop : Modernizr.touch && !Modernizr.overflowscrolling,
                    containers: {
                        app : "#wrapper",
                        home : "#home",
                        search : "#search .content",
                        play :"#play .content",
                        overlay : "#overlay"
                    },
                    debug : window.vpro.conf.js.develop,
                    embedUrl : domainConfig.woordEmbedServer + '/woord/',
                    historySupport : Modernizr.history,
                    homepageUrl : siteRoot + "start.html",
                    homepageTeaserGroup: $('body').data('homepage-teasergroup'),
                    isTouchDevice : $("html").hasClass('touch'),
                    jsRoot : jsRootUrl,
                    shareUrl : siteRoot + "deel.{{type}}.{{id}}.html",
                    favoriteUrl : siteRoot + "favoriet.html",
                    playerPage : siteRoot + "luister.{{type}}.{{id}}.html",
                    playerPageCheck : /\/luister\.(.*)\.(.*)\.html/,
                    apiRoot : domainConfig.apiServer,
                    searchApiRoot : domainConfig.apiServer + '/media/search/es',
                    searchUrl : siteRoot + 'zoek.html',
                    siteRoot : siteRoot,
                    // Needed for hashbang fallback
                    siteRootRelative : siteRootRelative,
                    viewVariant : viewVariant,
                    disqusEnabled : $('meta[name=disqus-shortname]').length > 0 && npo_cookies.has_permission("social"),
                    disqusShortname : $('meta[name=disqus-shortname]').attr('content') || '',
                    disqusUrlPrefix : $('meta[name=disqus-urlprefix]').attr('content') || '',
                    disqusApiKey : $('meta[name=disqus-apikey]').attr('content') || '',
                    slogan : $('meta[name=slogan]').attr('content') || ''
                });

                // In development mode, expose 'woord' to the global scope
                if (window.vpro.conf.js.develop) {
                    window.woord = woord;
                }

            }
        ); // require
    }
})();
