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
	// Load via HTTPS to avoid issues with CORS, getUserMedia and the like
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
	var fs = require('fs');
	var url = require('url');

	var options = {
	  key: fs.readFileSync(__dirname + "/my-key.pem"),
	  cert: fs.readFileSync(__dirname + "/my-cert.pem")
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
	
