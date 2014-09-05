/* globals Snap, document, navigator */

/**
 *  snapsvg-zpd.js: A zoom/pan/drag plugin for Snap.svg
 * ==================================================
 *
 *  Usage
 * =======
 * var paper = Snap();
 * var bigCircle = paper.circle(150, 150, 100);
 * paper.zpd();
 *
 * // or settings and callback
 * paper.zpd({ zoom: false }), function (err, paper) { });
 *
 * // or callback
 * paper.zpd(function (err, paper) { });
 *
 * // destroy
 * paper.zpd('destroy');
 *
 * // save
 * paper.zpd('save');
 *
 * // load
 * // paper.zpd({ load: SVGMatrix {} });
 *
 * // origin
 * paper.zpd('origin');
 *
 * // zoomTo
 * paper.zoomTo(1);
 *
 * // panTo
 * paper.panTo(0, 0); // original location
 * paper.panTo('+10', 0); // move right
 *
 *  Notice
 * ========
 * This usually use on present view only. Not for Storing, modifying the paper.
 *
 * Reason:
 * Usually <pan> <zoom> => <svg transform="matrix(a,b,c,d,e,f)"></svg>
 *
 * But if you need to store the <drag> location, (for storing)
 * we have to use <circle cx="x" cy="y"></circle> not <circle tranform="matrix(a,b,c,d,e,f)"></circle>
 *
 *  License
 * =========
 * This code is licensed under the following BSD license:
 *
 * Copyright 2014 Huei Tan <huei90@gmail.com> (Snap.svg integration). All rights reserved.
 * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com> (original author). All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 *
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Andrea Leofreddi.
 */
