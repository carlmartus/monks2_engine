'use strict';

/**
 * Rapidframe v1.2.0
 *
 * Copyright 2016 Martin Sandgren
 * https://github.com/carlmartus/rapidframe.js
 * http://martus.se/
 */


/**
 * @class
 * @classdesc Data packing of low level data types. Data supplied with push
 * functions will sequentially put data in buffer.
 * @param {int} initAlloc Initial buffer size allocation.
 */
function rfBuffer(initAlloc) {
	this.max = initAlloc;
	this.buf = new DataView(new ArrayBuffer(this.max));
	this.offset = 0;
};

/**
 * Change current writing position.
 * @param {int} pos Position to set writer to.
 */
rfBuffer.prototype.setPosition = function(pos) {
	this.offset = pos;
};

/**
 * Rewind writer to start of buffer.
 */
rfBuffer.prototype.rewind = function() {
	this.offset = 0;
};

/**
 * Check if the buffer is full.
 * @return {boolean} Has writer position exceeded limits?
 */
rfBuffer.prototype.isFull = function() {
	return this.offset >= this.max;
};

/**
 * Write Int 8
 * @param {number} n Number
 */
rfBuffer.prototype.pushInt8		= function(n) { this.buf.setInt8(this.offset, n, true);	this.offset += 1; };

/**
 * Write Uint 8
 * @param {number} n Number
 */
rfBuffer.prototype.pushUint8	= function(n) { this.buf.setUint8(this.offset, n, true);	this.offset += 1; };

/**
 * Write Int 16
 * @param {number} n Number
 */
rfBuffer.prototype.pushInt16	= function(n) { this.buf.setInt16(this.offset, n, true);	this.offset += 2; };

/**
 * Write Uint 16
 * @param {number} n Number
 */
rfBuffer.prototype.pushUint16	= function(n) { this.buf.setUint16(this.offset, n, true);	this.offset += 2; };

/**
 * Write Int 32
 * @param {number} n Number
 */
rfBuffer.prototype.pushInt32	= function(n) { this.buf.setInt32(this.offset, n, true);	this.offset += 4; };

/**
 * Write Uint 32
 * @param {number} n Number
 */
rfBuffer.prototype.pushUint32	= function(n) { this.buf.setUint32(this.offset, n, true);	this.offset += 4; };

/**
 * Write Float 32
 * @param {number} n Number
 */
rfBuffer.prototype.pushFloat32	= function(n) { this.buf.setFloat32(this.offset, n, true);this.offset += 4;};

/**
 * Write Float 64
 * @param {number} n Number
 */
rfBuffer.prototype.pushFloat64	= function(n) { this.buf.setFloat32(this.offset, n, true);this.offset += 8;};

/**
 * Get data view used to store information.
 * @return {DataView} Contains all written data.
 */

rfBuffer.prototype.getDataView = function() {
	return this.buf;
};

/**
 * Create a new OpenGL array buffer from data stored in buffer.
 * @param {GlContext} gl OpenGL context.
 * @param {GlUsage} usage gl.STATIC_DRAW or similar.
 * @return {GlBuffer} gl.ARRAY_BUFFER object.
 */
rfBuffer.prototype.createGlArrayBuffer = function(gl, usage) {
	var va = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, va);
	gl.bufferData(gl.ARRAY_BUFFER, this.buf, usage);
	return va;
};

/**
 * Update an existing array buffer with the content from the rfBuffer.
 * @param {GlContext} gl OpenGL context.
 * @param {rfGeometry} geo Destination geometry to update.
 * @param {int} bufferId Id of the buffer inside the geo instance.
 */
rfBuffer.prototype.updateGeometry = function(gl, geo, bufferId) {
	gl.bindBuffer(gl.ARRAY_BUFFER, geo.buffers[bufferId]);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0,
		this.buf.buffer.slice(0, this.offset));
};


/**
 * @class
 * @classdesc Content downloader for images, audio clips and images directly
 * converted to OpenGL textures. Async callback when all downloadeds are
 * completed. A simple OpenGL download progressbar can be rendered.
 */
function rfLoader() {
	this.list = [];
}

rfLoader.prototype.LOAD_IMAGE = 1;
rfLoader.prototype.LOAD_AUDIO_HTML = 2;
rfLoader.prototype.LOAD_AUDIO_BUFFER = 3;
rfLoader.prototype.LOAD_TEXTURE = 4;

rfLoader.prototype.GLLOD_BG = 16;
rfLoader.prototype.GLLOD_FG = 12;

/**
 * Queue Image to download.
 * @param {string} url Image URL
 * @return {Image}
 */
rfLoader.prototype.loadImage = function(url) {
	var obj = new Image();
	this.list.push([obj, url, this.LOAD_IMAGE]);
	return obj;
}

/**
 * Queue Image download. When the file is downloaded it will be converted to a
 * OpenGL texture.
 * @param {GlContext} gl
 * @param {string} url Image URL
 * @param filterMin Minification filter (eg. gl.NEAREST).
 * @param filterMag Magnification filter (eg. gl.LINEAR).
 * @return {GlTexture}
 */
rfLoader.prototype.loadTexture = function(gl, url, filterMag, filterMin) {
	var tex = gl.createTexture();
	this.list.push([tex, url, this.LOAD_TEXTURE]);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMag);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMag);
	/*
	if (generateMipMap) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}*/
	return tex;
}

/**
 * Queue audio clip download.
 * @param {string} url Image URL.
 * @return {Audio}
 */
rfLoader.prototype.loadAudio = function(url) {
	var obj = new Audio();
	this.list.push([obj, url, this.LOAD_AUDIO_HTML]);
	return obj;
}

/**
 * Queue audio buffer download.
 * @param {rfWebAudio} rfwa Context to use this sound in.
 * @param {string} url Sound file URL.
 * @return {SoundBuffer}
 */
rfLoader.prototype.loadAudioBuffer = function(rfwa, url) {
	var req = new XMLHttpRequest();

	var obj = {
		request: req,
		buffer: null,
		doneCallback: null,
	};

	this.list.push([obj, url, this.LOAD_AUDIO_BUFFER]);

	req.open('GET', url, true);
	req.responseType = 'arraybuffer';
	req.onload = function() {
		var audioData = req.response;

		rfwa.context.decodeAudioData(audioData, function(buffer) {
			obj.buffer = buffer;

			obj.doneCallback();
		});
	};

	return obj;
};

