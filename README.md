# snap.svg.zpd

A zoom/pan/drag plugin for Snap.svg

This is an an adaptation of Andrea Leofreddi's [SVGPan library](https://code.google.com/p/svgpan/), version 1.2.2, for use as a [Snap.svg](http://snapsvg.io/) plugin.

This usually use on present view only. Not for Storing, modifying the paper.

[DEMO](http://huei90.github.io/snap.svg.zpd)

### Install

    $ bower install snap.svg.zpd --save

    $ npm install snap.svg.zpd --save

### Usage


Include `snap.svg.zpd.js` after `snap.svg.js`

```html
<script src="snap.svg.js"></script>
<script src="snap.svg.zpd.js"></script>
```

Writing the script

```js
var paper = Snap();
var bigCircle = paper.circle(150, 150, 100);
paper.zpd();

// with options and callback
paper.zpd(options, function (err, paper) {
    console.log(paper);
});

// with callback
paper.zpd(function (err, paper) {
    console.log(paper);
});
```

### options

#### zoom

    true or false: enable or disable panning (default true)

#### pad

    true or false: enable or disable zooming (default true)

#### drag

    true or false: enable or disable dragging (default false)

#### zoomScale

    number: Zoom sensitivity (default 0.2)

### More

#### paper.zpd('destroy')

```js
paper.zpd('destroy');
```
    Destroy all the zpd elements, events and nodes

#### paper.zpd('save')

```js
paper.zpd('save');
// => return SVGMatrix {a:0.6787972450256348,b:0,c:0,d:0.6787972450256348,e:159.63783264160156,f:12.84811782836914}

paper.zpd('save', function (err, data) {
    console.log(data);
    // => return SVGMatrix {a:0.6787972450256348,b:0,c:0,d:0.6787972450256348,e:159.63783264160156,f:12.84811782836914}
});
```
    return current <g> transform attribute (matrix) - only in pan,zoom, not for drag now

#### paper.zpd({ load: SVGMatrix {}});

```js
paper.zpd({ load: {a:0.6787972450256348,b:0,c:0,d:0.6787972450256348,e:159.63783264160156,f:12.84811782836914}});
```
    set the initial <g> transform matrix

#### zoomTo

```js
paper.zoomTo(1.5, 3000, mina.bounce, function (err, paper) {
    console.log(paper);
});
```
    zoom (must > 0), interval (ms optional), mina (optional), callback (optional)
