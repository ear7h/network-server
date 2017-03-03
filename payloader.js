/*
this is a media server which can handle
206 partial content requests. This ability
is helpful for large files and essential
for HTML5 video on Apple's Safari browser
*/

/*
practically copied fom https://www.codeproject.com/Articles/813480/HTTP-Partial-Content-In-Node-js
*/
//required modules
const fs = require('fs');
const http = require('http');
const mime = require('mime');
const https = require('https');

//globals
const folder = './content'; //subfolder from which to serve from
const server = http.createServer(toEncrypted); //unecrypted server object
const options = {
	key: fs.readFileSync('/etc/letsencrypt/live/ear7h.net/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/live/ear7h.net/cert.pem')
};
const sserver = https.createServer(options, main); //encrypted server object


//http request listener
function toEncrypted (req, res) {
	res.writeHead(302, {Location: 'https://ear7h.net' + req.url});
	res.end();
}

/*TODO
  create router
    routes:
      post - api serve
      get  - media serve
  create api function


*/

//https request listener
function main(req, res) {

  //creates path variable
  var path = folder + req.url;
	console.log(req.url);
  //if path is to home directory, send index.html
  if(path == folder + '/'){
    path = 'index.html';
  }

  //if file does not exist, send 404
  if(!fs.existsSync(path)){
    res.writeHead(404);
    var notFound = fs.readFileSync(folder + '/notfound.html');
    res.write(notFound);
    res.end();
    return;
  }
  //file size variable
  var fileSize = fs.statSync(path).size;

  //will hold range parameters for stream object
  var range = null;

  //if range header, use readstream to get data
  //direct copy from https://www.codeproject.com/Articles/813480/HTTP-Partial-Content-In-Node-js
  if (req.headers.range){
    console.log("requested range: " + req.headers.range);
    range = req.headers.range;
    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    //console.log('array: ' + array + "\n");
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    range = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (fileSize - 1) : end
    };
		/*
    if (!isNaN(start) && isNaN(end)) {
        range.Start = start;
        range.End = fileSize - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        range.Start = fileSize - end;
        range.End = fileSize - 1;
    }
		*/

  }

  //creating payload

  //poplute data with or without specified range
  var dataStream; //stream object to requested file
  var rangeHead; //string contets of Range http header
  var lengthHead; //string contents of Content-Length header
  var statusCode; //http status code

  //if partial content requested 206
  if (range){
    dataStream = fs.createReadStream(path, range);
    rangeHead = 'bytes ' + range.Start + '-' + range.End  + '/' + (fileSize);
    lengthHead = range.End - range.Start + 1;
    statusCode = 206;
  //complete content 200
  } else {
    dataStream = fs.createReadStream(path);
    rangeHead = 'bytes */' + fileSize;
    lengthHead = fileSize;
    statusCode = 200;
  }


  var mimeType = mime.lookup(path); //string contets of Content-Type header

  //write appropiate headers
  res.writeHead(statusCode, {
    'Content-Type'  : mimeType,
    'Accept-Ranges' : 'bytes',
    'Content-Length': lengthHead,
    'Content-Range' : rangeHead
  });
	console.log({
    'Content-Type'  : mimeType,
    'Accept-Ranges' : 'bytes',
    'Content-Length': lengthHead,
    'Content-Range' : rangeHead
  })
	console.log("");
  //pipe file stream to reponse object -- end of code
  dataStream.pipe(res);

}

//open servers
server.listen(80);
sserver.listen(443);
