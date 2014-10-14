# snap.svg.zpd
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/huei90/snap.svg.zpd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

A zoom/pan/drag plugin for Snap.svg

The plugin was originally based on Andrea Leofreddi's [SVGPan library](https://code.google.com/p/svgpan/), but has since been completely rewritten for use as a [Snap.svg](http://snapsvg.io/) plugin.

Currently it is only intended to be used to change the display of your svg-elements. We hope to include modifying elements and saving changes for later in the future.

[Please take a look at our demo with responsive svgs](http://huei90.github.io/snap.svg.zpd)

### BETA-VERSION
Please note, that this version of the plugin is not yet ready for production. The internal structure of the plugin was completely changed from previous versions. There might also be some api changes.

Configuration options and further methods will be added shortly.

### Usage

Include `snap.svg.zpd.js` after `snap.svg.js`

```html
<script src="snap.svg.js"></script>
<script src="snap.svg.zpd.js"></script>
```

Using the zpd-library to zoom/drag your svg

```js
var paper = Snap();
var bigCircle = paper.circle(150, 150, 100);
paper.initZpd();
```

### options

Remove all zpd adaptions
```js
paper.destroyZpd();

