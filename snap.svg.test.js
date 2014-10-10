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
		paper.snapsvgzpd = zpdGroup;
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
		var currentPosition = paper.snapsvgzpd.getBBox();
		// save as attribute in the paper element
		paper.data.zpd.internal.x = currentPosition.x;
		paper.data.zpd.internal.y = currentPosition.y;
		paper.data.zpd.internal.cx = currentPosition.cx;
		paper.data.zpd.internal.cy = currentPosition.cy;
	};

	var _handlePaperDragStart = function _handlePaperDragStart() {
		console.clear();
		this.data.zpd.internal.dx = 0;
		this.data.zpd.internal.dy = 0;
	};

	var _handlePaperDragEnd = function _handlePaperDragEnd () {

	};

	// handle mouse drag on paper object (panning action)
	var _handlePaperDragMove = function _handlePaperDragMove (dx, dy, x, y, event) {

		var paper = this;

		// get the current transformation of the zpd group relative to the paper svg element
		var zpdTransformationMatrix = paper.snapsvgzpd.node.getTransformToElement(paper.node);

		// get transformation matrix of paper element
		var paperMatrixLocal = paper.node.getCTM();

		var deltaX = dx - this.data.zpd.internal.dx;
		var deltaY = dy - this.data.zpd.internal.dy;

		this.data.zpd.internal.dx = dx;
		this.data.zpd.internal.dy = dy;

		// create a matrix for the transformation of the element if it did not have any transformation applied
		var baseMatrix = paper.node.createSVGMatrix();

		// calculate translation relative to paper view port and viewbox
		var translateX = deltaX / paperMatrixLocal.a;
		var translateY = deltaY / paperMatrixLocal.d;

		// apply the translation to a base matrix (0,0) and then apply the zpd transformation
		var translatedMatrix = baseMatrix.translate(translateX, translateY).multiply(zpdTransformationMatrix);

		// apply the new matrix to the zpd element
		paper.applyZpdTransformation(translatedMatrix);



		/*var pt = paper.node.createSVGPoint();
		pt.x = x;
		pt.y = y;
		var globalPoint = pt.matrixTransform(matrixCounterSvgTransform);
		paper.circle(globalPoint.x, globalPoint.y, 3).attr({'fill': 'red', 'opacity': 0.3});
		console.log(dx, dy);
		paper.line(globalPoint.x, globalPoint.y, globalPoint.x + translatedMatrix.e, globalPoint.y + translatedMatrix.f).attr({'stroke': 'green', 'opacity': 0.3});

		var newTransformMatrix = matrixCounterZpdTransform.multiply(zpdTransformationMatrix);

		paper.applyZpdTransformation(matrixCounterSvgTransform);
		*/

		// get the transformation from the global to the current element;
		/* var globalToLocal = svgToElementMatrix.inverse();

		// transform our global translation matrix into the current object transformation
		var localTranslateMatrix = globalTranslateMatrix.multiply(globalToLocal);

		console.log(globalToLocal);
		console.log('translationGlobal:', dx, dy);
		console.log('translationLocal:', localTranslateMatrix.e, localTranslateMatrix.f);
		*/


		// console.log("current currentMatrix:", zpdTransformationMatrix);

		/*var transformObject = paper.node.createSVGTransform();
		transformObject.setTranslate(localTranslateMatrix.e, localTranslateMatrix.f);

		if (paper.snapsvgzpd.node.transform.baseVal.length > 0) {
			console.log("has baseVal");
			console.log("currentBaseVal", paper.snapsvgzpd.node.transform.baseVal.consolidate().matrix);
		}

		var tmp = paper.snapsvgzpd.node.transform.baseVal.insertItemBefore(transformObject, 0);

		console.log('translationGlobal:', dx, dy);
		console.log('translationLocal:', localTranslateMatrix.e, localTranslateMatrix.f);
		console.log("consolidated:", paper.snapsvgzpd.node.transform.baseVal.consolidate().matrix);
		*/

		//var newMatrix = paper.snapsvgzpd.node.transform.baseVal.consolidate().matrix;

		// apply to local translation matrix
		//var newMatrix = zpdTransformationMatrix.multiply(localTranslateMatrix);

		// apply our local transformation
		//paper.applyZpdTransformation(newMatrix);


		/*console.log("matrixToScreen:", paperMatrixGlobal);
		console.log("matrixToSvg:", zpdMatrixToSvg );
		console.log("scaling", paperMatrixGlobal.a, paperMatrixGlobal.d);
		console.log("scalingLocal", paperMatrixLocal.a, paperMatrixLocal.d);
		console.log("delta", dx, dy);

		// apply scaling factor to delta of movement (in case of viewBox and width/height for svg box)
		var translateX = dx / paperMatrixLocal.a;
		var translateY = dy / paperMatrixLocal.d;

		console.log("transalation:", translateX, translateY);

		// apply the translation to the existing zpdMatrix
		var transformMatrix = zpdMatrixToSvg.translate(translateX, translateY);

		console.log("Tmatrix:", transformMatrix); */

		// apply the matrix to the element
		//paper.applyZpdTransformation(inObjectSpace);

		//_removeZpdPaperEventHandlers(this);
	};

	// check if current zoom value is in specified range
	var _isZoomInAllowedRange = function _isZoomInAllowedRange (zoomValue, options) {
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

		return true;
	};

	// get an svg transformation matrix as string representation
	var _getSvgMatrixAsString = function _getMatrixAsString (matrix) {
		return "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
	};

	// get a mouse wheel hander function with reference to the paper object
	var _handleMouseWheel = function _handleMouseWheel(event) {
		if (event.preventDefault) {
			// note: pass in eventHandler to prevent for firefox
			event.preventDefault(event);
		}

		 console.log(arguments);

		// get paper element from current element (attached by .bind to the event handler)
		paper = this;

		// initialize wheeling delta
		var delta = 0;

		// get a reference to our zpd object
		var zpdData = paper.data.zpd;

		// get 'amount' of scrolling
		if (event.wheelDelta) {
			delta = event.wheelDelta / 360;  // Chrome/Safari
		}
		else {
			delta = event.detail / - 9;      // Mozilla
		}

		// use previously stored delta to add up zooming
		var deltaSum = zpdData.internal.delta + delta;

		// calculate current scaling value
		var zoomCurrent = Math.pow(1 + zpdData.options.zoomScale, delta);

		// calculate total zooming value
		var zoomTotal = Math.pow(1 + zpdData.options.zoomScale, deltaSum);

		console.group("wheel-event");

		// restrict zooming to a certain limit
		if (_isZoomInAllowedRange(zoomTotal, zpdData.options)) {

			console.log("ZoomCurrent: ", zoomCurrent);

			// save sum of delta for next mouse wheel event
			zpdData.internal.delta = deltaSum;

			// calculate zooming change (previously saved scale and new total scale)
			var zoomDelta = zpdData.transformation.scale - zoomTotal;

			// only change if zooming has a certain difference
			if (zoomDelta > 0.001 || zoomDelta < -0.01) {

				console.log('apply zoom:', zoomDelta, zoomCurrent, zoomTotal);

				var zpdNode = paper.snapsvgzpd.node;
				var zpdNodeMatrix = zpdNode.getCTM();

				var paperMatrixToScreen = paper.node.getScreenCTM();

				// get coordinates relative to the svg-paper-element
				var p = paper.node.createSVGPoint();
				p.x = event.clientX - paperMatrixToScreen.e;
				p.y = event.clientY - paperMatrixToScreen.f;

				p.x = event.clientX;
				p.y = event.clientY;

				p = p.matrixTransform(zpdNode.getCTM().inverse());

				// create a base matrix for our transformations
				var baseMatrix = paper.node.createSVGMatrix();

				var scaleTransformation = baseMatrix.translate(p.x, p.y).scale(zoomCurrent).translate(-p.x, -p.y);
				var matrix = zpdNode.getCTM().multiply(scaleTransformation);

				paper.snapsvgzpd.node.setAttribute('transform', _getSvgMatrixAsString(matrix));

				zpdData.transformation.scale = zoomTotal;
				zpdData.transformation.translateX = matrix.e;
				zpdData.transformation.translateY = matrix.f;

			}

			// apply our transformation to the element
			// paper.applyZpdTransformation();

			// // get the transformation matrix of our paper object relative to the screen
			// var zpdMatrixRelativeToScreen = paper.snapsvgzpd.node.getScreenCTM();

			// // get our mouse position (relative to our zpd object)
			// mousePositionX = event.clientX - zpdMatrixRelativeToScreen.e;
			// mousePositionY = event.clientY - zpdMatrixRelativeToScreen.f;

			// var deltaX = mousePositionX - zpdData.internal.x;
			// var deltaY = mousePositionY - zpdData.internal.y;

			// var deltaZoom = zpdData.transformation.scale - zoomAmount;

			// console.debug("Previous:", zpdData.transformation.scale);
			// console.debug("Current: ", zoomAmount);
			// console.debug("Delta:   ", deltaZoom);

			// if (deltaZoom > 0.02 || deltaZoom < -0.02) {

			// 	// calculate new position of our group
			// 	var x = zpdData.internal.x + (deltaX * (1 - deltaZoom));
			// 	var y = zpdData.internal.y + (deltaY * (1 - deltaZoom));

			// 	paper.snapsvgzpd.circle((1/zoomAmount) * deltaX, (1/zoomAmount) * deltaY, 10).attr({'fill': '#ff0080'});

			// 	zpdData.transformation.scale = zoomAmount;
			// 	zpdData.transformation.translateX = Math.round(x);
			// 	zpdData.transformation.translateY = Math.round(y);

			// 	// apply our transformation to the element
			// 	paper.applyZpdTransformation();

			// 	// get the current position
			// 	//zpdData.internal.x = x;
			// 	//zpdData.internal.y = y;
			// }


		}

		console.groupEnd();

		// _removeZpdPaperEventHandlers(paper);
	};

	var _clearConsole = function (event) {
		console.clear();
	};

	// add event handlers to the paper element
	var _addZpdPaperEventHandlers = function _addZpdPaperEventHandlers(paper) {
		paper.drag(_handlePaperDragMove, _handlePaperDragStart, _handlePaperDragEnd);
		// paper.mousewheel(_handleMouseWheel);
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
					console.log("attached");
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
			this.data.zpd = {
				internal: {
					x: 0,
					y: 0,
					dx: 0,
					dy: 0,
					cx: 0,
					cy: 0,
					delta: 0,
				},
				transformation: {
					translateX: 0,
					translateY: 0,
					scale: 1,
					rotation: 0
				},
				options: {
					zoomScale: 1,
					zoomMaximum: 3,
					zoomMinimum: 0.01
				}
			};

			// move all elements into one group node
			_initializeZpdGroup(this);

			// add some event handlers to the paper element
			// note: unfortunately event handlers will not fire on empty space in a group element
			// therefore we attach the handlers directly to the paper element
			_addZpdPaperEventHandlers(this);

			// add a base matrix and a base transform for later use
			this.data.zpd.internal.baseMatrix = this.node.createSVGMatrix();
			this.data.zpd.internal.baseTransform = this.node.createSVGTransform();

		};

		// remove the zpd functionality from a paper element
		Paper.prototype.destroyZpd = function destroyZpd() {
			// check if zpd group has been initialized on the paper element
			if (this.hasOwnProperty('snapsvgzpd')) {
				// remove our custom eventhandlers
				_removeZpdPaperEventHandlers(this);
				// remove encapsulating transformation group
				_removeNodeKeepContent(this.snapsvgzpd);
			}
		};

		// create a string for our transformation (note: order matters)
		Paper.prototype.applyZpdTransformation = function applyZpdTransformation(transformMatrix) {
			// initialize our transformation string
			var transformationString = '';

			// create transformation string from matrix
			transformationString = _getSvgMatrixAsString(transformMatrix);

			// apply the transformation
			this.snapsvgzpd.node.setAttribute('transform', transformationString);

			// return the transformation string (if anyone would need it)
			return transformationString;
		};

		// rotate the zpd element around it's current center
		Paper.prototype.rotate = function rotate(amount) {
			// TODO: this is still gonna need some work
			_getCurrentZpdGroupPosition(this);
			this.data.zpd.transformation.rotation += amount;
			this.applyZpdTransformation();
		};

	});

}());
