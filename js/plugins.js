// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

(function ($) {
    $.fn.gradient = function (colors) {
        colors = colors || ['black', 'white'];
        colors = colors.map(function (color) {
            return tinycolor(color);
        });

        return this.each(function () {
            var param = '';

            function percent(index) {
                return Math.floor(index / (colors.length - 1) * 100).toString() + '%';
            }

            var params = '';
            colors.forEach(function (color, index) {
                params += ',' + color.toHexString() + ' ' + percent(index);
            });

            // old browsers
            $(this).css('background', colors[0].toHexString());

            // FF3.6+
            $(this).css('background', '-moz-linear-gradient(left' + params + ')');

            // Chrome, Safari4+
            param = '-webkit-gradient(linear, left top, right top';
            colors.forEach(function (color, index) {
                param += ',' + 'color-stop(' + percent(index) + ',' + color.toHexString() + ')';
            });
            param += ')';
            $(this).css('background', param);

            // Chrome10+, Safari5.1+
            $(this).css('background', '-webkit-linear-gradient(left' + params + ')');

            // Opera 11.10+
            $(this).css('background', '-o-linear-gradient(left' + params + ')');

            // IE10+
            $(this).css('background', '-ms-linear-gradient(left' + params + ')');

            // W3C specification
            $(this).css('background', 'linear-gradient(left' + params + ')');

            // IE6-8
            param = 'progid:DXImageTransform.Microsoft.gradient(startColorstr=\''
                + colors[0].toHexString() + '\', endColorstr=\''
                + colors[colors.length - 1].toHexString() + '\', GradientType=1)';
            $(this).css('filter', param);
        });
    };
})(jQuery);

// http://stackoverflow.com/questions/12243898/
(function ($) {
    $.fn.selectText = function () {
        var doc = document;
        var element = this[0];
        if (doc.body.createTextRange) {
            var range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };
})(jQuery);
