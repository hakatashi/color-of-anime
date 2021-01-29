(function() {
  // Extend Caman with custom colorchanging plugin
  var Game, Question, availableLanguages, colorScore, colorScoreInt, colorsetToRealValueArray, distanceBetweenColors, game, getX, language, nearestColor, percentageToRealValue, realValueArrayToColorset, realValueToPercentage, setLanguage, tinycolorArray;

  Caman.Filter.register('translate', function(fromRGB, toRGB) {
    var from, to;
    if (!Array.isArray(fromRGB)) {
      fromRGB = tinycolorArray(fromRGB);
    }
    if (!Array.isArray(toRGB)) {
      toRGB = tinycolorArray(toRGB);
    }
    from = colorConvert.rgb2labRaw(fromRGB);
    to = colorConvert.rgb2labRaw(toRGB);
    return this.process('translate', function(colorRGB) {
      var RGB, color;
      color = colorConvert.rgb2labRaw([colorRGB.r, colorRGB.g, colorRGB.b]);
      color[0] = Math.max(0, color[0] + to[0] - from[0]);
      color[1] = color[1] + to[1] - from[1];
      color[2] = color[2] + to[2] - from[2];
      RGB = colorConvert.lab2rgbRaw(color);
      colorRGB.r = RGB[0];
      colorRGB.g = RGB[1];
      colorRGB.b = RGB[2];
      return colorRGB;
    });
  });

  distanceBetweenColors = function(A, B) {
    var ALab, BLab, adiff, bdiff, colorA, colorB, distance, ldiff;
    colorA = tinycolor(A).toRgb();
    ALab = colorConvert.rgb2labRaw([colorA.r, colorA.g, colorA.b]);
    colorB = tinycolor(B).toRgb();
    BLab = colorConvert.rgb2labRaw([colorB.r, colorB.g, colorB.b]);
    ldiff = (ALab[0] - BLab[0]) * 2;
    adiff = ALab[1] - BLab[1];
    bdiff = ALab[2] - BLab[2];
    return distance = Math.sqrt(ldiff * ldiff + adiff * adiff + bdiff * bdiff);
  };

  nearestColor = function(color) {
    var base, nearest, nearestDistance;
    base = tinycolor(color);
    if (!base._format) {
      return null;
    }
    nearestDistance = 2e308;
    nearest = null;
    Object.keys(tinycolor.names).forEach(function(colorname) {
      var distance;
      distance = distanceBetweenColors(color, colorname);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = colorname;
      }
    });
    return {
      name: nearest,
      distance: nearestDistance,
      color: tinycolor(nearest)
    };
  };

  // Returns score from 0.0 to 1.0
  colorScore = function(colorA, colorB) {
    var SIGMA, TOLERANCE, distance, score;
    // currently uses evaluation by Gaussian function
    SIGMA = 30; // How much score will be lowered with distance aparted from correct color
    TOLERANCE = 0.02; // How the score will be tolerated to get full score
    distance = distanceBetweenColors(colorA, colorB);
    return score = Math.min(Math.exp(-(distance / SIGMA) * (distance / SIGMA)) * (1 + TOLERANCE), 1);
  };

  // Returns score from 0 to 100
  colorScoreInt = function(colorA, colorB) {
    return Math.floor(colorScore(colorA, colorB) * 100);
  };

  // get x coordinary from touch or click event
  getX = function(event) {
    if (event.originalEvent.changedTouches) {
      return event.originalEvent.changedTouches[0].pageX;
    } else {
      return event.originalEvent.pageX;
    }
  };

  percentageToRealValue = function(colorset, parameter, value) {
    return {
      RGB: {
        r: value * 255,
        g: value * 255,
        b: value * 255
      },
      HSV: {
        h: value * 360,
        s: value * 100,
        v: value * 100
      },
      Lab: {
        l: value * 100,
        a: value * 200 - 100,
        b: value * 200 - 100
      }
    }[colorset][parameter];
  };

  colorsetToRealValueArray = function(colorset, values) {
    var parameters, ret;
    parameters = {
      RGB: ['r', 'g', 'b'],
      HSV: ['h', 's', 'v'],
      Lab: ['l', 'a', 'b']
    }[colorset];
    ret = [];
    parameters.forEach(function(parameter) {
      ret.push(percentageToRealValue(colorset, parameter, values[parameter]));
    });
    return ret;
  };

  realValueToPercentage = function(colorset, parameter, value) {
    return {
      RGB: {
        r: value / 255,
        g: value / 255,
        b: value / 255
      },
      HSV: {
        h: value / 360,
        s: value / 100,
        v: value / 100
      },
      Lab: {
        l: value / 100,
        a: (value + 100) / 200,
        b: (value + 100) / 200
      }
    }[colorset][parameter];
  };

  realValueArrayToColorset = function(colorset, values) {
    var i, parameters, ret;
    parameters = {
      RGB: ['r', 'g', 'b'],
      HSV: ['h', 's', 'v'],
      Lab: ['l', 'a', 'b']
    }[colorset];
    ret = {};
    i = 0;
    parameters.forEach(function(parameter) {
      ret[parameter] = realValueToPercentage(colorset, parameter, values[i]);
      i++;
    });
    return ret;
  };

  // preserve size of image
  tinycolorArray = function(input) {
    var RGB;
    RGB = tinycolor(input).toRgb();
    return [RGB.r, RGB.g, RGB.b];
  };

  Question = class Question {
    constructor(game1, character1) {
      this.game = game1;
      this.character = character1;
      this.info = this.game.queue.getResult(`${this.character}.info`);
      this.defaultColor = tinycolor(this.info['default']);
      this.originalColor = tinycolor(this.info.color);
      this.baseImage = this.game.queue.getResult(`${this.character}.base`);
      this.colorImage = this.game.queue.getResult(`${this.character}.color`);
      this.questionIndex = this.game.questionIndex;
      this.colorsets = {
        RGB: ['r', 'g', 'b'],
        HSV: ['h', 's', 'v'],
        Lab: ['l', 'a', 'b']
      };
      this.currentImageColor = {
        r: null,
        g: null,
        b: null
      };
      this.yourColor = {
        r: null,
        g: null,
        b: null
      };
      this.currentSliderColor = {
        RGB: {
          r: 0,
          g: 0,
          b: 0
        },
        HSV: {
          h: 0,
          s: 0,
          v: 0
        },
        Lab: {
          l: 0,
          a: 0,
          b: 0
        }
      };
      this.busy = true;
      this.caman = null;
      this.phase = 'slider';
      this.score = null;
      this.game.selectTab('RGB');
      this.selectedColorset = 'RGB';
      this.currentSliderColor.RGB = this.defaultColor.toRgbPercentage();
      this.updateSliders('RGB');
      $('#original-color-preview').css({
        'background-color': this.originalColor.toHexString()
      });
      $('#original-color-info .result-color-value').text(this.originalColor.toHexString());
      $('#original-color-info .result-color-name').text(nearestColor(this.originalColor).name);
      // construct image field
      $('#image-field').prepend([
        this.imageElement = $('<div>',
        {
          id: 'image'
        }).append([
          $('<canvas>').attr({
            id: 'canvas',
            width: this.baseImage.originalWidth,
            height: this.baseImage.originalHeight
          }),
          this.baseImage
        ]).invisible()
      ]);
      // update image information
      $('#image-info').empty().append([
        $('<span>',
        {
          class: 'text-en',
          lang: 'en',
          text: `${this.info.name.en}(${this.info.group.en})`
        }),
        $('<span>',
        {
          class: 'text-ja',
          lang: 'ja',
          text: `${this.info.name.ja}(${this.info.group.ja})`
        }),
        document.createTextNode(' - '),
        $('<a>',
        {
          href: this.info.source,
          target: '_blank',
          text: 'Color Source'
        })
      ]);
      this.caman = Caman('#canvas', 'img/' + this.character + '/color.png', () => {
        this.busy = false;
        return this.updateImage();
      });
      $('#color-sliders').fadeIn();
    }

    // Update current slider color parameters based on specific colorset parameters
    updateSliders(base) {
      var baseColor;
      baseColor = colorsetToRealValueArray(base, this.currentSliderColor[base]);
      Object.keys(this.colorsets).forEach((colorset) => {
        var color;
        if (colorset !== base) {
          color = colorConvert[base.toLowerCase()][colorset.toLowerCase()](baseColor);
          this.currentSliderColor[colorset] = realValueArrayToColorset(colorset, color);
        }
        return this.colorsets[colorset].forEach((parameter) => {
          return this.game.moveSlider(colorset, parameter, this.currentSliderColor[colorset][parameter]);
        });
      });
      return this.updateInfo();
    }

    // update displayed color information based on current color parameter
    updateInfo() {
      var color;
      color = tinycolor.fromRatio(this.currentSliderColor.RGB);
      $('.color-preview-value').text(color.toHexString());
      $('.color-preview-square').css('background-color', color.toHexString());
      if (this.phase === 'slider') {
        this.yourColor = $.extend({}, this.currentSliderColor.RGB);
      }
      // update sliders gradients
      return Object.keys(this.colorsets).forEach((colorset) => {
        var sliderColor;
        sliderColor = this.currentSliderColor[colorset];
        return this.colorsets[colorset].forEach((parameter) => {
          var $parameter, $slider, colorArray, colorStop, colorStops, i;
          $parameter = $('.color-parameter-wrap[data-colorset=' + colorset + '][data-parameter=' + parameter + ']');
          $slider = $parameter.find('.color-slider-wrapper');
          colorStop = null;
          colorStops = [];
          i = 0;
          while (i < 7) {
            color = $.extend({}, sliderColor);
            color[parameter] = 1 / 6 * i;
            colorArray = colorsetToRealValueArray(colorset, color);
            if (colorset === 'RGB') {
              colorStop = colorArray;
            } else {
              colorStop = colorConvert[colorset.toLowerCase()].rgb(colorArray);
            }
            colorStops.push({
              r: colorStop[0],
              g: colorStop[1],
              b: colorStop[2]
            });
            i++;
          }
          return $slider.gradient(colorStops);
        });
      });
    }

    // update image based on current slider color
    updateImage() {
      if (this.busy) {
        return;
      }
      if (this.currentImageColor.r === this.currentSliderColor.RGB.r && this.currentImageColor.g === this.currentSliderColor.RGB.g && this.currentImageColor.b === this.currentSliderColor.RGB.b) {
        return;
      }
      this.busy = true;
      this.currentImageColor = $.extend({}, this.currentSliderColor.RGB);
      $('#rendering').visible();
      this.caman.revert(false);
      this.caman.translate(this.info.color, colorsetToRealValueArray('RGB', this.currentSliderColor.RGB));
      return this.caman.render(() => {
        if (this.imageElement.css('visibility') === 'hidden') {
          this.imageElement.visible().hide().fadeIn();
        }
        $('#rendering').invisible();
        this.busy = false;
        return this.updateImage();
      });
    }

    // submit result and confirm OK
    submitResult() {
      var color;
      color = tinycolor.fromRatio(this.currentSliderColor.RGB);
      $('#your-color-preview').css({
        'background-color': color.toHexString()
      });
      $('#your-color-info .result-color-value').text(color.toHexString());
      $('#your-color-info .result-color-name').text(nearestColor(color).name);
      this.score = colorScoreInt(color, this.originalColor);
      $('#color-sliders').fadeOut(() => {
        $({
          score: 0
        }).animate({
          score: this.score
        }, {
          step: (currentScore) => {
            var scoreInt;
            scoreInt = Math.floor(currentScore);
            $('#score-numeral').text(scoreInt);
            return $('#score-bar-inner').css({
              width: scoreInt + '%'
            });
          },
          duration: this.score * 30,
          easing: 'linear'
        });
        return $('#result-field').fadeIn();
      });
      return this.phase = 'result';
    }

    // set color by tinycolor input
    setColor(input) {
      var color, rgb;
      color = tinycolor(input);
      if (color._format) {
        rgb = color.toRgb();
        this.currentSliderColor.RGB = {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255
        };
        this.updateSliders('RGB');
        return this.updateImage();
      } else {
        return this.updateInfo();
      }
    }

    // preview colors in image on result page
    previewResult(isYourColor) {
      var rgb;
      if (isYourColor) {
        this.currentSliderColor.RGB = $.extend({}, this.yourColor);
      } else {
        rgb = this.originalColor.toRgb();
        this.currentSliderColor.RGB = {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255
        };
      }
      this.updateSliders('RGB');
      return this.updateImage();
    }

    // quit problem
    quit(callback) {
      $('#result-field').fadeOut(callback);
      return this.imageElement.fadeOut(() => {
        return this.imageElement.remove();
      });
    }

  };

  Game = class Game {
    constructor() {
      var i, j, manifest, ref, selectableCharacters;
      this.availableCharacters = ['akapuyo', 'harusaki-chiwa', 'ibaraki-kasen', 'neptune', 'takanashi-rikka', 'kirima-syaro', 'kafuu-chino', 'hana-fonteinsutando', 'kasumigaoka-utaha', 'akaza-akari'];
      this.questionIndex = 0;
      if (typeof localStorage.seenCharacters === 'string') {
        this.seenCharacters = JSON.parse(localStorage.seenCharacters);
      } else {
        this.seenCharacters = [];
      }
      // Select characters for this session
      this.characters = [];
      selectableCharacters = [];
      this.availableCharacters.forEach((character) => {
        if (this.seenCharacters.indexOf(character === -1)) {
          return selectableCharacters.push(character);
        }
      });
      shuffle(selectableCharacters);
      shuffle(this.seenCharacters);
      for (i = j = 0, ref = Math.min(selectableCharacters.length, 5) - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
        this.characters.push(selectableCharacters[i]);
      }
      i = 0;
      while (i < 5 - this.characters.length) {
        this.characters.push(this.seenCharacters[i]);
        i++;
      }
      // PreLoad Images
      this.queue = new createjs.LoadQueue();
      manifest = [];
      this.characters.forEach(function(character) {
        return manifest.push({
          id: character + '.base',
          src: 'img/' + character + '/base.png'
        }, {
          id: character + '.color',
          src: 'img/' + character + '/color.png'
        }, {
          id: character + '.info',
          src: 'img/' + character + '/info.json'
        });
      });
      this.queue.on('fileload', function(event) {
        if (event.item.type === 'image') {
          event.result.originalWidth = event.result.width;
          return event.result.originalHeight = event.result.height;
        }
      });
      this.queue.on('progress', function(event) {
        return $('#loading-background').stop(true).animate({
          height: event.progress * 100 + '%'
        }, 500, 'easeOutExpo');
      });
      this.queue.on('complete', () => {
        return $(document).ready(() => {
          $('#loading-background').stop(true, true);
          $('#loading').animate({
            top: '-100%'
          }, function() {
            return $(this).hide();
          });
          return this.init();
        });
      });
      this.queue.loadManifest(manifest);
    }

    init() {
      this.currentQuestion = new Question(this, this.characters[0]);
      // fire onResize event
      $(window).resize(this.onResize.bind(this));
      this.onResize();
      // DOM binders
      $('.color-parameter').on('touchstart mousedown', (event) => {
        var colorset, movePinch, offset, parameter, touchX, width;
        event.preventDefault();
        touchX = getX(event);
        parameter = $(event.currentTarget).data('parameter');
        offset = $(event.currentTarget).offset().left;
        width = $(event.currentTarget).width();
        colorset = $(event.currentTarget).data('colorset');
        movePinch = (event) => {
          var value;
          touchX = getX(event);
          value = (touchX - offset) / width;
          value = Math.max(0, Math.min(value, 1));
          this.currentQuestion.currentSliderColor[colorset][parameter] = value;
          this.currentQuestion.updateSliders(colorset);
          return this.currentQuestion.updateImage();
        };
        $(window).on('touchmove mousemove', movePinch);
        $(window).on('touchend mouseup', function(event) {
          return $(event.currentTarget).off('touchmove mousemove', movePinch);
        });
        return movePinch(event);
      });
      $('.color-preview-value').on('click', (event) => {
        $(event.currentTarget).attr('contenteditable', true);
        $(event.currentTarget).selectText();
        // blur if enter is pressed
        $(event.currentTarget).on('keypress', (event) => {
          if (event.which === 13) {
            $(event.currentTarget).blur();
            return false;
          } else {
            return true;
          }
        });
        return $(event.currentTarget).on('blur', (event) => {
          $(event.currentTarget).attr('contenteditable', false);
          $(event.currentTarget).off('keypress blur');
          return this.currentQuestion.setColor($(event.currentTarget).text());
        });
      });
      $('.tab-inner').on('click', (event) => {
        if (this.currentQuestion.phase === 'slider') {
          return this.selectTab($(event.currentTarget).text());
        }
      });
      $('.submit').on('click', () => {
        return this.currentQuestion.submitResult();
      });
      $('#your-color-preview').on('click', () => {
        return this.currentQuestion.previewResult(true);
      });
      $('#original-color-preview').on('click', () => {
        return this.currentQuestion.previewResult(false);
      });
      return $('.go-next').on('click', () => {
        return this.goNext();
      });
    }

    onResize(event) {
      var IMAGEINFO_HEIGHT, RENDERING_HEIGHT, boxHeight, boxWidth, character, fieldHeight, fieldWidth, imageHeight, imageTop, imageWidth, zoom;
      // fit #image-field to be contained in #image-panel
      // 'box' means max acceptable size of #image-panel in #image-field.
      RENDERING_HEIGHT = 40;
      IMAGEINFO_HEIGHT = 30;
      character = this.characters[this.questionIndex];
      imageHeight = this.queue.getResult(character + '.base').originalHeight;
      imageWidth = this.queue.getResult(character + '.base').originalWidth;
      boxWidth = $('#image-panel').width() * 0.9;
      boxHeight = null;
      if (matchMedia('(min-width: 900px)').matches) {
        boxHeight = $('#image-panel').height() - RENDERING_HEIGHT - IMAGEINFO_HEIGHT;
      } else {
        boxHeight = 800;
      }
      zoom = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
      fieldWidth = imageWidth * zoom;
      fieldHeight = imageHeight * zoom;
      $('#image-field').css({
        width: fieldWidth,
        height: fieldHeight,
        '-webkit-transform': 'none',
        '-moz-transform': 'none',
        '-o-transform': 'none',
        transform: 'none'
      });
      if (matchMedia('(min-width: 900px)').matches) {
        imageTop = ($('#image-panel').height() - fieldHeight) / 2;
        $('#image-field').css({
          position: 'absolute',
          top: imageTop,
          left: ($('#image-panel').width() - fieldWidth) / 2,
          margin: '0'
        });
        $('#rendering').css({
          position: 'absolute',
          bottom: imageTop + fieldHeight
        });
        return $('#image-info').css({
          position: 'absolute',
          top: imageTop + fieldHeight
        });
      } else {
        $('#image-field').css({
          position: 'relative',
          top: 0,
          left: 0,
          margin: '0 5%'
        });
        $('#rendering').css({
          position: 'relative',
          bottom: 0
        });
        return $('#image-info').css({
          position: 'relative',
          top: 0
        });
      }
    }

    // move sliders of DOM from parameter value
    moveSlider(colorset, parameter, value) {
      var $parameter, $pinch, $value;
      $parameter = $('.color-parameter-wrap[data-colorset=' + colorset + '][data-parameter=' + parameter + ']');
      $pinch = $parameter.find('.color-slider-pinch');
      $value = $parameter.find('.color-value');
      $pinch.css('left', value * 100 + '%');
      return $value.text(Math.floor(percentageToRealValue(colorset, parameter, value)));
    }

    goNext() {
      return this.currentQuestion.quit(() => {
        this.seenCharacters.push(this.characters[this.questionIndex]);
        if (this.seenCharacters.length === this.availableCharacters.length) {
          this.seenCharacters = [];
        }
        localStorage.seenCharacters = JSON.stringify(this.seenCharacters);
        this.questionIndex++;
        return this.currentQuestion = new Question(this, this.characters[this.questionIndex]);
      });
    }

    selectTab(tab) {
      $('.colorset-sliders').hide();
      $('.tab').removeClass('selected');
      $(`.colorset-sliders[data-colorset=${tab}]`).show();
      return $(`.tab[data-colorset=${tab}]`).addClass('selected');
    }

  };

  // set language
  availableLanguages = ['en', 'ja'];

  $('html').classes().forEach(function(classname) {
    if (classname.startsWith('lang-')) {
      return $('html').removeClass(classname);
    }
  });

  language = navigator.userLanguage || navigator.language;

  setLanguage = null;

  availableLanguages.forEach(function(availableLanguage) {
    if (language.startsWith(availableLanguage)) {
      return setLanguage = availableLanguage;
    }
  });

  if (!setLanguage) {
    setLanguage = availableLanguages[0];
  }

  $('html').addClass('lang-' + setLanguage);

  $('html').attr('lang', setLanguage);

  // kick start
  game = new Game();

}).call(this);

//# sourceMappingURL=main.js.map
