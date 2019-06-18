/* Julian Raya 2013*/

var doc = document;
var win = window;

var xtnd = function xtnd() {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        arguments[0][key] = arguments[i][key];
      }
    }
  }
  return arguments[0];
};


function BrotCtrl() {
  this.elems = {};
  xtnd(this.elems, {
    z: doc.getElementById('zoom'),
    x: doc.getElementById('xOffset'),
    y: doc.getElementById('yOffset'),
    i: doc.getElementById('iterations'),
    t: doc.getElementById('renderTime')
  });
}

xtnd(BrotCtrl.prototype, {
  Z: function () {
    return parseInt(this.elems.z.value)
  },
  X: function () {
    return parseFloat(this.elems.x.value)
  },
  Y: function () {
    return parseFloat(this.elems.y.value)
  },
  I: function () {
    return parseInt(this.elems.i.value)
  },
  T: function () {
    return parseInt(this.elems.t.value)
  },

  dsbl: function () {
    for (var key in this.elems) {
      if (this.elems.hasOwnProperty(key)) {
        this.elems[key].setAttribute('disabled', 'disabled');
      }
    }
  },
  enbl: function () {
    for (var key in this.elems) {
      if (this.elems.hasOwnProperty(key)) {
        this.elems[key].removeAttribute('disabled');
      }
    }
  },
  setSteps: function () {
    var zoom = this.Z();
    var cStep = 0.5 / zoom;
    var zStep = Math.abs(Math.ceil(zoom / 10) || 1);

    if (cStep) {
      this.elems.x.setAttribute('step', cStep + '');
      this.elems.y.setAttribute('step', cStep + '');
    }

    this.elems.z.setAttribute('step', zStep + '');

  },
  setEvents: function () {
    for (var key in this.elems) {
      if (this.elems.hasOwnProperty(key)) {
        this.elems[key].addEventListener('change', function () {
          win.brot.update();
        });
      }
    }

    var Key = {UP: 38, RIGHT: 39, DOWN: 40, LEFT: 37};

    var ctrl = this;
    win.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.shiftKey) {
        switch (e.keyCode) {
          case Key.UP:
            ctrl.elems.z.value = ctrl.Z() + parseFloat(ctrl.elems.z.step);
            break;
          case Key.DOWN:
            ctrl.elems.z.value = ctrl.Z() - parseFloat(ctrl.elems.z.step);
            break;
          case Key.LEFT:
            ctrl.elems.i.value = ctrl.I() - parseFloat(ctrl.elems.i.step);
            break;
          case Key.RIGHT:
            ctrl.elems.i.value = ctrl.I() + parseFloat(ctrl.elems.i.step);
            break;
        }
      } else {
        switch (e.keyCode) {
          case Key.UP:
            ctrl.elems.y.value = ctrl.Y() + parseFloat(ctrl.elems.y.step);
            break;
          case Key.DOWN:
            ctrl.elems.y.value = ctrl.Y() - parseFloat(ctrl.elems.y.step);
            break;
          case Key.LEFT:
            ctrl.elems.x.value = ctrl.X() + parseFloat(ctrl.elems.x.step);
            break;
          case Key.RIGHT:
            ctrl.elems.x.value = ctrl.X() - parseFloat(ctrl.elems.x.step);
            break;
        }
      }

      if (([37, 38, 39, 40]).indexOf(e.keyCode) != -1) {
        this.brot.update();
      }

    });
  }
});

function BrotPanel(width, height, cyMin, cyMax, cxMin, cxMax, maxI) {

  this.settings = {
    width: Math.ceil(width),
    height: height,
    cyMin: cyMin,
    cyMax: cyMax,
    cxMin: cxMin,
    cxMax: cxMax,
    maxI: maxI
  };

  this.cvs = document.createElement('canvas');
  this.ctx = this.cvs.getContext('2d');
  this.worker = new Worker('js/calc.js');

  var panel = this;
  this.worker.onmessage = function (e) {
    panel.cvs.width = width;
    panel.cvs.height = height;
    panel.ctx.putImageData(e.data.imgData, 0, 0);
    panel.onFree();
  };
}

xtnd(BrotPanel.prototype, {
  work: function () {
    this.settings.imgData = this.ctx.createImageData(this.settings.width, this.settings.height);
    this.worker.postMessage(this.settings);
  },
  onFree: function () {
  }
});


function Brot() {
  this.panels = [];
  this.panelWidth = this.width / this.numWorkers;
  this.cx = {};
  this.cy = {};
  this.ctrl = new BrotCtrl();
  this.ctrl.brot = this;

}

xtnd(Brot.prototype, {
  width: win.innerWidth,
  height: win.innerHeight,
  maxI: 200,
  numWorkers: 6,
  working: false,
  cxCy: function () {
    var offY = this.ctrl.Y();
    var offX = this.ctrl.X();
    var zoom = this.ctrl.Z();
    this.cx.min = ((-2.0 * (this.width / this.height)) / zoom) - offX;
    this.cx.max = ((2.0 * (this.width / this.height)) / zoom) - offX;
    this.cx.step = (this.cx.max - this.cx.min) / this.numWorkers;
    this.cy.min = (-2.0 / zoom) - offY,
        this.cy.max = (2.0 / zoom) - offY
  },
  init: function (contentDiv) {
    this.cxCy();
    for (var i = 0; i < this.numWorkers; i++) {
      var thisCxMin = this.cx.min + (this.cx.step * i);
      var thisCxMax = thisCxMin + this.cx.step;

      var panel = this.panels[i] = new BrotPanel(this.panelWidth, this.height, this.cy.min, this.cy.max, thisCxMin, thisCxMax, this.maxI);
      panel.work();
      panel.cvs.style.left = (i * this.panelWidth) + 'px';
      contentDiv.appendChild(panel.cvs);
    }

    this.ctrl.setEvents();
    this.update();
  },
  update: function () {
    if (!this.working) {
      var numFree = 0;
      var rendStart = Date.now();
      var b = this;

      this.cxCy();
      this.ctrl.dsbl();
      this.ctrl.setSteps();

      this.working = true;

      for (var i = 0; i < this.panels.length; i++) {
        var panel = this.panels[i];
        panel.settings.cxMin = this.cx.min + (this.cx.step * i);
        panel.settings.cxMax = panel.settings.cxMin + this.cx.step;
        panel.settings.cyMin = this.cy.min;
        panel.settings.cyMax = this.cy.max;
        panel.settings.maxI = this.ctrl.I();
        panel.settings.zoom = this.ctrl.Z();

        panel.onFree = function () {
          if (++numFree == b.panels.length) {
            b.ctrl.enbl();
            b.ctrl.elems.t.innerText = (Date.now() - rendStart) + 'ms';
            b.working = false;
          }
        };
        panel.work();
      }
    }
  }
});
