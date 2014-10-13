
// code from http://svg.dabbles.info/snaptut-freetransform-viewbox.html

(function() {
	var lineAttributes = { stroke: 'red', strokeWidth: 2, strokeDasharray: "5,5" };

	Snap.plugin( function( Snap, Element, Paper, global ) {

		var ftOption = {
			handleFill: "silver",
			handleStrokeDash: "5,5",
			handleStrokeWidth: "2",
			handleLength: "75",
			handleRadius: "7",
			handleLineWidth: 2,
		};

		Element.prototype.ftCreateHandles = function() {
			this.ftInit();
			var freetransEl = this;
			var bb = freetransEl.getBBox(0);

			var rotateDragger = this.paper.circle(bb.cx + bb.width + ftOption.handleLength, bb.cy, ftOption.handleRadius ).attr({ fill: ftOption.handleFill });
			var translateDragger = this.paper.circle(bb.cx, bb.cy, ftOption.handleRadius ).attr({ fill: ftOption.handleFill });

			var joinLine = freetransEl.ftDrawJoinLine( rotateDragger );
			var handlesGroup = this.paper.g( joinLine, rotateDragger, translateDragger );

			freetransEl.data( "handlesGroup", handlesGroup );
			freetransEl.data( "joinLine", joinLine);

			freetransEl.data( "scaleFactor", calcDistance( bb.cx, bb.cy, rotateDragger.attr('cx'), rotateDragger.attr('cy') ) );

			translateDragger.drag( 	elementDragMove.bind(  translateDragger, freetransEl ),
						elementDragStart.bind( translateDragger, freetransEl ),
						elementDragEnd.bind( translateDragger, freetransEl ) );

			freetransEl.undblclick();
			freetransEl.data("dblclick", freetransEl.dblclick( function() {  this.ftRemoveHandles() } ) );

			rotateDragger.drag(
				dragHandleRotateMove.bind( rotateDragger, freetransEl ),
				dragHandleRotateStart.bind( rotateDragger, freetransEl  ),
				dragHandleRotateEnd.bind( rotateDragger, freetransEl  )
			);
			freetransEl.ftStoreInitialTransformMatrix();

			freetransEl.ftHighlightBB();
			return this;
		};

		Element.prototype.ftInit = function() {
			this.data("angle", 0);
			this.data("scale", 1);
			this.data("tx", 0);
			this.data("ty", 0);
			return this;
		};

		Element.prototype.ftCleanUp = function() {
			var myClosureEl = this;
			var myData = ["angle", "scale", "scaleFactor", "tx", "ty", "otx", "oty", "bb", "bbT", "initialTransformMatrix", "handlesGroup", "joinLine"];
			myData.forEach( function( el ) { myClosureEl.removeData([el]) });
			return this;
		};

		Element.prototype.ftStoreStartCenter = function() {
			this.data('ocx', this.attr('cx') );
			this.data('ocy', this.attr('cy') );
			return this;
		}

		Element.prototype.ftStoreInitialTransformMatrix = function() {
			this.data('initialTransformMatrix', this.transform().localMatrix );
			return this;
		};

		Element.prototype.ftGetInitialTransformMatrix = function() {
			return this.data('initialTransformMatrix');
		};

		Element.prototype.ftRemoveHandles = function() {
			this.undblclick();
			this.data( "handlesGroup").remove();
			this.data( "bbT" ) && this.data("bbT").remove();
			this.data( "bb" ) && this.data("bb").remove();
			this.dblclick( function() { this.ftCreateHandles() } ) ;
			this.ftCleanUp();
			return this;
		};

		Element.prototype.ftDrawJoinLine = function( handle ) { // note, handle could be either dragger or rotater
			var lineAttributes = { stroke: ftOption.handleFill, strokeWidth: ftOption.handleStrokeWidth, strokeDasharray: ftOption.handleStrokeDash };
			var rotateHandle = handle.parent()[1];
			var dragHandle = handle.parent()[2];

			var thisBB = this.getBBox(0);

			if( this.data("joinLine") ) {
				this.data("joinLine").attr({ x1: dragHandle.attr('cx'), y1: dragHandle.attr('cy'), x2: rotateHandle.attr('cx'), y2: rotateHandle.attr('cy') });
			} else {
				return this.paper.line( thisBB.cx, thisBB.cy, handle.attr('cx'), handle.attr('cy') ).attr( lineAttributes );
			};

			return this;
		};

		Element.prototype.ftTransformedPoint = function( x, y ) {
			var transform = this.transform().diffMatrix;
			return { x:  transform.x( x,y ) , y:  transform.y( x,y ) };
		};

		Element.prototype.ftUpdateTransform = function() {
			var tstring = "t" + this.data("tx") + "," + this.data("ty") + this.ftGetInitialTransformMatrix().toTransformString() + "r" + this.data("angle") + 'S' + this.data("scale" );
			this.attr({ transform: tstring });
			this.data("bbT") && this.ftHighlightBB();
			return this;
		};

		Element.prototype.ftHighlightBB = function() {
			this.data("bbT") && this.data("bbT").remove();
			this.data("bb") && this.data("bb").remove();

			this.data("bbT", this.paper.rect( rectObjFromBB( this.getBBox(1) ) )
							.attr({ fill: "none", stroke: ftOption.handleFill, strokeDasharray: ftOption.handleStrokeDash })
							.transform( this.transform().local.toString() ) );
			this.data("bb", this.paper.rect( rectObjFromBB( this.getBBox() ) )
							.attr({ fill: "none", stroke: ftOption.handleFill, strokeDasharray: ftOption.handleStrokeDash }) );
			return this;
		};

	});

	function rectObjFromBB ( bb ) {
		return { x: bb.x, y: bb.y, width: bb.width, height: bb.height }
	}

	function elementDragStart( mainEl, x, y, ev ) {
		this.parent().selectAll('circle').forEach( function( el, i ) {
				el.ftStoreStartCenter();
		} );
		mainEl.data("otx", mainEl.data("tx") || 0);
		mainEl.data("oty", mainEl.data("ty") || 0);
	};

	function invTransformPoint( el, x, y ) {
		var tdx, tdy;
		var snapInvMatrix = el.transform().diffMatrix.invert();
		snapInvMatrix.e = snapInvMatrix.f = 0;
		return {
			tx: snapInvMatrix.x( x,y ),
			ty: snapInvMatrix.y( x,y )
		}
	}

	function elementDragMove( mainEl, dx, dy, x, y ) {
		var dragHandle = this;
		var ip = invTransformPoint( this, dx, dy );
		this.parent().selectAll('circle').forEach( function( el, i ) {
			el.attr({ cx: +el.data('ocx') + ip.tx, cy: +el.data('ocy') + ip.ty });
		} );
		mainEl.data("tx", mainEl.data("otx") + +ip.tx);
		mainEl.data("ty", mainEl.data("oty") + +ip.ty);

		mainEl.ftUpdateTransform();
		mainEl.ftDrawJoinLine( dragHandle );
	}

	function elementDragEnd( mainEl, dx, dy, x, y ) {
	};

	function dragHandleRotateStart( mainElement ) {
		this.ftStoreStartCenter();
	};

	function dragHandleRotateEnd( mainElement ) {
	};

	function dragHandleRotateMove( mainEl, dx, dy, x, y, event ) {
		var handle = this;
		var mainBB = mainEl.getBBox();
		var ip = invTransformPoint( this, dx, dy );

		handle.attr({ cx: +handle.data('ocx') + ip.tx, cy: +handle.data('ocy') + ip.ty });

		mainEl.data("angle", Snap.angle( mainBB.cx, mainBB.cy, handle.attr('cx'), handle.attr('cy') ) - 180);

		var distance = calcDistance( mainBB.cx, mainBB.cy, handle.attr('cx'), handle.attr('cy') );

		mainEl.data("scale", distance / mainEl.data("scaleFactor") );

		mainEl.ftUpdateTransform();
		mainEl.ftDrawJoinLine( handle );
	};

	function calcDistance(x1,y1,x2,y2) {
		return Math.sqrt( Math.pow( (x1 - x2), 2)  + Math.pow( (y1 - y2), 2)  );
	}


})();




