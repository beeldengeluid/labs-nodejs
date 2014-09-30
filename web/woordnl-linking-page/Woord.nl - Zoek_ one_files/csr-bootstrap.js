/**
 * CSR voodoo, oh joy!
 */
(function(loc) {
    var htmlTag = document.getElementsByTagName("html")[0];
    var isEditMode = htmlTag.className.indexOf("mgnl-editmode") !== -1;

    // Don't do any redirects in edit mode
    if (isEditMode) {
        return;
    }

    var siteRootRelative = document.querySelector('meta[name=siteroot]').getAttribute('content');
    var siteRoot = loc.protocol + '//' + loc.host + siteRootRelative;
    var href = String(loc.href);
    var requestPath = href.replace(siteRoot, '');

    // This is a truely awful UA sniff to check for buggy window.history
    // behaviour on Android
    // See also discussion on
    // < https://github.com/Modernizr/Modernizr/pull/746 >
    // < https://github.com/Modernizr/Modernizr/issues/733 >
    // When that pull request gets accepted we can simply use Modernizr.history
    function hasHistorySupport() {
        var ua = navigator.userAgent;
        var properCheck = !!(window.history && history.pushState);

        if (ua.indexOf("Android") === -1) {
            // No Android, simply return the 'proper' check
            return properCheck;
        } else {
            if (ua.indexOf("Mobile Safari") !== -1 && ua.indexOf("Chrome") === -1) {
                // Buggy implementation, always return false
                return false;
            } else {
                // Chrome, return the proper check
                return properCheck;
            }
        }
    }

    // Yeehaw, Magnolia start pages! W00t!
    // The homepage can live on *four* different URLS
    // - woord-sample (without slash)
    // - woord-sample/ (with slash)
    // - woord-sample.html
    // - woord.sample.html?mgnlICK=something&more=arguments
    // We need to check for all these three conditions!
    function isHome() {
        var siteRootWithoutSlash = siteRoot.slice(-1) === "/" ? siteRoot.slice(0, -1) : siteRoot;

        // This is the check for the fourth exception (with url arguments)
        if (requestPath.replace(/\.html\?(.*)/, '') === siteRootWithoutSlash) {
            return true;
        }

        // And for the other three checks:
        return (requestPath === "") ||
               (requestPath === siteRootWithoutSlash) ||
               (requestPath === siteRootWithoutSlash + '.html');
    }

    function redirect(path, hashbang) {
        hashbang = hashbang || false;

        var url = ''.concat(
            siteRoot,
            hashbang ? '#!/' : '',
            path
        );

        window.location = url;
    }

    function initHistory() {
        // If we are on the homepage, we should redirect to /start.html
        // with normal history routing
        if (isHome()) {
            redirect('start.html', false);
            return;
        }

        // If we've got a hashbang url, remove that part
        if (loc.href.indexOf("#!/") !== -1) {
            window.location = loc.href.replace('#!/', '');
            return;
        }

        // Nothing to see, move along to the app
    }

    function initHashbang() {
        // If we are on the homepage, we should redirect to /start.html
        // with a hashbang
        if (isHome()) {
            redirect('start.html', true);
            return;
        }

        // Ah yes, Magnolia might add lots of ?mgnlIntercept=bla crap at the
        // end of the URL which totally confuses hashbang browsers,
        // This especially happens when switching between preview and
        // non-preview mode, so redirect to homepage as well
        // Note that this means that non-history browser can't easily
        // edit Magnolia pages, this is by design
        if (href.indexOf("&mgnl") !== -1) {
            redirect('start.html', true);
            return;
        }

        // No, route is valid.
        // Now check if we have a hashbang already (in that case do nothing)
        // otherwise, redirect to the correct page, with the 'path'
        // we get from the hasbang
        if (loc.href.indexOf("#!") === -1) {
            redirect(requestPath, true);
            return;
        }
    }

    function init() {
        // Monkey patch Modernizr with the history patch so we can use it later on
        Modernizr.history = hasHistorySupport();

        if (Modernizr.history) {
            initHistory();
        } else {
            initHashbang();
        }
    }

    init();
})(window.location);