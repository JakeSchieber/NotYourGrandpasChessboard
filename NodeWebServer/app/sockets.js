module.exports = function(io) {

	// Socket IO routes
	
	io.on('connection', function(socket){
		console.log('a user connected');
		
		socket.on('disconnect', function(){
			console.log('user disconnected');
		});
		
		socket.on('chat message', function(msg){
			console.log('message: ' + msg);
			
			io.emit('chat message', msg);
		});
		
		socket.on('slider update', function(val){
			console.log('slider value: '+val);
			
			io.emit('slider update', val);
		})
	});

};