function renderGlLoadingScreen(gl, step, count) {
	var dims = gl.getParameter(gl.VIEWPORT);
	var x = dims[0];
	var y = dims[1];
	var w = dims[2];
	var h = dims[3];

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.enable(gl.SCISSOR_TEST);

	// Bar background
	gl.scissor(
			x + rfLoader.GLLOD_BG,
			y + h/2 - rfLoader.GLLOD_BG,
			w - 2*rfLoader.GLLOD_BG,
			rfLoader.GLLOD_BG*2);
	gl.clearColor(0.5, 0.5, 0.5, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Bar forground
	gl.scissor(
			x + (rfLoader.GLLOD_BG + (rfLoader.GLLOD_BG - rfLoader.GLLOD_FG)),
			y + h/2 - rfLoader.GLLOD_FG,
			(step / count) * (w - 2.0*(rfLoader.GLLOD_BG + (rfLoader.GLLOD_BG - rfLoader.GLLOD_FG))),
			rfLoader.GLLOD_FG*2);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.disable(gl.SCISSOR_TEST);

	gl.viewport(x, y, w, h);
};

/**
 * Callback executed each time one of the download are completed.
 * @callback downloadsStep
 * @param {number} step Amount of files downloaded
 * @param {number} count Total amount of both finnished and und
 */

/**
 * Callback executed when all downloads are completed.
 * @callback downloadsCompleted
 */

/**
 * Display OpenGL download progress bar.
 * @param {GlContext} gl OpenGL target
 * @param {downloadsCompleted} Callback When downloads are completed
 */
rfLoader.prototype.downloadWithGlScreen = function(gl, callback) {
	renderGlLoadingScreen(gl, 0, 1);
	return this.download(callback, function(step, count) {
		renderGlLoadingScreen(gl, step, count);
	}, gl);
};

function createTextureDownload(callback, obj, img) {
	return function(a, b) {
		gl.bindTexture(gl.TEXTURE_2D, obj);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		callback(a, b);
	};
};


/**
 * Async callback for downloads.
 * @param {downloadsCompleted} callback When downloads are completed
 * @param {downloadsStep} [step] When one of the downloads are completed
 * @param {GlContext} [gl]
 */
rfLoader.prototype.download = function(callback, step, gl) {
	var length = this.list.length;
	var left = length;

	for (var i=0; i<this.list.length; i++) {
		var entry = this.list[i];
		var obj = entry[0];
		var listUrl = entry[1];
		var type = entry[2];

		var func = (function(obj, url) {
			return function() {
				left--;
				if (step) {
					step(length-left, length);
				}

				if (left == 0) {
					callback();
				}
			}
		})(obj, listUrl);

		switch (type) {
			default :
			case this.LOAD_IMAGE :
				obj.onload = func;
				obj.src = listUrl;
				break;

			case this.LOAD_AUDIO_HTML :
				obj.addEventListener('canplaythrough', func, false);
				obj.src = listUrl;
				break;

			case this.LOAD_AUDIO_BUFFER :
				obj.doneCallback = func;
				obj.request.send();
				break;

			case this.LOAD_TEXTURE :
				var img = new Image();
				img.onload = createTextureDownload(func, obj, img);
				img.src = listUrl;
				break;
		}
	}
};


/**
 * @class
 * @classdesc Array buffer abstraction for easier initialization and rendering.
 * @param {rfGame} rf Rapidframe instance.
 */
function rfGeometry(rf) {
	this.rf = rf;
	this.gl = rf.gl;
	this.buffers = [];
	this.vertexAttribs = [];
};

/**
 * Add a GlBuffer to list of buffers.
 * @return {int} ID of buffer added
 */
rfGeometry.prototype.addBuffer = function(buffer) {
	this.buffers.push(buffer);
	return this.buffers.length-1;
};

/**
 * Create new array buffer.
 * there.
 * @param {GlUsage} usage gl.STATIC_DRAW or similar
 * @param {int|ArrayBuffer} arr Content. If integer is given, there will be a
 * mere allocation of data and updateBuffer will have to be used to fill the
 * buffer.
 * @return {int} ID of buffer created
 */
rfGeometry.prototype.createBuffer = function(usage, arr) {
	var gl = this.gl;

	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);

	if (typeof(arr) == 'number') {
		gl.bufferData(gl.ARRAY_BUFFER, new ArrayBuffer(arr), usage);
	} else {
		gl.bufferData(gl.ARRAY_BUFFER, arr, usage);
	}

	return this.addBuffer(buf);
};

/**
 * Replace buffer to be used at given ID.
 * @param {int} bufferId ID of buffer to be replaced.
 * @param {GlBuffer} newBuffer New buffer.
 * @return {GlBuffer} Old buffer.
 */
rfGeometry.prototype.setBuffer = function(bufferId, newBuffer) {
	var oldBuf = this.buffers[bufferId];
	this.buffers[bufferId] = newBuffer;
	return oldBuf;
};

/**
 * Update data in buffer.
 * @param {int} bufferId ID of buffer to update.
 * @param {int} offset Data will be put att this offset of the target buffer.
 * @param {ArrayBuffer} arr Data to be put in target buffer.
 */
rfGeometry.prototype.updateBuffer = function(bufferId, offset, arr) {
	var gl = this.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[bufferId]);
	gl.bufferSubData(gl.ARRAY_BUFFER, offset, arr);
};

/**
 * Add vertex attribute description.
 * @param {int} bufferId Buffer to be used.
 * @param {int} elemCount Amount of elements (ex. 2 or 3).
 * @param {GlDatatype} dataType Type for attribute (ex. gl.FLOAT).
 * @param {boolean} normalize Shall OpenGL normalize non-float data within 0-1?
 * @param {int} stride Iteration step, can be 0 if buffer only has 1 vertex
 * attribute.
 * @param {int} offset Offset within stride in bytes.
 */
rfGeometry.prototype.addVertexAttrib = function(bufferId, elemCount, dataType,
		normalize, stride, offset) {
	var va = {
		bufferId: bufferId,
		elemCount: elemCount,
		dataType: dataType,
		normalize: normalize,
		stride: stride,
		offset: offset,
	};
	this.vertexAttribs.push(va);
};

/**
 * Execute OpenGL rendering.
 * @param {GlPrimitive} primitiveType What to render (eq. gl.TRIANGLES)?
 * @param {int} vertOffset Start rendering at offset.
 * @param {int} vertCount Render this many vertices.
 */
rfGeometry.prototype.render = function(primitiveType, vertOffset, vertCount) {
	var gl = this.gl;
	var lastBufId = -1;

	this.rf.glArrayCount(this.vertexAttribs.length);

	for (var i=0; i<this.vertexAttribs.length; i++) {
		var va = this.vertexAttribs[i];

		if (va.bufferId != lastBufId) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[va.bufferId]);
			lastBufId = va.bufferId;
		}

		gl.vertexAttribPointer(i, va.elemCount, va.dataType, va.normalize,
				va.stride, va.offset);
	}

	gl.drawArrays(primitiveType, vertOffset, vertCount);
};


