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

        var preUniqueId = 'snapsvgzpd-';

        var gelem = {}; // global get <g> Element

        /**
         * Sets the current transform matrix of an element.
         */
        var setCTM = function (element, matrix) {
            var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

            element.setAttribute("transform", s);
        };

        /**
         * remove node parent but keep children
         */
        var removeNodeKeepChildren = function (node) {
            if (!node.parentElement) return;
            while (node.firstChild) {
                node.parentElement.insertBefore(node.firstChild, node);
            }
            node.parentElement.removeChild(node);
        };

        /**
         * Detect is +1 -1 or 1
         * increase decrease or just number
         */
        var increaseDecreaseOrNumber = function (defaultValue, input) {
            if (input == undefined) {
                return parseInt(defaultValue);
            } else if (input[0] == '+') {
                return defaultValue + parseInt(input.split('+')[1]);
            } else if (input[0] == '-') {
                return defaultValue - parseInt(input.split('-')[1]);
            } else {
                return parseInt(input);
            }
        };

        var zpd = function (options, cb) {

            var me = this,
                root = me.node, // get paper svg
                gElem, // Snapsvg Element
                rootChildNodes = me.node.childNodes, // []
                state = 'none',
                svgRoot = null,
                stateTarget,
                stateOrigin,
                stateTf,
                noopF = function () {};

            /**
             * add a new <g> element to the paper
             * add paper nodes into <g> element (Snapsvg Element)
             * and give the nodes an unique id like 'snapsvg-zpd-12345'
             * and let this <g> Element to global gelem[this.id]
             * and
             * <svg>
             *     <def>something</def>
             *     <circle cx="10" cy="10" r="100"></circle>
             * </svg>
             *
             * transform to =>
             *
             * <svg>
             *     <g>
             *         <def>something</def>
             *         <circle cx="10" cy="10" r="100"></circle>
             *     </g>
             * </svg>
             */
            (function () {

                // check element has zpd() or not
                if (gelem.hasOwnProperty(me.id)) {
                    gElem = gelem[me.id];
                    return;
                }

                var index = 0,
                    gNode;

                gElem = me.g();
                gNode = gElem.node;
                gNode.id = preUniqueId + me.id;

                gelem[me.id] = gElem;

                if (options.load && typeof options.load === 'object') {
                    var matrix = options.load,
                        matrixString = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
                    gelem[me.id].transform(matrixString); // load <g> transform matrix
                } else {
                    gelem[me.id].transform('matrix'); // initial set <g transform="matrix(1,0,0,1,0,0)">
                }


                while (rootChildNodes.length - 1 > index) { // length -1 because the <g> element
                    if (!rootChildNodes[index]) {
                        index++;
                        continue;
                    }
                    gNode.appendChild(rootChildNodes[index]);
                }
            })();

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

                removeNodeKeepChildren(gElem.node);
                delete gelem[me.id];

                root.onmouseup = noopF;
                root.onmousedown = noopF;
                root.onmousemove = noopF;

                if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0)
                    root.removeEventListener('mousewheel', handleMouseWheel, false);
                else
                    root.removeEventListener('DOMMouseScroll', handleMouseWheel, false);

                // callback
                if (cb) cb(null, me);

                return; // exit all
            } else if (options === 'save') {
                var g = document.getElementById(preUniqueId + me.id),
                    returnValue = g.getCTM();

                // callback
                if (cb) cb(null, returnValue);

                return returnValue;
            } else if (options === 'origin') {

                // back to origin location
                this.zoomTo(1, 1000);

                // callback
                if (cb) cb(null, me);

                return;
            }

            /**
             * Configuration of the options and extend by options
             *
             * pan
             * zoom
             * drag
             * zoomScale
             *
             */
            me.pan = true; // 1 or 0: enable or disable panning (default enabled)
            me.zoom = true; // 1 or 0: enable or disable zooming (default enabled)
            me.drag = false; // 1 or 0: enable or disable dragging (default disabled)
            me.zoomScale = 0.2; // Zoom sensitivity

            if (typeof options === 'function') {
                cb = options;
            } else if (typeof options === 'object') {
                for (prop in options) {
                    me[prop] = options[prop];
                }
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

                    if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0)
                        root.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                    else
                        root.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
                }

                // callback
                if (cb) cb(null, me);
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
             * Dumps a matrix to a string (useful for debug).
             */
            function dumpMatrix(matrix) {
                var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";

                return s;
            }

            /**
             * Sets attributes of an element.
             */
            function setAttributes(element, attributes) {
                for (var i in attributes)
                    element.setAttributeNS(null, i, attributes[i]);
            }

            /**
             * Handle mouse wheel event.
             */
            function handleMouseWheel(evt) {
                if (!me.zoom)
                    return;

                if (evt.preventDefault)
                    evt.preventDefault();

                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                var delta;

                if (evt.wheelDelta)
                    delta = evt.wheelDelta / 360; // Chrome/Safari
                else
                    delta = evt.detail / -9; // Mozilla

                var z = Math.pow(1 + me.zoomScale, delta);

                var g = svgDoc.getElementById(preUniqueId + me.id);

                var p = getEventPoint(evt);

                p = p.matrixTransform(g.getCTM().inverse());

                // Compute new scale matrix in current mouse position
                var k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);

                setCTM(g, g.getCTM().multiply(k));

                if (typeof(stateTf) == "undefined")
                    stateTf = g.getCTM().inverse();

                stateTf = stateTf.multiply(k.inverse());
            }

            /**
             * Handle mouse move event.
             */
            function handleMouseMove(evt) {
                if (evt.preventDefault)
                    evt.preventDefault();

                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                var g = svgDoc.getElementById(preUniqueId + me.id);

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
                if (evt.preventDefault)
                    evt.preventDefault();

                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                var g = svgDoc.getElementById(preUniqueId + me.id);

                if (
                    evt.target.tagName == "svg"
                        || !me.drag // Pan anyway when drag is disabled and the user clicked on an element
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
                if (evt.preventDefault)
                    evt.preventDefault();

                evt.returnValue = false;

                var svgDoc = evt.target.ownerDocument;

                if (state == 'pan' || state == 'drag') {
                    // Quit pan mode
                    state = '';
                }
            }

            setupHandlers();
        };


        var zoomTo = function (zoom, interval, ease, cb) {

            if (zoom < 0 || typeof zoom !== 'number') {
                console.error('zoomTo(arg) should be a number and greater than 0')
                return;
            }

            var me = this,
                thisGElem = gelem[me.id];

            if (typeof interval !== 'number') {
                interval = 3000;
            }

            thisGElem.animate({ transform: new Snap.Matrix().scale(zoom) }, interval, ease || null, function () {
                if (cb) {
                    cb(null, thisGElem);
                }
            });

        };

        var panTo = function (x, y, interval, ease, cb) {

            var me = this,
                g = document.getElementById(preUniqueId + me.id),
                gMatrix = g.getCTM(),
                matrixX = increaseDecreaseOrNumber(gMatrix.e, x),
                matrixY = increaseDecreaseOrNumber(gMatrix.f, y),
                matrixString = "matrix("
                    + gMatrix.a
                    + ","
                    + gMatrix.b
                    + ","
                    + gMatrix.c
                    + ","
                    + gMatrix.d
                    + ","
                    + matrixX
                    + ","
                    + matrixY
                    + ")";

            // gelem[me.id].transform(matrixString); // load <g> transform matrix
            gelem[me.id].animate({ transform: matrixString }, interval || 10, ease || null, function () {
                if (cb) {
                    cb(null, gelem[me.id]);
                }
            });
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

