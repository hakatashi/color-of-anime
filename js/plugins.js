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

// Set gradient background across browsers
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

// Select all text in contenteditable div
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

// list classes of element
// http://stackoverflow.com/questions/1227286/
(function ($) {
    $.fn.classes = function (callback) {
        var classes = [];
        $.each(this, function (i, v) {
            var splitClassName = v.className.split(/\s+/);
            for (var j in splitClassName) {
                var className = splitClassName[j];
                if (-1 === classes.indexOf(className)) {
                    classes.push(className);
                }
            }
        });
        if ('function' === typeof callback) {
            for (var i in classes) {
                callback(classes[i]);
            }
        }
        return classes;
    };
})(jQuery);

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
    Object.keys = (function() {
        'use strict';
        var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
        ],
        dontEnumsLength = dontEnums.length;

        return function(obj) {
            if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                throw new TypeError('Object.keys called on non-object');
            }

            var result = [], prop, i;

            for (prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    result.push(prop);
                }
            }

            if (hasDontEnumBug) {
                for (i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) {
                        result.push(dontEnums[i]);
                    }
                }
            }
            return result;
        };
    }());
}

// tinycolor extension to get RGB in percentage
tinycolor.prototype.toRgbPercentage = function () {
    return {r: this._r / 255, g: this._g / 255, b: this._b / 255, a: this._a};
};

/**
 *  Sugar Library v1.4.1
 *
 *  Freely distributable and licensed under the MIT-style license.
 *  Copyright (c) 2013 Andrew Plummer
 *  http://sugarjs.com/
 *
 * ---------------------------- */
String.prototype.startsWith = function (searchString) {
    var str, start, pos, len, searchLength, position = arguments[1];
    str = String(this);
    searchString = String(searchString);
    pos = Number(position) || 0;
    len = str.length;
    start = Math.min(Math.max(pos, 0), len);
    searchLength = searchString.length;
    if(searchLength + start > len) {
        return false;
    }
    if(str.substr(start, searchLength) === searchString) {
        return true;
    }
    return false;
}
