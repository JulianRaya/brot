/* Julian Raya 2013*/

var doc = document;
var win = window;

function xtnd() {
    for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                arguments[0][key] = arguments[i][key];
            }
        }
    }
    return arguments[0];
};


function ControlPanel(brot) {
    this.brot = brot;
    this.elems = {
        z: doc.getElementById('zoom'),
        x: doc.getElementById('xOffset'),
        y: doc.getElementById('yOffset'),
        i: doc.getElementById('iterations'),
        t: doc.getElementById('renderTime')
    };

    Object.values(this.elems).forEach(function(el){
        el.addEventListener('input', function(){
            brot.update();
        });
    })
}

xtnd(ControlPanel.prototype, {
    getZoom: function () {
        return parseInt(this.elems.z.value)
    },
    getXOffset: function () {
        return parseFloat(this.elems.x.value)
    },
    getYOffset: function () {
        return parseFloat(this.elems.y.value)
    },
    getIterations: function () {
        return parseInt(this.elems.i.value)
    },
    setSteps: function () {
        var zoom = this.getZoom();
        var cStep = 0.5 / zoom;
        var zStep = Math.abs(Math.ceil(zoom / 10) || 1);

        if (cStep) {
            this.elems.x.setAttribute('step', cStep);
            this.elems.y.setAttribute('step', cStep);
        }

        this.elems.z.setAttribute('step', zStep);

    },
    setEvents: function () {

        var Key = {UP: 38, RIGHT: 39, DOWN: 40, LEFT: 37};
        var actions = {
            shift:{},
            noshift:{}
        };
        actions.shift[Key.UP]    = ()=> this.elems.z.value = this.getZoom() + parseInt(this.elems.z.step);
        actions.shift[Key.DOWN]  = ()=> this.elems.z.value = this.getZoom() - parseInt(this.elems.z.step);
        actions.shift[Key.LEFT]  = ()=> this.elems.i.value = this.getIterations() - parseInt(this.elems.i.step);
        actions.shift[Key.RIGHT] = ()=> this.elems.i.value = this.getIterations() + parseInt(this.elems.i.step);

        actions.noshift[Key.UP]    = ()=> this.elems.y.value = this.getYOffset() + parseFloat(this.elems.y.step);
        actions.noshift[Key.DOWN]  = ()=> this.elems.y.value = this.getYOffset() - parseFloat(this.elems.y.step);
        actions.noshift[Key.LEFT]  = ()=> this.elems.x.value = this.getXOffset() + parseFloat(this.elems.x.step);
        actions.noshift[Key.RIGHT] = ()=> this.elems.x.value = this.getXOffset() - parseFloat(this.elems.x.step);

        var brot = this.brot;
        win.addEventListener('keydown', function (e) {
            if(!brot.working){
                if (Object.values(Key).some(k => k === e.keyCode)) {
                    if (e.ctrlKey || e.shiftKey) {
                        actions.shift[e.keyCode]();
                    } else {
                        actions.noshift[e.keyCode]();
                    }
                    brot.update();
                }
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
    this.panelWidth = Math.round(this.width / this.numPanelsX);
    this.panelHeight = Math.round(this.height / this.numPanelsY);
    this.cx = {};
    this.cy = {};
    this.ctrl = new ControlPanel(this);
    this.ctrl.brot = this;
}

xtnd(Brot.prototype, {
    width: win.innerWidth,
    height: win.innerHeight,
    maxI: 200,
    numPanelsX: 6,
    numPanelsY: 4,
    working: false,
    cxCy: function () {
        var offY = this.ctrl.getYOffset();
        var offX = this.ctrl.getXOffset();
        var zoom = this.ctrl.getZoom();

        // multiply by w/h ratio of screen because screen is not square
        this.cx.min = ((-2.0 * (this.width / this.height)) / zoom) - offX;
        this.cx.max = ((2.0 * (this.width / this.height)) / zoom) - offX;
        this.cx.step = (this.cx.max - this.cx.min) / this.numPanelsX;

        this.cy.min = (-2.0 / zoom) - offY;
        this.cy.max = (2.0 / zoom) - offY;
        this.cy.step = (this.cy.max - this.cy.min) / this.numPanelsY;

    },
    init: function (contentDiv) {

        this.cxCy();
        for (var y = 0; y < this.numPanelsY; y++) {

            this.panels[y] = [];

            var thisCyMin = this.cy.min + (this.cy.step * y);
            var thisCyMax = thisCyMin + this.cy.step;

            for (var x = 0; x < this.numPanelsX; x++) {

                var thisCxMin = this.cx.min + (this.cx.step * x);
                var thisCxMax = thisCxMin + this.cx.step;

                var panel = this.panels[y][x] = new BrotPanel(this.panelWidth, this.panelHeight, thisCyMin, thisCyMax, thisCxMin, thisCxMax, this.maxI);
                panel.work();
                panel.cvs.style.left = Math.round(x * this.panelWidth) + 'px';
                panel.cvs.style.top = Math.round(y * this.panelHeight) + 'px';
                contentDiv.appendChild(panel.cvs);
            }
        }

        this.ctrl.setEvents();
        this.update();
    },
    update: function () {
        this.ctrl.setSteps();
        if (!this.working) {
            var numFree = 0;
            var rendStart = Date.now();
            var b = this;

            this.cxCy();

            this.working = true;

            for(var y = 0; y < this.numPanelsY; y++) {
                for (var x = 0; x < this.numPanelsX; x++) {

                    var panel = this.panels[y][x];
                    panel.settings.cxMin = this.cx.min + (this.cx.step * x);
                    panel.settings.cxMax = panel.settings.cxMin + this.cx.step;

                    panel.settings.cyMin = this.cy.min + (this.cy.step * y);
                    panel.settings.cyMax = panel.settings.cyMin + this.cy.step;

                    panel.settings.maxI = this.ctrl.getIterations();
                    panel.settings.zoom = this.ctrl.getZoom();

                    panel.onFree = function () {
                        if (++numFree === b.numPanelsX * b.numPanelsY) {
                            b.ctrl.elems.t.innerText = (Date.now() - rendStart) + 'ms';
                            b.working = false;
                        }
                    };
                    panel.work();
                }
            }
        }
    }
});
