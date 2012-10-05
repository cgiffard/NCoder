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
NCoder.prototype.metadata = function(infile) {
	// Deliberately ignore proper ffmpeg usage - just to get metadata out.
	// Otherwise we have to write to disk in some arcane ini format and
	// then read it back in...
	var ffmpeg = spawn("ffmpeg",["-i",infile]);
	
	var stdout = "", stderr = "",
		parser = new FFParser(ffmpeg.stdout,ffmpeg.sterr);
	
	ffmpeg.stderr.on("data",function(streamChunk) {
		stderr += streamChunk
	});
	
	ffmpeg.on("exit",function(arguments) {
		parser.parse(stderr);
	})
};

module.exports = NCoder;