//=============================================================================
// Offscreen canvas
//=============================================================================

/**
 * Helper function to create a HTML5 canvas.
 * @param {int} width Canvas width.
 * @param {int} height Canvas height.
 * @return {HTML2dCanvas} Standard HTML5 2D canvas.
 */
function rfCanvas_makeOffscreen(width, height) {
	var can = document.createElement('canvas');
	can.width = width;
	can.height = height;
	return can.getContext('2d');
};

/**
 * Create a new WebGL texture from a HTML5 2D canvas.
 * @param {GlContext} gl
 * @param {HTML5Canvas}
 * @param filterMin Minification filter (eg. gl.NEAREST).
 * @param filterMag Magnification filter (eg. gl.LINEAR).
 * @param {boolean} mipmap Generate mipmaps?
 */
function rfCanvas_canvas2GlTexture(gl, can, filterMag, filterMin, mipmap) {
	var tex = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, can.canvas);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMag);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMag);

	if (mipmap) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	return tex;
};

/**
 * Set WebGL default vertical flip of textures.
 * @param {GlContext}
 * @param {boolean} on
 */
function rfGl_textureFlipY(gl, on) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, on);
};


/**
 * @param {string} tagId HTML id of the canvas to be used
 * @class
 * @classdesc Rapidframe game loop instance bound to a HTML5 canvas.
 */
function rfGame(tagId) {
	var self = this;

	this.tagId = tagId;
	this.tag = document.getElementById(this.tagId);
	this.clientW = this.tag.clientWidth;
	this.clientH = this.tag.clientHeight;
	this.gl = null;
	this.gl_arrayCount = 0;
	this.mouseAutoCapture = false;

	this.cbResize = null;
	this.cbMouseMove = null;
	this.cbMouseClick = null;

	this.blockRender = false;
	this.enabledFullscreen = false;
	this.enabledFullframe = false,
	this.enabledKeyboard = false;
	this.enabledMouse = false;
	this.enabledLogKeys = false;

	this.keyBinds = {};

	window.addEventListener('blur', function() {
		self.blockRender = true;
	});
	window.addEventListener('focus', function() {
		self.blockRender = false;
	});

	// Resize event
	this.tag.addEventListener('resize', function() {
		self._resize();
	}, false);

	// Fullscreen events
	if (this.tag.requestFullscreen) {
		document.addEventListener('fullscreenchange', function() {
			self._eventFullScreen(document.fullScreenEnabled);
		}, false);
	} else if (this.tag.mozRequestFullScreen) {
		document.addEventListener('mozfullscreenchange', function() {
			self._eventFullScreen(document.mozFullScreenElement != null);
		}, false);
	} else if (this.tag.webkitRequestFullscreen) {
		document.addEventListener('webkitfullscreenchange', function() {
			self._eventFullScreen(document.webkitFullscreenElement != null);
		}, false);
	}
}

/**
 * Creat a WebGL instance. The options that can be passed are for example:
 * { antialias: false }, to disable antialiasing.
 * @param webGlOptions Standard WebGL options.
 * @return {GlContext} WebGL Context.
 */
rfGame.prototype.setupWebGl = function(webGlOptions) {
	this.gl = null;
	try {
		this.gl = this.tag.getContext('webgl', webGlOptions);
	} catch (e) {}

	if (this.gl == null) {
		try {
			this.gl = this.tag.getContext('experimental-webgl', webGlOptions);
		} catch (e) {
			alert('Could not initialize WebGL');
		}
	}

	return this.gl;
};

/**
 * Create a canvas 2D instance.
 * @return {Canvas2dContext}
 */
rfGame.prototype.setup2d = function() {
	return this.tag.getContext('2d');
};

/**
 * Frame callback for gameloop.
 * @callback frame
 * @param {float} ft Seconds passed since last loop.
 * @param {boolean} hidden Is the frame hidden from rendering right now?
 * @return {boolean} True if the loop should abort.
 */

/**
 * Render callback for gameloop.
 * @callback render
 */

/**
 * Create a async game loop.
 * @param {frame} frame Callback for each frame in game loop.
 * @param {render} [render] Callback for each render in game loop. Will not be called if
 * area is not being dislayed.
 */
rfGame.prototype.startLoop = function(frame, render) {
	var lastTime = Date.now();

	var requestAnimFrame;
	if (window && window.requestAnimationFrame) {
		requestAnimationFrame = window.requestAnimationFrame;
	} else {
		requestAnimationFrame = function(callback) {
			window.setTimeout(callback, 1000.0 / 60.0);
		};
	}

	var self = this;
	function clo() {
		var now = Date.now();
		if (frame((now - lastTime) * 0.001, !self.blockRender)) {
			if (!self.blockRender && render) render();
			requestAnimationFrame(clo);
		}
		lastTime = now;
	}

	requestAnimationFrame(clo);
};

/**
 * Request the browser to lock and hide the mouse. Useful for FPS-games.
 */
rfGame.prototype.captureMouse = function() {
	var el = this.tag;

	if (el.requestPointerLock) {
		el.requestPointerLock();
	} else if (el.mozRequestPointerLock) {
		el.mozRequestPointerLock();
	} else if (el.webkitRequestPointerLock) {
		el.webkitRequestPointerLock();
	}
};

/**
 * Mouse movement event callback.
 * @callback mouseMove
 * @param {int} x Absolute X position
 * @param {int} y Absolute Y position
 * @param {int} dx Relative X position
 * @param {int} dy Relative Y position
 */

/**
 * Mouse button event callback.
 * @callback mouseButton
 * @param {boolean} press Button down
 * @param {int} pres buttons press bitmask
 */

/**
 * Set callback to listen for mouse events
 * @param {mouseMove} cbMove Movement callback
 * @param {mouseButton} cbClick Button callback
 */
rfGame.prototype.setMouseCallback = function(cbMove, cbClick) {
	this.cbMouseMove = cbMove;
	this.cbMouseClick = cbClick;

	if (!this.enabledMouse) {
		this._listenMouse();
	}
};

/**
 * Is game frame fullscreen?
 * @return {boolean} on Fullscreen?
 */
rfGame.prototype.isFullscreen = function(on) {
	return this.enabledFullscreen;
};

/**
 * Set frame fullscreen mode.
 * @param {boolean} on Set on
 */
rfGame.prototype.setFullscreen = function(on) {
	if (on && !this.enabledFullscreen) {
		_goFullscreen(this.tag);
	} else if (this.enabledFullscreen) {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}
};

/**
 * Enable frame full browser frame covering. Similar to fullscreen except the
 * frame only covers the browser window.
 */
