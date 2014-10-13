// create separate function scope to encapsulate our plugin
(function() {

	// define global plugin options
	var _options = {
		zpdClass: 'snapsvg-zpd'
	};

	// move all content of an svg into one node for transformations
	var _initializeZpdGroup = function initializeZpdGroup (paper) {

		// get all nodes in our svg element
		// note: cannot use paper.selectAll('*''), as this will not keep the structure of the
		// svg file; using the raw svg-nodes without wrapping it in snap is probably faster anyway
		var rootChildNodes = paper.node.childNodes;

		// create a new group element (<g>) and add our custom class
		var zpdGroup = paper.group();
		zpdGroup.addClass(_options.zpdClass);

		// initialize our index counter for child nodes
		var index = 0;

		// get the number of child nodes in our root node
		// substract -1 to exclude our <g> element
		var noOfChildNodes = rootChildNodes.length - 1;

		// go through all child elements
		// (note: rootChildNodes holds a reference to the array of svg elements)
		// (except the last one, which is our <g> element)
		while (index < noOfChildNodes) {
			zpdGroup.node.appendChild(rootChildNodes[0]);
			index += 1;
		}

		// save a reference to our node in the paper element
		paper.zpd.element = zpdGroup;
	};

	// remove the supplied node but keep all its children
	var _removeNodeKeepContent = function removeNodeKeepContent (node) {
		if (!node.parentElement) {
			return;
		}
		while (node.firstChild) {
			node.parentElement.insertBefore(node.firstChild, node);
		}
		node.parentElement.removeChild(node);
	};

	// handle start of dragging on the paper object (start of panning)
	var _getCurrentZpdGroupPosition = function _getCurrentZpdGroupPosition (paper) {
		// get current position of our transformation group
		var currentPosition = paper.zpd.element.getBBox();
		// save as attribute in the paper element
		paper.zpd.internal.x = currentPosition.x;
		paper.zpd.internal.y = currentPosition.y;
		paper.zpd.internal.cx = currentPosition.cx;
		paper.zpd.internal.cy = currentPosition.cy;
	};

	var _handlePaperDragStart = function _handlePaperDragStart() {
		// retrieve the transformation matrix of the zpd-element relative to the paper (svg) element
		this.zpd.internal.zpdMatrix = this.zpd.element.node.getTransformToElement(this.node);

		// get the local paper transformation matrix (from view-port and view-box settings)
		this.zpd.internal.paperMatrix = this.node.getCTM();
	};

	var _handlePaperDragEnd = function _handlePaperDragEnd () {
		// clear saved tranlsation matrices
		this.zpd.internal.zpdMatrix = null;
	};

	// handle mouse drag on paper object (panning action)
	var _handlePaperDragMove = function _handlePaperDragMove (dx, dy, x, y, event) {
		var paper = this;

		// calculate translation relative to paper view port and viewbox scaling
		// note: dx/dy are delta of coordinates relative to drag start
		var translateX = dx / paper.zpd.internal.paperMatrix.a;
		var translateY = dy / paper.zpd.internal.paperMatrix.d;

		// create our translation matrix in the paper scope (use a base matrix 0,0, .. and apply scaled translations)
		var matrixInPaperScope = paper.zpd.internal.baseMatrix.translate(translateX, translateY);

		// apply the initial zpd-group transformation matrix after the new translation matrix
		var newZpdTranslationMatrix = matrixInPaperScope.multiply(paper.zpd.internal.zpdMatrix);

		// apply the new matrix to the zpd element
		paper.applyZpdTransformation(newZpdTranslationMatrix);
	};

	// check if current zoom value is in specified range
	var _inAllowedZoomRange = function _inAllowedZoomRange (zoomValue, options) {
		if (options.hasOwnProperty('zoomMinimum')) {
			if (zoomValue < options.zoomMinimum) {
				return false;
			}
		}

		if (options.hasOwnProperty('zoomMaximum')) {
			if (zoomValue > options.zoomMaximum) {
				return false;
			}
		}

		return zoomValue;
	};

	// get an svg transformation matrix as string representation
	var _getSvgMatrixAsString = function _getMatrixAsString (matrix) {
		return "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
	};

	// get a mouse wheel hander function with reference to the paper object
	var _handleMouseWheel = function _handleMouseWheel(event) {
		// prevent scrolling on mousewheel
		if (event.preventDefault) {
			// note: pass in eventHandler to prevent for firefox
			event.preventDefault(event);
		}

		// get paper element from current element (attached by .bind to the event handler)
		paper = this;

		// initialize wheeling delta
		var delta = 0;

		// get 'amount' of scrolling
		if (event.wheelDelta) {
			delta = event.wheelDelta / 360;  // Chrome/Safari
		}
		else {
			delta = event.detail / - 9;      // Mozilla
		}

		// adapt the effect of wheeling to current svg-scaling
		// delta = delta / paper.zpd.internal.zoomMultiplier;

		// use previously stored delta to add up zooming
		var deltaTotal = paper.zpd.internal.delta + delta;

		// calculate current scaling value (from delta between two-mouse-wheel events)
		var zoomCurrent = Math.pow(1 + paper.zpd.options.zoomScale, delta);

		// calculate total zooming value
		var zoomTotal = paper.zpd.internal.zoom * zoomCurrent;

		// get current zoom in allowed range
		zoomTotal = _inAllowedZoomRange(zoomTotal, paper.zpd.options);

		// restrict zooming to a certain limit
		if (zoomTotal) {

			// save sum of delta for next mouse wheel event
			paper.zpd.internal.delta = deltaTotal;

			// calculate zooming change (previously saved scale and new total scale)
			var zoomDelta = paper.zpd.internal.zoom - zoomTotal;

			// only change if zooming has a certain difference
			if (zoomDelta > 0.01 || zoomDelta < -0.01) {

				// get the position of the paper element relative to the screen
				var paperMatrixToScreen = paper.node.getScreenCTM();

				// get coordinates relative to the svg-paper-element
				var p = paper.node.createSVGPoint();
				p.x = event.clientX - paperMatrixToScreen.e;
				p.y = event.clientY - paperMatrixToScreen.f;

				// get current transform matrix for element (relative to svg element)
				var zpdTransformationMatrix = paper.zpd.element.node.getTransformToElement(paper.node);

				// transform the point into the paper-coordinates
				p = p.matrixTransform(paper.zpd.internal.paperMatrix.inverse());
				// p = p.matrixTransform(zpdTransformationMatrix.inverse());

				// scale and move the current element
				var scaleTransformation = paper.zpd.internal.baseMatrix.translate(p.x, p.y).scale(zoomCurrent).translate(-p.x, -p.y);

				// apply the scale and translate and then the previous transformation
				var matrix = scaleTransformation.multiply(zpdTransformationMatrix);

				// apply the transformation to our zpd element
				paper.applyZpdTransformation(matrix);

				// save total zoom for next wheel event
				paper.zpd.internal.zoom = zoomTotal;
			}
		}

	};

	// add event handlers to the paper element
	var _addZpdPaperEventHandlers = function _addZpdPaperEventHandlers(paper) {
		paper.drag(_handlePaperDragMove, _handlePaperDragStart, _handlePaperDragEnd);
		paper.mousewheel(_handleMouseWheel);
	};

	// remove event handlers from the paper element
	var _removeZpdPaperEventHandlers = function _removeZpdPaperEventHandlers(paper) {
		paper.undrag(_handlePaperDragMove, _handlePaperDragStart, _handlePaperDragEnd);
		paper.unmousewheel(_handleMouseWheel);
	};

	// empty function (mainly for event handlers)
	var noopFunction = function () {};

	Snap.plugin( function( Snap, Element, Paper, global ) {

		// add a mousewheel function to the paper element (if not already existing)
		if (Paper.prototype.hasOwnProperty('mousewheel') === false) {
			Paper.prototype.mousewheel = function mousewheel(handler) {
				if (this.node.addEventListener) {
					// IE9, Chrome, Safari, Opera
					this.node.addEventListener('mousewheel', handler.bind(this), false);
					// Firefox
					this.node.addEventListener('DOMMouseScroll', handler.bind(this), false);
				}
			};
			Paper.prototype.unmousewheel = function unmousewheel(handler) {
				if (this.node.addEventListener) {
					// IE9, Chrome, Safari, Opera
					this.node.removeEventListener('mousewheel', handler, false);
					// Firefox
					this.node.removeEventListener('DOMMouseScroll', handler, false);
				}
			};
		}

		// initialize the zpd functionality on a paper lement
		Paper.prototype.initZpd = function initZpd() {

			// add a zpd-data element to this paper object
			this.zpd = {
				internal: {
					delta: 0,
					zoom: 1,
					baseMatrix: null,
					paperMatrix: null,
					zpdMatrix: null
				},
				options: {
					zoomScale: 1,
					zoomMaximum: 2,
					zoomMinimum: 0.5
				}
			};

			// move all elements into one group node
			_initializeZpdGroup(this);

			// add some event handlers to the paper element
			// note: unfortunately event handlers will not fire on empty space in a group element
			// therefore we attach the handlers directly to the paper element
			_addZpdPaperEventHandlers(this);

			// add a base matrix and a base transform for later use
			this.zpd.internal.baseMatrix = this.node.createSVGMatrix();

			// get the svg transformation matrix and the zoom multiplier for it
			this.zpd.internal.paperMatrix = this.node.getCTM();
			this.zpd.internal.zpdMatrix = this.zpd.element.node.getTransformToElement(this.node);

		};

		// remove the zpd functionality from a paper element
		Paper.prototype.destroyZpd = function destroyZpd() {
			// check if zpd group has been initialized on the paper element
			if (this.hasOwnProperty('zpdElement')) {
				// remove our custom eventhandlers
				_removeZpdPaperEventHandlers(this);
				// remove encapsulating transformation group
				_removeNodeKeepContent(this.zpd.element);
			}
		};

		// create a string for our transformation (note: order matters)
		Paper.prototype.applyZpdTransformation = function applyZpdTransformation(transformMatrix) {
			// initialize our transformation string
			var transformationString = '';

			// create transformation string from matrix
			transformationString = _getSvgMatrixAsString(transformMatrix);

			// apply the transformation
			this.zpd.element.node.setAttribute('transform', transformationString);

			// return the transformation string (if anyone would need it)
			return transformationString;
		};

		// rotate the zpd element around it's current center
		Paper.prototype.rotate = function rotate(amount) {
			// TODO: this is still gonna need some work
			_getCurrentZpdGroupPosition(this);
			this.zpd.transformation.rotation += amount;
			this.applyZpdTransformation();
		};

	});

}());
