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
};

NCoder.prototype = new EventEmitter();

NCoder.prototype.addJob = function(infile,outfile,parameters) {
	
	var job = new NJob(infile,outfile,parameters)
	this.queue.addJob(job);
	
	return job;
};

// Some convenient functions to wrap a bit of what ffmpeg can do...
//
NCoder.prototype.metadata = function(infile,callback) {
	// Deliberately ignore proper ffmpeg usage - just to get metadata out.
	// Otherwise we have to write to disk in some arcane ini format and
	// then read it back in...
	var ffmpeg = spawn("ffmpeg",["-i",infile]),
		parser = new FFParser(ffmpeg);
	
	parser.on("parsecomplete",function() {
		callback(parser);
	});
};

NCoder.prototype.h264 = function(infile,outfile,options) {
	options = options && options instanceof Object ? options : {};
	
	if (!infile	) throw new Error("An input file must be provided.");
	if (!outfile) throw new Error("An output file must be provided.");
	
	var audioBitRate		= options.audioBitRate		|| "128k",
		audioSampleRate		= options.audioSampleRate	|| "44100",
		videoWidth			= options.videoWidth		|| 640,
		videoHeight			= options.videoHeight		|| 360,
		videoBitRate		= options.videoBitRate		|| "1024k",
		videoFrameRate		= options.videoFrameRate	|| 30;
	
	//ffmpeg -i exampleinput.mp4
	// -strict experimental -acodec aac -ab 128k -ar 44100
	// -vcodec libx264 -s 640x360 -r 30 -vb 1024k ./test.mp4
	
	var parameters = [
		"-strict",	"experimental",
		"-acodec",	"aac",
		"-ab",		audioBitRate,
		"-ar",		audioSampleRate,
		"-vcodec",	"libx264",
		"-s",		videoWidth + "x" + videoHeight,
		"-vb",		videoBitRate,
		"-r",		videoFrameRate
	];
	
	return this.addJob(infile,outfile,parameters);
};

// Synonyms...
NCoder.prototype.mp4 = NCoder.prototype.h264;

NCoder.prototype.ogv = function(infile,outfile,options) {
	options = options && options instanceof Object ? options : {};
	
	if (!infile	) throw new Error("An input file must be provided.");
	if (!outfile) throw new Error("An output file must be provided.");
	
	var audioBitRate		= options.audioBitRate		|| "128k",
		audioSampleRate		= options.audioSampleRate	|| "44100",
		videoWidth			= options.videoWidth		|| 640,
		videoHeight			= options.videoHeight		|| 360,
		videoBitRate		= options.videoBitRate		|| "1024k",
		videoFrameRate		= options.videoFrameRate	|| 30;
	
	//ffmpeg -i exampleinput.mp4
	// -acodec libvorbis -ab 128k -ar 44100
	// -vcodec libtheora -s 640x360 -r 30 -vb 1024k ./test.ogv
	
	var parameters = [
		"-acodec",	"libvorbis",
		"-ab",		audioBitRate,
		"-ar",		audioSampleRate,
		"-vcodec",	"libtheora",
		"-s",		videoWidth + "x" + videoHeight,
		"-vb",		videoBitRate,
		"-r",		videoFrameRate
	];
	
	return this.addJob(infile,outfile,parameters);
};

NCoder.prototype.webm = function(infile,outfile,options) {
	options = options && options instanceof Object ? options : {};
	
	if (!infile	) throw new Error("An input file must be provided.");
	if (!outfile) throw new Error("An output file must be provided.");
	
	var audioBitRate		= options.audioBitRate		|| "128k",
		audioSampleRate		= options.audioSampleRate	|| "44100",
		videoWidth			= options.videoWidth		|| 640,
		videoHeight			= options.videoHeight		|| 360,
		videoBitRate		= options.videoBitRate		|| "1024k",
		videoFrameRate		= options.videoFrameRate	|| 30;
	
	//ffmpeg -i exampleinput.mp4
	// -acodec libvorbis -ab 128k -ar 44100
	// -vcodec libvpx -s 640x360 -r 30 -vb 1024k ./test.webm
	
	var parameters = [
		"-acodec",	"libvorbis",
		"-ab",		audioBitRate,
		"-ar",		audioSampleRate,
		"-vcodec",	"libvpx",
		"-s",		videoWidth + "x" + videoHeight,
		"-vb",		videoBitRate,
		"-r",		videoFrameRate
	];
	
	return this.addJob(infile,outfile,parameters);
};

module.exports = NCoder;