rfGame.prototype.enableFullFrame = function() {
	this.enabledFullframe = true,
	this.tag.style = 'padding: 0px; margin: 0px; position: absolute; left: 0px; top: 0px;';
	this._resize();
};

/**
 * Keyboard event callback.
 * @callback keyEvent
 * @param {int} key Key number id
 * @param {boolean} pres True if press, false if release
 * @param event DOM event
 */

rfGame.prototype.enableKeyboard = function() {
	var self = this;

	if (!this.enabledKeyboard) {
		document.addEventListener('keydown', function(event) {
			self._keyEvent(event, true);
		});
		document.addEventListener('keyup', function(event) {
			self._keyEvent(event, false);
		});
		this.enabledKeyboard = true;
	}
}

/**
 * Bind callback to keyboard event. Activate setLogKeys to print key codes to
 * console.
 * @param {int} key Key id number (http://keycode.info/)
 * @param {keyEvent} cb Event callback
 */
rfGame.prototype.bindKey = function(key, cb) {
	this.enableKeyboard();
	this.keyBinds[key] = cb;
};

/**
 * Enable key event logging.
 * @param {boolean} on Enable
 */
rfGame.prototype.setLogKeys = function(on) {
	this.enableKeyboard();
	this.enabledLogKeys = on;
};

/**
 * Resize callback.
 * @callback resizeEvent
 * @param {int} width Frame width
 * @param {int} Height Frame height
 */

/**
 * Set resize event callback.
 * @param {resizeEvent} event Callback
 */
rfGame.prototype.setResizeCallback = function(cb) {
	this.cbResize = cb;
};

// GL Misc help
// ============

/**
 * Helper function to set OpenGL active array count. Calling
 * gl.enableVertexAttribArray on all array indexes from 0 to first parameter
 * (count).
 * @param {int} count Amount of active OpenGL arrays
 */
rfGame.prototype.glArrayCount = function(count) {
	while (this.gl_arrayCount > count) {
		this.gl.disableVertexAttribArray(--this.gl_arrayCount);
	}

	while (count > this.gl_arrayCount) {
		this.gl.enableVertexAttribArray(this.gl_arrayCount++);
	}
};

// Internal
// ========

rfGame.prototype._resize = function() {
	if (this.enabledFullframe) {
		var w = window.innerWidth;
		var h = window.innerHeight;

		this.tag.width = w;
		this.tag.height = h;
	}

	if (this.cbResize) {
		this.cbResize(this.tag.width, this.tag.height);
	}
};

rfGame.prototype._keyEvent = function(event, press) {
	if (event.repeat) return;

	if (press && this.enabledLogKeys) {
		console.log(event, 'Press:', press);
	}

	var bind = this.keyBinds[event.keyCode];
	if (bind) bind(event.keyCode, press, event);
};

rfGame.prototype._eventFullScreen = function(set) {
	this.enabledFullscreen = set;

	if (set) {
		this.tag.width = screen.width;
		this.tag.height = screen.height;
		this._resize();
	} else {
		this.tag.width = this.clientW;
		this.tag.height = this.clientH;
		this._resize();
	}
};

rfGame.prototype._eventMouseLockChange = function(event) {
	var can = this.tag;
	if (
			document.pointerLockElement === can ||
			document.mozPointerLockElement === can ||
			document.webkitPointerLockElement === can) {
		this.mouseAutoCapture = true;
	} else {
		this.mouseAutoCapture = false;
	}
};

rfGame.prototype._listenMouse = function() {
	var self = this;

	document.addEventListener('pointerlockchange', this._eventMouseLockChange, false);
	document.addEventListener('mozpointerlockchange', this._eventMouseLockChange, false);
	document.addEventListener('webkitpointerlockchange', this._eventMouseLockChange, false);

	this.tag.addEventListener('mousemove', function(event) {
		var x = event.clientX - self.tag.offsetLeft;
		var y = event.clientY - self.tag.offsetTop;

		var dx =
			event.movementX ||
			event.mozMovementX ||
			event.webkitMovementX ||
			0;
		var dy =
			event.movementY ||
			event.mozMovementY ||
			event.webkitMovementY ||
			0;

		if (self.cbMouseMove)	self.cbMouseMove(x, y, dx, dy);
	}, false);

	this.tag.addEventListener('mousedown', function(event) {
		if (self.cbMouseClick)	self.cbMouseClick(true, event.buttons);
	}, false);

	this.tag.addEventListener('mouseup', function(event) {
		if (self.cbMouseClick)	self.cbMouseClick(false, event.buttons);
	}, false);
}

function _goFullscreen(el) {
	if (el.requestFullscreen) {
		el.requestFullscreen();
	} else if (el.mozRequestFullScreen) {
		el.mozRequestFullScreen();
	} else if (el.webkitRequestFullscreen) {
		el.webkitRequestFullscreen();
	} else if (el.msRequestFullscreen) {
		el.msRequestFullscreen();
	}
}


// Vector 2 component
// ===================

/**
 * @class rfVec2
 * @classdesc Fast 2D vector class
 * @deprecated Use rfVec2_create
 */

/**
 * Create vector
 * @memberof rfVec2
 */
function rfVec2_create() {
	return new Float32Array([0.0, 0.0]);
}

/**
 * Create 2D vector from numbers.
 * @memberof rfVec2
 * @param {float} x X component
 * @param {float} y Y component
 * @return {rfVec2}
 */
function rfVec2_parse(x, y) {
	return new Float32Array([x, y]);
}

/**
 * Set each component.
 * @memberof rfVec2
 */
function rfVec2_set(out, x, y) {
	out[0] = x;
	out[1] = y;
}

/**
 * 2D component wise addition.
 * @memberof rfVec2
 * @param {rfVec2} out Result destination
 * @param {rfVec2} v0 Vector 1
 * @param {rfVec2} v1 Vector 2
 */
function rfVec2_add(out, v0, v1) {
	out[0] = v0[0] + v1[0];
	out[1] = v0[1] + v1[1];
}

/**
 * 2D component wise subtraction.
 * @memberof rfVec2
 * @param {rfVec2} out Result destination
 * @param {rfVec2} v0 Vector 1
 * @param {rfVec2} v1 Vector 2
 */
function rfVec2_sub(out, v0, v1) {
	out[0] = v0[0] - v1[0];
	out[1] = v0[1] - v1[1];
}

/**
 * 2D vector multiplication with constant.
 * @memberof rfVec2
 * @param {rfVec2} out Result destination
 * @param {rfVec2} v Vector
 * @param {float} k Konstant
 */
function rfVec2_mulk(out, v, k) {
	out[0] = k*v[0];
	out[1] = k*v[1];
}

/**
 * Length of a vector (Pythagorean theorem).
 * @memberof rfVec2
 * @param {rfVec2} v Vector
 * @return {float} Length
 */
