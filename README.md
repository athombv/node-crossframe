# crossframe

Send messages between a page and its iframes with ease.

This module can even pass some non-JSON stringifyable types such as _Error_.

## Example

_index.html_

```javascript
<script type="text/javascript" src="../src/crossframe.js"></script>
<script type="text/javascript">
window.addEventListener('load', function(){
	var frameEl = document.getElementById('myframe');
	var cf = new CrossFrame( frameEl );
		cf.on('iframe_to_parent', function( data, callback ) {
			console.log('on iframe_to_parent', data);
			callback( null, true );
		})
		cf.emit('parent_to_iframe', { x: 'y' }, function( err, result ){
			console.log('parent_to_iframe callback', 'err:', err, 'result:', result);
		})
});
</script>

<iframe id="myframe" src="frame.html" width="600" height="400" sandbox="allow-scripts"></iframe>
```

_frame.html_

```javascript
<script type="text/javascript" src="../src/crossframe.js"></script>
<script type="text/javascript">
window.addEventListener('load', function(){
	var cf = new CrossFrame();
		cf.on('parent_to_iframe', function( data, callback ){
			console.log('on parent_to_iframe', data);
			callback( new Error('Test error!') );
		})
		cf.emit('iframe_to_parent', { foo: 'bar' }, function( err, result ){
			console.log('my_message callback', 'err:', err, 'result:', result);
		})
});
</script>
```

For more examples, see `./demo/`.