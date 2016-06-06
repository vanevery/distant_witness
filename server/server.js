	// HTTP Portion
	const httpport = 80;
	const httpsport = 443;
	
	var http = require('http');
	var https = require('https');
	var fs = require('fs'); // Using the filesystem module
	var url = require('url');

	var options = {
	  key: fs.readFileSync('my-key.pem'),
	  cert: fs.readFileSync('my-cert.pem')
	};

	var httpsServer = https.createServer(options, requestHandler);
	httpsServer.listen(httpsport);
	console.log("HTTPS server listening on port: " + httpsport);

	var httpServer = http.createServer(function(req, res) {
		res.writeHead(301, {'Location': 'https://' + req.headers['host'] + ":" + req.port + req.url});
		res.end();
	});
	httpServer.listen(httpport);
	console.log("HTTP server listening on port: " + httpport);
	
	function requestHandler(req, res) {

		var parsedUrl = url.parse(req.url);
		console.log("The Request is: " + parsedUrl.pathname);
	
		var dirname = __dirname;
	
		// For requests to mobile pages
		if (parsedUrl.pathname.indexOf("/mobile_witness/") == 0) {
			dirname = dirname + "/..";
		}
	
		console.log("dirname: " + dirname); 
	
		// Read in the file they requested
	
		fs.readFile(dirname + parsedUrl.pathname, 
			// Callback function for reading
			function (err, data) {
				// if there is an error
				if (err) {
					res.writeHead(500);
					return res.end('Error loading ' + parsedUrl.pathname);
				}
				// Otherwise, send the data, the contents of the file
				res.writeHead(200);
				res.end(data);
			}
		);
	}

	var clients = [];

	// WebSocket Portion
	// WebSockets work with the HTTP server
	var io = require('socket.io').listen(httpsServer);

	// Register a callback function to run when we have an individual connection
	// This is run for each individual user that connects
	io.sockets.on('connection', 
		// We are given a websocket object in our function
		function (socket) {
	
			log(socket, "connection", "");
	
			// Add socket to clients array
			socket.type = "unknown";
			socket.chatmessages = [];
			clients.push(socket);
		
			// Tell us what type
			socket.on('type', function(data) {

				log(socket, 'type', data);

				// Types are: director, mobile, remote
				socket.type = data;
			
				// Send them any relevant data
				if (socket.type == "director") {
					for (var i = 0; i < clients.length; i++) {
						if (clients[i] != null && clients[i].type == "mobile" && clients[i].location) {
							socket.emit('location',clients[i].location);
						}
					}
				}
			});
		
			// Tell remote to connect to peer-id
			socket.on('peerid_connect', function(data) {
				log(socket, 'peerid_connect', data);		
				for (var i = 0; i < clients.length; i++) {
					if (clients[i] != null && clients[i].type == "remote") {
						clients[i].emit('peerid_connect',data);
					}
				}		
			});
		
			// Tell remote to disconnect to peer-id
			socket.on('peerid_disconnect', function(data) {
				log(socket, 'peerid_disconnect', data);
				for (var i = 0; i < clients.length; i++) {
					if (clients[i] != null && clients[i].type == "remote") {
						clients[i].emit('peerid_disconnect',data);
					}
				}					
			});
		
			// Tell us peer id
			socket.on('peerid', function(data) {
			
				log(socket, 'peerid', data);
			
				socket.peerid = data;
			
				if (socket.type == "mobile") {
					//console.log(socket.type + " == mobile");
					// If this is mobile, send to director
					for (var i = 0; i < clients.length; i++) {
						if (clients[i] != null && clients[i].type == "director") {
							//console.log("sending to director");
							clients[i].emit('peerid',data);
						}
					}
				}
				else if (socket.type == "director") {
					//(socket.type + " == director");
					// If this is director, send to mobile
					for (var i = 0; i < clients.length; i++) {
						if (clients[i] != null && clients[i].type == "mobile") {
							//console.log("sending to mobile");
							clients[i].emit('peerid',data);
						}
					}		
				}
			});	
		
			// User sends username
			socket.on('username', function(data) {
			
				log(socket, 'username', data);
			
				socket.username = data;
			
			});
		
		
			// Mobile user sends location
			socket.on('location', function(data) {
		
				log(socket, 'location', data);
		
				//if (socket.type == "mobile") {
					socket.location = data;
					// Send to everyone?
					io.sockets.emit('location', data);
				
				//}
			});
			
			// Mobile or Desktop user sends tag event
			socket.on('tag', function(data) {
				log(socket, 'tag', data);
				io.sockets.emit('tag', data);
			}
		
			// Mobile user sends panic
			socket.on('panic', function(data) {

				log(socket, 'panic', data);
		
				//if (socket.type == "mobile") {
					socket.panic = true;
				
					// Send to everyone
					io.sockets.emit('panic', data);
				//}
				
				panic(socket);
			});	
		
			// Moderated message from director to mobile
			socket.on('moderatedchatmessage', function(data) {
		
				log(socket, 'moderatedchatmessage', data);
		
				if (socket.type == "director") {
					for (var i = 0; i < clients.length; i++) {
						if (clients[i] != null && clients[i].type == "mobile") {
							clients[i].emit('chatmessage',data);
						}
					}		 		
				}		
			});

			// Chat message from anyone	
			socket.on('chatmessage', function(data) {
		
				log(socket, 'chatmessage', data);
		 
				if (socket.type == "mobile") {
					// If mobile, probably not usual
					//io.sockets.emit('chatmessage', data);
					socket.broadcast.emit('chatmessage', data);
				}
				else if (socket.type == "director") {
					// If director, send to everyone
					//io.sockets.emit('chatmessage', data);
					socket.broadcast.emit('chatmessage', data);
				} 
				else if (socket.type == "remote") {
					// If remote audience, send to each-other and director
					for (var i = 0; i < clients.length; i++) {
						if (clients[i].type != "mobile") {
							clients[i].emit('chatmessage',data);
						}
					}		 		
				}
			});
		
			// Socket disconnected
			socket.on('disconnect', function() {
				log(socket, 'disconnect', "");
				var indexToRemove = clients.indexOf(socket);
				if (indexToRemove > -1) {
					clients.splice(indexToRemove, 1);
				}
				//console.log(clients.length);
			});
		}
	);

	function log(socket, action, message) {
		console.log(socket.id + ": " + action + ": " + message);
	}
	
	function panic(socket) {
		// Do anything with relevant panic information
		console.log(socket.id + ": panic");
	}
	
/////  Peer Server
var fs = require('fs');
var PeerServer = require('peer').PeerServer;

var server = PeerServer({
  port: 10000,
  ssl: {
    key: fs.readFileSync('my-key.pem'),
    cert: fs.readFileSync('my-cert.pem')
  }
});