function rfVec2_length(v) {
	return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
}

/**
 * 2D vector dot/scalar product
 * @memberof rfVec2
 * @param {rfVec2} v0 Vector 1
 * @param {rfVec2} v1 Vector 2
 * @return {float} Scalar product
 */
function rfVec2_dot(v0, v1) {
	return v0[0]*v1[0] + v0[1]*v1[1];
}

/**
 * Has vector coordinates at origo.
 * @memberof rfVec2
 * @param {rfVec2} v Vector
 * @return {boolean}
 */
function rfVec2_isZero(v) {
	return v[0]==0.0 && v[1]==0.0;
}

/**
 * Normalized vector. Source and destination can be the same.
 * @memberof rfVec2
 * @param {rfVec2} out Result destination
 * @param {rfVec2} v Vector
 * @param {float} [len] Length of normalized vector
 */
function rfVec2_normalize(out, v, len) {
	var inv = 1.0 / rfVec2_length(v);
	if (len) inv *= len;
	out[0] = inv*v[0];
	out[1] = inv*v[1];
}

/**
 * Set each component.
 * @memberof rfVec3
 */
function rfVec3_set(out, x, y, z) {
	out[0] = x;
	out[1] = y;
	out[2] = z;
}

// Vector 3 components
// ===================

/**
 * @class rfVec3
 * @classdesc Fast 3D vector class
 * @deprecated Use rfVec3_create
 */

/**
 * Create vector
 * @memberof rfVec3
 */
function rfVec3_create() {
	return new Float32Array([0.0, 0.0, 0.0]);
}

/**
 * Create 3D vector from numbers.
 * @memberof rfVec3
 * @param {float} x X component
 * @param {float} y Y component
 * @param {float} z Z component
 * @return {rfVec3}
 */
function rfVec3_parse(x, y, z) {
	return new Float32Array([x, y, z]);
}

/**
 * 3D component wise addition.
 * @memberof rfVec3
 * @param {rfVec3} out Result destination
 * @param {rfVec3} v0 Vector 1
 * @param {rfVec3} v1 Vector 2
 */
function rfVec3_add(out, v0, v1) {
	out[0] = v0[0] + v1[0];
	out[1] = v0[1] + v1[1];
	out[2] = v0[2] + v1[2];
}

/**
 * 3D component wise subtraction.
 * @memberof rfVec3
 * @param {rfVec3} out Result destination
 * @param {rfVec3} v0 Vector 1
 * @param {rfVec3} v1 Vector 2
 */
function rfVec3_sub(out, v0, v1) {
	out[0] = v0[0] - v1[0];
	out[1] = v0[1] - v1[1];
	out[2] = v0[2] - v1[2];
}

/**
 * 3D vector multiplication with constant.
 * @memberof rfVec3
 * @param {rfVec3} out Result destination
 * @param {rfVec3} v Vector
 * @param {float} k Konstant
 */
function rfVec3_mulk(out, v, k) {
	out[0] = k*v[0];
	out[1] = k*v[1];
	out[2] = k*v[2];
}

/**
 * Length of a vector (Pythagorean theorem).
 * @memberof rfVec3
 * @param {rfVec3} v Vector
 * @return {float} Length
 */
