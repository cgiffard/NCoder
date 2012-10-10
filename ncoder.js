var EventEmitter	= require("events").EventEmitter,
	childProcess	= require("child_process"),
	spawn			= childProcess.spawn,
	threadCount		= require('os').cpus().length,
	NQueue			= require("./nqueue.js"),
	NJob			= require("./njob.js"),
	FFParser		= require("./ffparse.js");


// Global worker pool, regardless of NCoder instances.
var workers = [];

// Use 
var NCoder = function NCoder(simultaneity) {
	simultaneity = simultaneity ? simultaneity : threadCount;
	this.queue = new NQueue(this);
}

NCoder.prototype = new EventEmitter();

NCoder.prototype.addJob = function(params) {

};



/* Some convenient functions to wrap a bit of what ffmpeg can do... */
NCoder.prototype.metadata = function(infile,callback) {
	// Deliberately ignore proper ffmpeg usage - just to get metadata out.
	// Otherwise we have to write to disk in some arcane ini format and
	// then read it back in...
	var ffmpeg = spawn("ffmpeg",["-i",infile]);
	
	var parser = new FFParser(ffmpeg);
	
	ffmpeg.stderr.on("data",function(streamChunk) {
		//stderr += streamChunk
	});
	
	ffmpeg.on("exit",function(arguments) {
		//parser.parse(stderr);
		//console.log("that's the end of that then.");
		//console.log(parser);
	});
	
	parser.on("parsecomplete",function() {
		parser.inputs.forEach(function(item) {
			console.log(item)});
	});
};

module.exports = NCoder;