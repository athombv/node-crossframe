/*
	CrossFrame.js - v1.0.0
	Created by Emile Nijssen - www.emilenijssen.nl
*/

(function() {

	var EVENT_MESSAGE = 'CROSSFRAME_MESSAGE';
	var EVENT_READY = 'CROSSFRAME_READY';
	
	var webviewReady = false;
	var webviewReadyFns = [];
	var webview = ( getParameterByName('webview') === '1' );
	if( webview ) {
		document.addEventListener('message', function( e ) {
			if( webviewReady === false && e.data === EVENT_READY ) {
				webviewReady = true;
				webviewReadyFns.forEach(function(webviewReadyFn){
					webviewReadyFn();
				});
			}
		});
	}

	function CrossFrame( el, opts ) {
		
		opts = opts || {};
		
		if( typeof opts.throttle !== 'number' ) {
			opts.throttle = 50;
		}

		this.onMessage = this.onMessage.bind(this);
		this._clear = this._clear.bind(this);
		this._debug = this._debug.bind(this);
		this.on = this.on.bind(this);
		this.emit = this.emit.bind(this);
		this.destroy = this.destroy.bind(this);
		this.ready = this.ready.bind(this);
		this._ready = this._ready.bind(this);
		this._post = this._post.bind(this);
		this._post = throttle( this._post, opts.throttle )
		
		this._el = el;

		this._clear();
		
		if( webview ) {
			if( document && document.addEventListener ) {
				document.addEventListener('message', this.onMessage);
			}
		} else {
			if( window && window.addEventListener ) {
				window.addEventListener('message', this.onMessage);
			}
		}
	
		if( webview ) {
			onWebviewReady(function(){
				this._ready();				
			}.bind(this));
		} else {
			this._ready();		
		}

		return this;

	}

	CrossFrame.prototype._clear = function(){
		this._eventlisteners = {};
		this._callbackFns = {};
		this._callbackId = 0;
		this._readyFns = [];
		this._isReady = false;
		
		if( webview ) {
			if( document && document.removeEventListener ) {
				document.removeEventListener('message', this.onMessage);
			}
		} else {
			if( window && window.removeEventListener ) {
				window.removeEventListener('message', this.onMessage);
			}
		}
	}

	CrossFrame.prototype._debug = function(){
		console.log.bind( null, '[CrossFrame]' ).apply( null, arguments );
	}

	CrossFrame.prototype.onMessage = function( e ){
		if( !e.data || typeof e.data !== 'string' ) return;
		if( e.data.indexOf(EVENT_MESSAGE) !== 0 ) return;
		
		this._debug('onMessage', e)

		var obj = jsonToObj( e.data.substr( EVENT_MESSAGE.length ) );
		if( obj.type === 'tx' ) {

			var callback = function( err, result ){
				var message = {
					type: 'cb',
					args: args = Array.prototype.slice.call(arguments),
					callbackId: obj.callbackId
				}

				this.postMessage( message );
			}.bind(this)

			var eventListeners = this._eventlisteners[ obj.event ];
			if( eventListeners ) {
				eventListeners.forEach(function(eventListener){
					eventListener.call( eventListener, obj.data, callback )
				})
			}

		} else if( obj.type === 'cb' ) {
			var callbackFn = this._callbackFns[ obj.callbackId ];
			if( callbackFn ) {
				callbackFn.apply( callbackFn, obj.args );
			}
		}
	}

	CrossFrame.prototype.on = function( event, callback ) {
		this._eventlisteners[ event ] = this._eventlisteners[ event ] || [];
		this._eventlisteners[ event ].push( callback );

		return this;
	}

	CrossFrame.prototype.emit = function( event, data, callback ) {

		var callbackId = null;
		if( typeof callback === 'function' ) {
			callbackId = ++this._callbackId;
			this._callbackFns[ callbackId ] = callback;
		}

		var message = {
			type: 'tx',
			event: event,
			data: data,
			callbackId: callbackId
		}

		this.postMessage( message );

		return this;
	}

	CrossFrame.prototype.destroy = function(){
		this._clear();
	}
	
	CrossFrame.prototype.ready = function( callback ){
		
		if( this._isReady ) {
			callback();
		} else {		
			this._readyFns.push( callback );
		}
	}
	
	CrossFrame.prototype._ready = function() {
		
		this._isReady = true;
		
		this._readyFns.forEach(function(readyFn){
			readyFn();
		});
	}

	CrossFrame.prototype.postReady = function( message ) {
		this._post( EVENT_READY );
	}

	CrossFrame.prototype.postMessage = function( message ) {
		this._post( EVENT_MESSAGE + objToJson(message) );
	}
	
	CrossFrame.prototype._post = function( message ) {
		this._debug('_post()', message);

		var target;
		if (this._el) {
			target = this._el.contentWindow ? this._el.contentWindow : this._el;
		} else if (window && window.parent) {
			target = window.parent;
		}

		if( target ) {
			target.postMessage( message, '*' );
		}
		
	}

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = CrossFrame;
	}
	else {
		window.CrossFrame = CrossFrame;
	}
	
	function onWebviewReady( callback ) {
		if( webviewReady ) {
			callback();
		} else {
			webviewReadyFns.push( callback );
		}
	}
	
	function getParameterByName(name, url) {
		if( window 
		 && window.location 
		 && window.location.href ) {
		    if (!url) url = window.location.href;
		    name = name.replace(/[\[\]]/g, "\\$&");
		    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		        results = regex.exec(url);
		    if (!results) return null;
		    if (!results[2]) return '';
		    return decodeURIComponent(results[2].replace(/\+/g, " "));
	    }
	    
	    return '';
	}
	
	function throttle(fn, threshhold, scope) {
	  threshhold || (threshhold = 250);
	  var last,
	      deferTimer;
	  return function () {
	    var context = scope || this;
	  
	    var now = +new Date,
	        args = arguments;
	    if (last && now < last + threshhold) {
	      // hold on to it
	      clearTimeout(deferTimer);
	      deferTimer = setTimeout(function () {
	        last = now;
	        fn.apply(context, args);
	      }, threshhold);
	    } else {
	      last = now;
	      fn.apply(context, args);
	    }
	  };
	}

	function objToJson( obj ) {
		return JSON.stringify( obj, function replacer( key, value ) {
			if( value instanceof Error ) {
				return {
					type: 'Error',
					data: value.message
				}
			}

			return value;
		});
	}

	function jsonToObj( json ) {
		return JSON.parse( json, function reviver( key, value ) {
			if( value && value.type ) {
				if( value.type === 'Error' ) {
					return new Error( value.data );
				}
			}
			return value;
		});
	}
	
})()