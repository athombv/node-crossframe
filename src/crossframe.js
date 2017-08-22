/*
	CrossFrame.js - v1.0.0
	Created by Emile Nijssen - www.emilenijssen.nl
*/

(function() {

	var EVENT_MESSAGE = 'CROSSFRAME_MESSAGE';
	var EVENT_READY = 'CROSSFRAME_READY';
	
	var reactNativeReady = false;
	var reactNativeReadyFns = [];
	var reactNative = ( getParameterByName('reactNative') === '1' );
	if( reactNative ) {
		document.addEventListener('message', function( e ) {
			if( e.data === EVENT_READY ) {
				reactNativeReady = true;
				reactNativeReadyFns.forEach(function(reactNativeReadyFn){
					reactNativeReadyFn();
				});
			}
		});
	}
	
	function onReactNativeReady( callback ) {
		if( reactNativeReady ) {
			callback();
		} else {
			reactNativeReadyFns.push( callback );
		}
	}
	
	function getParameterByName(name, url) {
	    if (!url) url = window.location.href;
	    name = name.replace(/[\[\]]/g, "\\$&");
	    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	        results = regex.exec(url);
	    if (!results) return null;
	    if (!results[2]) return '';
	    return decodeURIComponent(results[2].replace(/\+/g, " "));
	}


	function CrossFrame( el ) {

		this.onMessage = this.onMessage.bind(this);
		this._el = el;

		this._clear();
		
		if( reactNative ) {
			document.addEventListener('message', this.onMessage);
		} else {
			window.addEventListener('message', this.onMessage);
		}
	
		if( reactNative ) {
			onReactNativeReady(function(){
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
		
		if( reactNative ) {
			document.removeEventListener('message', this.onMessage);
		} else {
			window.removeEventListener('message', this.onMessage);
		}
	}

	CrossFrame.prototype._debug = function(){
		if( window.location.href.indexOf('http://127.0.0.1') === 0 ) {
			console.log.bind( null, '[CrossFrame]' ).apply( null, arguments );
		}
	}

	CrossFrame.prototype.onMessage = function( e ){
		this._debug('onMessage', window.location.href, arguments)

		if( !e.data || typeof e.data !== 'string' ) return;
		if( e.data.indexOf(EVENT_MESSAGE) !== 0 ) return;

		var obj = this._jsonToObj( e.data.substr( EVENT_MESSAGE.length ) );
		if( obj.type === 'tx' ) {

			var callback = function( err, result ){
				var message = {
					type: 'cb',
					args: args = Array.prototype.slice.call(arguments),
					callbackId: obj.callbackId
				}

				this._post( message );
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

		this._post( message );

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

	CrossFrame.prototype._post = function( message ) {

		var target;
		if (this._el) {
			target = this._el.contentWindow ? this._el.contentWindow : this._el;
		} else if (window && window.parent) {
			target = window.parent;
		}

		if( target ) {
			target.postMessage( EVENT_MESSAGE + this._objToJson(message), '*' );
		}

	}

	CrossFrame.prototype._objToJson = function( obj ) {
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

	CrossFrame.prototype._jsonToObj = function( json ) {
		return JSON.parse( json, function reviver( key, value ) {
			if( value && value.type ) {
				if( value.type === 'Error' ) {
					return new Error( value.data );
				}
			}
			return value;
		});
	}

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = CrossFrame;
	}
	else {
		window.CrossFrame = CrossFrame;
	}
	
})()