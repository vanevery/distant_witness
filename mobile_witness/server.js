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
	httpsServer.listen(8081);

	var httpServer = http.createServer(function(req, res) {
		res.writeHead(301, {'Location': 'https://' + req.headers['host'] + req.url});
		res.end();
	});
	httpServer.listen(8080);

	function requestHandler(req, res) {

		var parsedUrl = url.parse(req.url);
		//console.log("The Request is: " + parsedUrl.pathname);
	
		// Read in the file they requested
	
		fs.readFile(__dirname + parsedUrl.pathname, 
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