function rfVec3_length(v) {
	return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

/**
 * 3D vector dot/scalar product
 * @memberof rfVec3
 * @param {rfVec3} v0 Vector 1
 * @param {rfVec3} v1 Vector 2
 * @return {float} Scalar product
 */
function rfVec3_dot(v0, v1) {
	return v0[0]*v1[0] + v0[1]*v1[1] + v0[2]*v1[2];
}

/**
 * Has vector coordinates at origo.
 * @memberof rfVec3
 * @param {rfVec3} v Vector
 * @return {boolean}
 */
function rfVec3_isZero(v) {
	return v[0]==0.0 && v[1]==0.0 && v[2]==0.0;
}

/**
 * Create cross product vector.
 * @memberof rfVec3
 * @param {rfVec3} out Result destination
 * @param {rfVec3} v0 Vector 1
 * @param {rfVec3} v1 Vector 2
 */
function rfVec3_cross(out, v0, v1) {
	out[0] = v0[1]*v1[2] - v0[2]*v1[1];
	out[1] = v0[2]*v1[0] - v0[0]*v1[2];
	out[2] = v0[0]*v1[1] - v0[1]*v1[0];
}

/**
 * Create normalized vector.
 * @memberof rfVec3
 * @param {rfVec3} out Result destination
 * @param {rfVec3} v Vector
 * @param {float} len Length of normalized vector
 */
function rfVec3_normalize(out, v, len) {
	var inv = 1.0 / rfVec3_length(v);
	if (len) inv *= len;
	out[0] = inv*v[0];
	out[1] = inv*v[1];
	out[2] = inv*v[2];
}


// Martix 4x4 component
// ===================

/**
 * @class rfMat4
 * @classdesc Fast 4x4 matrix class.
 * @deprecated Use rfMat4_create
 */

/**
 * Create new 4x4 matrix.
 * @memberof rfMat4
 * @return {rfMat4}
 */
function rfMat4_create() {
	return new Float32Array([
			0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0]);
}

/**
 * Set matrix as identidy matrix.
 * @memberof rfMat4
 * @param {rfMat4} out Matrix destination
 */
function rfMat4_identity(out) {
	out[ 0] = 1.0;
	out[ 1] = out[ 2] = out[ 3] = 0.0;

	out[ 5] = 1.0;
	out[ 4] = out[ 6] = out[ 7] = 0.0;

	out[10] = 1.0;
	out[ 8] = out[ 9] = out[11] = 0.0;

	out[15] = 1.0;
	out[12] = out[13] = out[14] = 0.0;
}

/**
 * Multiplication between two matrices.
 * @memberof rfMat4
 * @param {rfMat4} out Matrix destination
 * @param {rfMat4} m0 Matrix 1
 * @param {rfMat4} m0 Matrix 2
 */
function rfMat4_mul(out, m0, m1) {
	out[ 0] = m1[ 0]*m0[ 0] + m1[ 1]*m0[ 4] + m1[ 2]*m0[ 8] + m1[ 3]*m0[12];
	out[ 1] = m1[ 0]*m0[ 1] + m1[ 1]*m0[ 5] + m1[ 2]*m0[ 9] + m1[ 3]*m0[13];
	out[ 2] = m1[ 0]*m0[ 2] + m1[ 1]*m0[ 6] + m1[ 2]*m0[10] + m1[ 3]*m0[14];
	out[ 3] = m1[ 0]*m0[ 3] + m1[ 1]*m0[ 7] + m1[ 2]*m0[11] + m1[ 3]*m0[15];

	out[ 4] = m1[ 4]*m0[ 0] + m1[ 5]*m0[ 4] + m1[ 6]*m0[ 8] + m1[ 7]*m0[12];
	out[ 5] = m1[ 4]*m0[ 1] + m1[ 5]*m0[ 5] + m1[ 6]*m0[ 9] + m1[ 7]*m0[13];
	out[ 6] = m1[ 4]*m0[ 2] + m1[ 5]*m0[ 6] + m1[ 6]*m0[10] + m1[ 7]*m0[14];
	out[ 7] = m1[ 4]*m0[ 3] + m1[ 5]*m0[ 7] + m1[ 6]*m0[11] + m1[ 7]*m0[15];

	out[ 8] = m1[ 8]*m0[ 0] + m1[ 9]*m0[ 4] + m1[10]*m0[ 8] + m1[11]*m0[12];
	out[ 9] = m1[ 8]*m0[ 1] + m1[ 9]*m0[ 5] + m1[10]*m0[ 9] + m1[11]*m0[13];
	out[10] = m1[ 8]*m0[ 2] + m1[ 9]*m0[ 6] + m1[10]*m0[10] + m1[11]*m0[14];
	out[11] = m1[ 8]*m0[ 3] + m1[ 9]*m0[ 7] + m1[10]*m0[11] + m1[11]*m0[15];

	out[12] = m1[12]*m0[ 0] + m1[13]*m0[ 4] + m1[14]*m0[ 8] + m1[15]*m0[12];
	out[13] = m1[12]*m0[ 1] + m1[13]*m0[ 5] + m1[14]*m0[ 9] + m1[15]*m0[13];
	out[14] = m1[12]*m0[ 2] + m1[13]*m0[ 6] + m1[14]*m0[10] + m1[15]*m0[14];
	out[15] = m1[12]*m0[ 3] + m1[13]*m0[ 7] + m1[14]*m0[11] + m1[15]*m0[15];
}

/**
 * Multiplication between matrix and 3D vector.
 * @memberof rfMat4
 * @param {rfVec3} out Vector destination
 * @param {rfMat4} m
 * @param {rfVec3} v
 */
function rfMat4_mulVec3(out, m, v) {
	out[0] = m[ 0]*v[0] +  m[ 1]*v[1] +  m[ 2]*v[2] +  m[ 3];
	out[1] = m[ 4]*v[0] +  m[ 5]*v[1] +  m[ 6]*v[2] +  m[ 7];
	out[2] = m[ 8]*v[0] +  m[ 9]*v[1] +  m[10]*v[2] +  m[11];
}

/**
 * Create orthogonal view projection in matrix.
 * @memberof rfMat4
 * @param {rfMat4} out Matrix destination
 * @param {float} x0 Start X
 * @param {float} y0 Start Y
 * @param {float} x1 Stop X
 * @param {float} y1 Stop Y
 */
function rfMat4_ortho(out, x0, y0, x1, y1) {
	out[ 1] = out[2] = out[3] = out[4] = out[6] = out[7] = out[8] = out[9] = 0.0;
	out[ 0] = 2.0 / (x1-x0);
	out[ 5] = 2.0 / (y1-y0);
	out[10] = 1.0;
	out[15] = 1.0;
	out[12] = -(x1+x0)/(x1-x0);
	out[13] = -(y1+y0)/(y1-y0);
	out[14] = 0.0;
}

/**
 * Create projection matrix looking at point.
 * @memberof rfMat4
 * @param {rfMat4} out Matrix destination
 * @param {rfVec3} eye Eye position
 * @param {rfVec3} at Look at position
 * @param {rfVec3} up Projection upward vector
 */
function rfMat4_lookAt(out, eye, at, up) {
	var forw_ = rfVec3_create();
	rfVec3_sub(forw_, at, eye);
	var forw = rfVec3_create();
	rfVec3_normalize(forw, forw_);

	var side_ = rfVec3_create();
	rfVec3_cross(side_, up, forw);
	var side = rfVec3_create();
	rfVec3_normalize(side, side_);

	var upn = rfVec3_create();
	rfVec3_cross(upn, forw, side);

	var m0 = rfMat4_create();
	rfMat4_identity(m0);
	m0[ 0] = side[0];
	m0[ 4] = side[1];
	m0[ 8] = side[2];
	m0[ 1] = upn[0];
	m0[ 5] = upn[1];
	m0[ 9] = upn[2];
	m0[ 2] = -forw[0];
	m0[ 6] = -forw[1];
	m0[10] = -forw[2];

	var m1 = rfMat4_create();
	rfMat4_identity(m1);
	m1[12] = -eye[0];
	m1[13] = -eye[1];
	m1[14] = -eye[2];

	rfMat4_mul(out, m0, m1);
}

/**
 * Create matrix perspective projection.
 * @memberof rfMat4
 * @param {rfMat4} out Matrix destination
 * @param {float} fov Field of view in radiances
 * @param {float} ratio Screen ratio (width divided by height)
 * @param {float} near Near clipping distance
 * @param {float} far Far clipping distance
 */
function rfMat4_perspective(out, fov, ratio, near, far) {
	var size = near * Math.tan(fov * 0.5);
	var left = -size;
	var right = size;
	var bottom = -size / ratio;
	var top = size / ratio;

	out[ 0] = 2.0 * near / (right - left);
	out[ 1] = 0.0;
	out[ 2] = 0.0;
	out[ 3] = 0.0;
	out[ 4] = 0.0;
	out[ 5] = 2.0 * near / (top - bottom);
	out[ 6] = 0.0;
	out[ 7] = 0.0;
	out[ 8] = (right + left) / (right - left);
	out[ 9] = (top + bottom) / (top - bottom);
	out[10] = -(far + near) / (far - near);
	out[11] = -1.0;
	out[12] = 0.0;
	out[13] = 0.0;
	out[14] = -(2.0 * far * near) / (far - near);
	out[15] = 0.0;
}

/**
 * Full 3D camera projection. Combination of rfMat4_lookAt, rfMat4_perspective.
 * @memberof rfMat4
 * @param {rfMat4} out Matrix destination
 * @param {float} fov Field of view in radiances
 * @param {float} ratio Screen ratio (width divided by height)
 * @param {float} near Near clipping distance
 * @param {float} far Far clipping distance
 * @param {rfVec3} eye Eye position
 * @param {rfVec3} at Look at position
 * @param {rfVec3} up Projection upward vector
 */
function rfMat4_camera(out, fov, ratio, near, far, eye, at, up) {
	var persp = rfMat4_create();
	rfMat4_perspective(persp, fov, ratio, near, far);

	var look = rfMat4_create();
	rfMat4_lookAt(look, eye, at, up);

	rfMat4_mul(out, persp, look);
}


/**
 * @class
 * @classdesc OpenGL shader program wrapper for easy development.
 * @param {GlContext} WebGL context.
 */
function rfProgram(gl) {
	this.gl = gl;
	this.program = gl.createProgram();
	this.uniformLinks = []
}


//=============================================================================
// Shader type
//=============================================================================

/** @typedef rfProgramType */

/**
 * @constant {rfProgramType} VERT Vertex shader.
 * @memberof rfProgram
 */
rfProgram.prototype.VERT = 1;

/**
 * @constant {rfProgramType} FRAG Fragment shader.
 * @memberof rfProgram
 */
rfProgram.prototype.FRAG = 2;


//=============================================================================
// Shader precision
//=============================================================================

/** @typedef rfProgramPrecision */

/**
 * @constant {rfProgramPrecision} LOWP Shader low precision header.
 * @memberof rfProgram
 */
rfProgram.prototype.LOWP	= "#version 100\nprecision lowp float;\n";

/**
 * @constant {rfProgramPrecision} MEDIUMP Shader medium precision header.
 * @memberof rfProgram
 */
rfProgram.prototype.MEDIUMP	= "#version 100\nprecision mediump float;\n";

/**
 * @constant {rfProgramPrecision} HIGHP Shader high precision header.
 * @memberof rfProgram
 */
rfProgram.prototype.HIGHP	= "#version 100\nprecision highp float;\n";


//=============================================================================
// Program member functions
//=============================================================================

/**
 * Compile and add shader to program with source from HTML element. Don't
 * include #version string and precision in source. That will be attained from
 * the header parameter.
 * @param {string} idName Element identifier.
 * @param {rfProgramType} type Shader type.
 * @param {rfProgramPrecision} header Shader precision and header.
 */
rfProgram.prototype.addShaderId = function(idName, type, header) {
	this.addShaderText(document.getElementById(idName).text, type, header);
};

/**
 * Compile and add shader to program with source from string. Don't include
 * #version string and precision in source. That will be attained from the
 * header parameter.
 * @param {string} text GLSL source.
 * @param {rfProgramType} type Shader type.
 * @param {rfProgramPrecision} header Shader precision and header.
 */
rfProgram.prototype.addShaderText = function(text, type, header) {
	if (header) text = header + text;

	var shader = this.gl.createShader(type == this.FRAG ?
			this.gl.FRAGMENT_SHADER:this.gl.VERTEX_SHADER);
	this.gl.shaderSource(shader, text);
	this.gl.compileShader(shader);

	if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
		alert(this.gl.getShaderInfoLog(shader));
	}

	this.gl.attachShader(this.program, shader);
};