(function (Snap) {
    Snap.plugin(function (Snap, Element, Paper, glob, Fragment) {

        /**
         * Global variable for snap.svg.zpd plugin
         */
        var snapsvgzpd = {
            uniqueIdPrefix: 'snapsvg-zpd-',     // prefix for the unique ids created for zpd
            dataStore: {}                       // "global" storage for all our zpd elements
        };

        /**
         * remove node parent but keep children
         */
        var _removeNodeKeepChildren = function removeNodeKeepChildren(node) {
            if (!node.parentElement) {
                return;
            }
            while (node.firstChild) {
                node.parentElement.insertBefore(node.firstChild, node);
            }
            node.parentElement.removeChild(node);
        };

        /**
         * Detect is +1 -1 or 1
         * increase decrease or just number
         */
        var _increaseDecreaseOrNumber = function increaseDecreaseOrNumber(defaultValue, input) {
            if (input === undefined) {
                return parseInt(defaultValue);
            } else if (input[0] == '+') {
                return defaultValue + parseInt(input.split('+')[1]);
            } else if (input[0] == '-') {
                return defaultValue - parseInt(input.split('-')[1]);
            } else {
                return parseInt(input);
            }
        };

        /**
         * Sets the current transform matrix of an element.
         */
        var _setCTM = function setCTM(element, matrix) {
            var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
            element.setAttribute("transform", s);
        };

        /**
         * Dumps a matrix to a string (useful for debug).
         */
        var _dumpMatrix = function dumpMatrix(matrix) {
            var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";
            return s;
        };

        /**
         * Sets attributes of an element.
         */
        var _setAttributes = function setAttributes(element, attributes) {
            for (var i in attributes) {
                element.setAttributeNS(null, i, attributes[i]);
            }
        };

        /**
         * add a new <g> element to the paper
         * add paper nodes into <g> element (Snapsvg Element)
         * and give the nodes an unique id like 'snapsvg-zpd-12345'
         * and let this <g> Element to global snapsvgzpd.dataStore['snapsvg-zpd-12345']
         * and
         * <svg>
         *     <def>something</def>
         *     <circle cx="10" cy="10" r="100"></circle>
         * </svg>
         *
         * transform to =>
         *
         * <svg>
         *     <g id="snapsvg-zpd-12345">
         *         <def>something</def>
         *         <circle cx="10" cy="10" r="100"></circle>
         *     </g>
         * </svg>
         */
        var _initAndGetZpdElement = function initAndGetZpdElement (svgElement, loadMatrix) {

            // check if element was already initialized
            if (snapsvgzpd.dataStore.hasOwnProperty(svgElement.id)) {
                // return existing element
                return snapsvgzpd.dataStore[svgElement.id];
            }
            else {

                // get all child nodes in our svg element
                var rootChildNodes = svgElement.node.childNodes;

                // create a new graphics element in our svg element
                var gElement = svgElement.g();
                var gNode = gElement.node;

                // add our unique id
                gNode.id = snapsvgzpd.prependUniqueId + svgElement.id;

                // check if a matrix has been supplied to initialize the drawing
                if (loadMatrix && typeof loadMatrix === 'object') {

                    // create a matrix string from our supplied matrix
                    var matrixString = "matrix(" + loadMatrix.a + "," + loadMatrix.b + "," + loadMatrix.c + "," + loadMatrix.d + "," + loadMatrix.e + "," + loadMatrix.f + ")";

                    // load <g> transform matrix
                    gElement.transform(matrixString);


                } else {
                    // initial set <g transform="matrix(1,0,0,1,0,0)">
                    gElement.transform('matrix');
                }

                // initialize our index counter for child nodes
                var index = 0;

                // get the length ouf our rootChildNodes (to avoid recalculation in loop)
                var rootChildNodesLength = rootChildNodes.length;

                // append the nodes to our newly created g-element
                for (index; index < rootChildNodesLength; index++) {
                    gNode.appendChild(rootChildNodes[index]);
                }

                // store a reference in our "global" data store
                snapsvgzpd.dataStore[svgElement.id] = gElement;

                // return our element
                return gElement;

            }

        };

        /* our global zpd function */
        var zpd = function (options, callbackFunc) {

            // get a reference to the current element
            var self = this;

            // define some data to be used in the function internally
            var zpdData = {
                root: self.node,        // get paper svg
                dataStore: null,        // Snapsvg Element
                rootChildNodes: self.node.childNodes,     // []
                state: 'none',
                svgRoot: null,
                stateTarget: null,
                stateOrigin: null,
                stateTf: null,
                noopF: function () {}
            };

            // define some custom options
            var zpdOptions = {
                pan: true,          // enable or disable panning (default enabled)
                zoom: true,         // enable or disable zooming (default enabled)
                drag: false,        // enable or disable dragging (default disabled)
                zoomScale: 0.2      // defien zoom sensitivity
            };

            // it is also possible to only specify a callback function without any options
            if (typeof options === 'function') {
                callbackFunc = options;

            } else if (typeof options === 'object') {
                for (var prop in options) {
                    zpdOptions = options[prop];
                }
            }

            var zpdElement = _initAndGetZpdElement(self);

            /**
             * Useful event for zpd
             * should return after the event
             *
             * destroy event
             * save event
             * load event (use in options.load)
             * origin event
             */
            if (options === 'destroy') {

                _removeNodeKeepChildren(dataStore.node);
                delete snapsvgzpd.dataStore[me.id];

                root.onmouseup = noopF;
                root.onmousedown = noopF;
                root.onmousemove = noopF;

                if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0) {
                    root.removeEventListener('mousewheel', handleMouseWheel, false);
                }
                else {
                    root.removeEventListener('DOMMouseScroll', handleMouseWheel, false);
                }

                // callback
                if (cb) {
                    cb(null, me);
                }

                return; // exit all

            } else if (options === 'save') {

                var g = document.getElementById(snapsvgzpd.prependUniqueId + me.id),
                    returnValue = g.getCTM();

                // callback
                if (cb) {
                    cb(null, returnValue);
                }

                return returnValue;

            } else if (options === 'origin') {

                // back to origin location
                this.zoomTo(1, 1000);

                // callback
                if (cb) {
                    cb(null, me);
                }

                return;
            }



            /**
             * Register handlers
             * desktop and mobile (?)
             */
            function setupHandlers() {

                // mobile
                // (?)

                // desktop
                if ('onmouseup' in document.documentElement) {
                    root.onmouseup = handleMouseUp;
                    root.onmousedown = handleMouseDown;
                    root.onmousemove = handleMouseMove;

                    if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0) {
                        root.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                    }

                    else {
                        root.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
                    }

                }

                // callback
                if (cb) {
                    cb(null, me);
                }
            }

            /**
             * Instance an SVGPoint object with given event coordinates.
             */
            function getEventPoint(evt) {
                var p = root.createSVGPoint();

                p.x = evt.clientX;
                p.y = evt.clientY;

                return p;
            }


            /**
             * Handle mouse wheel event.
             */
            function handleMouseWheel(evt) {
                if (!me.zoom || snapsvgzpd.isDestroy) {
                    return;
                }

                if (evt.preventDefault) {
                    evt.preventDefault();
                }


                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                var delta;

                if (evt.wheelDelta) {
                    delta = evt.wheelDelta / 360; // Chrome/Safari
                }
                else {
                    delta = evt.detail / -9; // Mozilla
                }

                var z = Math.pow(1 + me.zoomScale, delta);

                var g = svgDoc.getElementById(snapsvgzpd.prependUniqueId + me.id);

                var p = getEventPoint(evt);

                p = p.matrixTransform(g.getCTM().inverse());

                // Compute new scale matrix in current mouse position
                var k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);

                setCTM(g, g.getCTM().multiply(k));

                if (typeof(stateTf) == "undefined") {
                    stateTf = g.getCTM().inverse();
                }


                stateTf = stateTf.multiply(k.inverse());
            }

            /**
             * Handle mouse move event.
             */
            function handleMouseMove(evt) {

                if (evt.preventDefault) {
                    evt.preventDefault();
                }

                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                var g = svgDoc.getElementById(snapsvgzpd.prependUniqueId + me.id);

                if (state == 'pan' && me.pan) {
                    // Pan mode
                    var p = getEventPoint(evt).matrixTransform(stateTf);

                    setCTM(g, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));

                } else if (state == 'drag' && me.drag) {

                    // Drag mode
                    var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());

                    setCTM(stateTarget, root.createSVGMatrix().translate(p.x - stateOrigin.x, p.y - stateOrigin.y).multiply(g.getCTM().inverse()).multiply(stateTarget.getCTM()));

                    stateOrigin = p;

                }
            }

            /**
             * Handle click event.
             */
            function handleMouseDown(evt) {
                if (evt.preventDefault) {
                    evt.preventDefault();
                }

                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                var g = svgDoc.getElementById(snapsvgzpd.prependUniqueId + me.id);

                if (
                    evt.target.tagName == "svg" || !me.drag    // Pan anyway when drag is disabled and the user clicked on an element
                ) {
                    // Pan mode
                    state = 'pan';

                    stateTf = g.getCTM().inverse();

                    stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
                } else {
                    // Drag mode
                    state = 'drag';

                    stateTarget = evt.target;

                    stateTf = g.getCTM().inverse();

                    stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
                }
            }

            /**
             * Handle mouse button release event.
             */
            function handleMouseUp(evt) {
                if (evt.preventDefault) {
                    evt.preventDefault();
                }


                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                if (state == 'pan' || state == 'drag') {
                    // Quit pan mode
                    state = '';
                }
            }

            setupHandlers();
        };

        var zoomTo = function (zoom, interval, ease, callbackFunction) {

            if (zoom < 0 || typeof zoom !== 'number') {
                console.error('zoomTo(arg) should be a number and greater than 0');
                return;
            }

            if (typeof interval !== 'number') {
                interval = 3000;
            }

            var self = this;

            // check if we have this element in our zpd data storage
            if (snapsvgzpd.dataStore.hasOwnProperty(self.id)) {

                // get a reference to the element
                var zpdElement = snapsvgzpd.dataStore[self.id];

                // animate our element and call the callback afterwards
                zpdElement.animate({ transform: new Snap.Matrix().scale(zoom) }, interval, ease || null, function () {
                    if (callbackFunction) {
                        callbackFunction(null, zpdElement);
                    }
                });
            }

        };

        var panTo = function (x, y, interval, ease, cb) {

            // get a reference to the current element
            var self = this;

            // check if we have this element in our zpd data storage
            if (snapsvgzpd.dataStore.hasOwnProperty(self.id)) {

                var zpdElement = snapsvgzpd.dataStore[self.id];

                var gMatrix = zpdElement.node.getCTM(),
                    matrixX = increaseDecreaseOrNumber(gMatrix.e, x),
                    matrixY = increaseDecreaseOrNumber(gMatrix.f, y),
                    matrixString = "matrix(" + gMatrix.a + "," + gMatrix.b + "," + gMatrix.c + "," + gMatrix.d + "," + matrixX + "," + matrixY + ")";

                // dataStore[me.id].transform(matrixString); // load <g> transform matrix
                zpdElement.animate({ transform: matrixString }, interval || 10, ease || null, function () {
                    if (cb) {
                        cb(null, zpdElement);
                    }
                });

            }

        };

        Paper.prototype.zpd = zpd;
        Paper.prototype.zoomTo = zoomTo;
        Paper.prototype.panTo = panTo;


        /** More Features to add (click event) help me if you can **/
        // Element.prototype.panToCenter = panToCenter; // arg (ease, interval, cb)

        /** rotate => snap.svg.zpdr **/

        /** UI for zpdr **/

    });

})(Snap);

