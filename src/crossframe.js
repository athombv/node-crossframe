var postMessageEvent = 'CROSSFRAME';

function CrossFrame( el ) {

	this._el = el;
	this._eventlisteners = {};
	this._callbackFns = {};
	this._callbackId = 0;

	window.addEventListener('message', this._onMessage.bind(this));

	return this;

}

CrossFrame.prototype._onMessage = function( e ){
	//console.log('_onMessage', window.location.href, arguments)

	var obj = this._jsonToObj( e.data );
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

CrossFrame.prototype._post = function( message ) {

	var target;
	if( this._el ) {
		target = this._el.contentWindow;
	} else {
		target = window.parent;
	}

	if( target ) {
		target.postMessage( this._objToJson(message), '*' );
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