rfProgram.prototype.addShaderTextDual = function(txtVert, txtFrag, header) {
	this.addShaderText(txtVert, this.VERT, header);
	this.addShaderText(txtFrag, this.FRAG, header);
};

/**
 * Bind a attribute to an OpenGL attribute location. This operation should be
 * executed before linking the program.
 * @param {int} id Location.
 * @param {string} name Name of attribute in GLSL source.
 */
rfProgram.prototype.bindAttribute = function(id, name) {
	this.gl.bindAttribLocation(this.program, id, name);
};

/**
 * Bind a list of attributes in sequential order starting with the first item of
 * the array as attribute #0.
 * @param {string[]} arr Array of attribute names
 */
rfProgram.prototype.enumerateAttributes = function(arr) {
	for (var i=0; i<arr.length; i++) {
		this.bindAttribute(i, arr[i]);
	}
};

/** Link OpenGL shader program. */
rfProgram.prototype.link = function() {
	this.gl.linkProgram(this.program);

	if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
		alert(this.gl.getProgramInfoLog(this.program));
	}
};

/**
 * Get uniform location.
 * @param {string} name Name of uniform in GLSL source.
 * @return {GlUniformLocation} Location that can be used with uniform operations
 * in OpenGL.
 */
rfProgram.prototype.getUniform = function(name) {
	return this.gl.getUniformLocation(this.program, name);
};

/** Activate shader program. */
rfProgram.prototype.use = function() {
	this.gl.useProgram(this.program);
	for (var i=0; i<this.uniformLinks.length; i++) {
		var link = this.uniformLinks[i];
		if (link[0] != link[1].magic) {
			link[1].cb(this.gl, link[2]);
			link[0] = link[1].magic;
		}
	}
};

/**
 * Linked a uniform value that can be shared between many different shader
 * programs.
 * @param {rfUniformLink} uniform Linked uniform.
 */
rfProgram.prototype.addUniformLink = function(uniform) {
	var loc = this.getUniform(uniform.name);

	this.uniformLinks.push([0, uniform, loc]);
};

/**
 * Automatically set uniform constants for given sampler names. They will be
 * given a number starting from 0 representing TEXTURE0.
 * @param {string[]} arr List of texture sampler uniforms.
 */
rfProgram.prototype.enumerateTextureUniforms = function(arr) {
	this.use();
	for (var i=0; i<arr.length; i++) {
		this.gl.uniform1i(this.getUniform(arr[i]), i);
	}
};

/**
 * Return a (dictionary) object containing all OpenGL uniforms from the
 * specified list.
 * @param {string[]} array List on uniform names to retrieve.
 * @return Javascript dictionary with uniform name as key and GlUniformLocation
 * as value.
 */
rfProgram.prototype.getUniformObject = function(array) {
	var dict = {};
	for (var i=0; i<array.length; i++) {
		dict[array[i]] = this.getUniform(array[i]);
	}
	return dict;
};

/**
 * @callback uniformLink
 * @param {GlContext} gl OpenGL context.
 * @param {GlUniformLocation} loc Uniform location.
 */

/**
 * @class
 * @classdesc Shader uniform constants between multiple shader programs. Look in
 * github repository samples/camera.html for a sample code.
 * @param {string} name GLSL uniform source name.
 * @param {uniformLink} cb Callback when the constanc needs to be applied.
 */
function rfUniformLink(name, cb) {
	this.magic = 1;
	this.name = name;
	this.cb = cb;
}

/**
 * Notify linked uniform update. Next time a shader program is used with this
 * uniform link, the uniformLink callback will be triggered.
 */
rfUniformLink.prototype.update = function() {
	this.magic++;
};


//=============================================================================
// Web audio container
//=============================================================================

/**
 * @class
 * @classdesc 3D sound fx base system using WebAudio.
 * @param {int} channelCount Maximum amount of different sounds.
 */
function rfWebAudio(channelCount) {
	this.vecForward = rfVec3_create();
	this.vecSide = rfVec3_create();
	this.vecUp = rfVec3_create();
	this.mat = rfMat4_create();
	rfMat4_identity(this.mat);

	this.context = new (window.AudioContext || window.webkitAudioContext)();

	this.channels = [];
	for (let i=0; i<channelCount; i++) this.channels.push(null);
};

