const httpport = 8080;
const httpsport = 8081;

const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  //mainWindow = new BrowserWindow({width: 800, height: 600, kiosk: true})
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
//  mainWindow.loadURL('file://' + __dirname + '/index.html')
  mainWindow.loadURL('https://localhost:8081/index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

	// HTTP Portion
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
		
			// Mobile user sends panic
			socket.on('panic', function(data) {

				log(socket, 'panic', data);
		
				//if (socket.type == "mobile") {
					socket.panic = true;
				
					// Send to everyone
					io.sockets.emit('panic', data);
				//}
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
	
/////  Peer Server

var fs = require('fs');
var PeerServer = require('peer').PeerServer;

var server = PeerServer({
  port: 9000,
  ssl: {
    key: fs.readFileSync('my-key.pem'),
    cert: fs.readFileSync('my-cert.pem')
  }
});

	