/**
 * Set listening position.
 * @param {float} x Absolute X position.
 * @param {float} y Absolute Y position.
 * @param {float} z Absolute Z position.
 * @param {float} dx Relative looking X direction.
 * @param {float} dy Relative looking Y direction.
 * @param {float} dz Relative looking Z direction.
 * @param {float} ux Relative upward X direction.
 * @param {float} uy Relative upward Y direction.
 * @param {float} uz Relative upward Z direction.
 * @param {boolean} normalize Should be true if the directions are not
 * normalized.
 */
rfWebAudio.prototype.setListenPosition = function(
		x, y, z,
		dx, dy, dz,
		ux, uy, uz, normalize) {

	this.vecForward[0] = dx;
	this.vecForward[1] = dy;
	this.vecForward[2] = dz;
	this.vecUp[0] = ux;
	this.vecUp[1] = uy;
	this.vecUp[2] = uz;

	if (normalize) {
		rfVec3_normalize(this.vecForward, this.vecForward);
		rfVec3_normalize(this.vecUp, this.vecUp);
	}

	rfVec3_cross(this.vecSide, this.vecForward, this.vecUp);

	this.mat[ 0] = this.vecSide[0];
	this.mat[ 4] = this.vecSide[1];
	this.mat[ 8] = this.vecSide[2];
	this.mat[ 1] = -this.vecForward[0];
	this.mat[ 5] = -this.vecForward[1];
	this.mat[ 9] = -this.vecForward[2];
	this.mat[ 2] = this.vecUp[0];
	this.mat[ 6] = this.vecUp[1];
	this.mat[10] = this.vecUp[2];

	this.mat[ 3] = -x;
	this.mat[ 7] = -y;
	this.mat[11] = -z;

	for (let chans of this.channels) {
		if (chans && chans.usingPanner) {
			chans.updatePanner(this.mat);
		}
	}
};

/**
 * Setup a channel as mono sound playback.
 * @param {int} id Channel ID.
 * @param {SoundBuffer} sound Sound buffer. From rfLoader.
 * @param {int} maxChannels Maximum simultanious playing sound of this clip.
 */
rfWebAudio.prototype.setChannelMono = function(id, sound, maxChannels) {
	this.setChannel(id, sound.buffer, false, maxChannels);
};

/**
 * Setup a channel as 3D sound playback.
 * @param {int} id Channel ID.
 * @param {SoundBuffer} sound Sound buffer. From rfLoader.
 * @param {int} maxChannels Maximum simultanious playing sound of this clip.
 */
rfWebAudio.prototype.setChannel3d = function(id, sound, maxChannels) {
	this.setChannel(id, sound.buffer, true, maxChannels);
};

rfWebAudio.prototype.setChannel = function(id, buffer, usePanner, maxChannels) {
	this.channels[id] = new rfAudioChannels(this.context, this.mat,
			buffer, usePanner, maxChannels);
};

/**
 * Stop all sounds on channel.
 * @param {int} id Channel ID.
 */
rfWebAudio.prototype.stopChannel = function(id) {
	this.channels[id].stopAll();
};

/**
 * Stop all sounds on all channels.
 */
rfWebAudio.prototype.stopAll = function() {
	for (let i=0; i<this.channels.length; i++) {
		this.stopChannel(i);
	}
};

/**
 * Play a sound on a mono channel.
 * @param {int} id Channel ID.
 * @param {boolean} loop Loop sound?
 */
rfWebAudio.prototype.playMono = function(id, loop) {
	this.channels[id].playNext(0, 0, 0, loop);
};

/**
 * Play a sound on a 3D channel.
 * @param {int} id Channel ID.
 * @param {float} x Sound origin absolute X position.
 * @param {float} y Sound origin absolute Y position.
 * @param {float} z Sound origin absolute Z position.
 * @param {boolean} loop Loop sound?
 */
rfWebAudio.prototype.play3d = function(id, x, y, z, loop) {
	let chans = this.channels[id];
	let play = chans.playNext(x, y, z, loop);

	return play;
};


//=============================================================================
// Sound clip with multiple channels
// Internal
//=============================================================================

function rfAudioChannels(context, mat, buffer, usePanner, count) {
	this.next = 0;
	this.count = count;
	this.channels = [];
	this.usingPanner = usePanner;

	for (let i=0; i<count; i++) {
		let source = context.createBufferSource();
		let panner = null;

		source.buffer = buffer;

		if (usePanner) {
			panner = context.createPanner();
			source.connect(panner);
			panner.connect(context.destination);
		} else {
			source.connect(context.destination);
		}

		this.channels[i] = new rfAudioPlay(mat, source, panner);
	}
};

rfAudioChannels.prototype.playNext = function(x, y, z, loop) {
	let ch = this.channels[this.next];

	if (this.usingPanner) {
		ch.setLocalPosition(x, y, z);
	};

	ch.play(loop);

	this.next = (this.next+1) % this.count;
	return ch;
};

rfAudioChannels.prototype.stopAll = function() {
	for (let play of this.channels) play.stop();
};

rfAudioChannels.prototype.updatePanner = function(mat) {
	for (let play of this.channels) play.applyPosition(mat);
};


//=============================================================================
// Sound play component
// Internal
//=============================================================================

function rfAudioPlay(mat, source, panner) {
	this.mat = mat;
	this.source = source;
	this.panner = panner;
	this.localPosition = rfVec3_create();
	this.relativePosition = rfVec3_create();
	this.stopCount = 0;

	var self = this;
	this.source.onended = function() {
		if (!self.source.loop) {
			self.tickUnplay;
		}
	};
};

rfAudioPlay.prototype.setLocalPosition = function(x, y, z) {
	this.localPosition[0] = x;
	this.localPosition[1] = y;
	this.localPosition[2] = z;
	//console.log('Set local position', this.localPosition);

	this.applyPosition();
};

rfAudioPlay.prototype.applyPosition = function() {
	rfMat4_mulVec3(this.relativePosition, this.mat, this.localPosition);

	//console.log('Set relative position', this.relativePosition);
	this.panner.setPosition(
			-this.relativePosition[0],
			-this.relativePosition[1],
			-this.relativePosition[2]);
};

rfAudioPlay.prototype.tickUnplay = function() {
	this.stopCount++;
};

rfAudioPlay.prototype.getStopCount = function() {
	return this.stopCount;
};

rfAudioPlay.prototype.play = function(loop) {
	this.source.loop = loop;
	this.source.start(0);
};

rfAudioPlay.prototype.stop = function() {
	this.source.stop(0);
};

