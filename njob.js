// Wrapper for NCode jobs

var NCoder			= require("./ncoder.js"),
	NQueue			= require("./nqueue.js"),
	EventEmitter	= require("events").EventEmitter,
	childProcess	= require("child_process"),
	spawn			= childProcess.spawn;

var NJob = function NJob(input,output,parameters) {
	var self = this;
	
	self.input				= input;
	self.output				= output ? output : input + ".out";
	self.parameters			= parameters;
	self.priority			= 0;
	self.status				= "pending";
	self.duration			= 0;
	self.fps				= 30;
	self.framesComplete		= 0;
	self.percentComplete	= 0;
	
	// Consts for checking against
	self.JOB_PENDING		= "pending";
	self.JOB_PROCESSING		= "processing";
	self.JOB_COMPLETE		= "complete";
	self.JOB_ERROR			= "error";
	
	// Who's clobbering my ncoder instance?
	// Why do I have to do this!? I'll find out, but not today.
	self.ncoder = new (require("./ncoder.js"))();
	
	// Try and extract metadata about file...
	self.ncoder.metadata(input,function(data) {
		var duration = 0,
			fps = 30;
		
		// Sucks. Rewrite
		if (data.inputs[0] &&
			data.inputs[0].streams && 
			data.inputs[0].streams.length) {
			
			data.inputs[0].streams
				.filter(function(stream) {
					return stream.kind === "video";
				})
				.forEach(function(stream) {
					if (stream.fps && !isNaN(stream.fps))
						return (fps = stream.fps);
				});
			
			duration = 
				data.inputs[0].duration &&
				!isNaN(data.inputs[0].duration) ?
					data.inputs[0].duration : 0;
		}
		
		self.duration = duration;
		self.fps = fps;
	});
};

NJob.prototype = new EventEmitter();

NJob.prototype.run = function() {
	var ffmpeg, self = this;
	
	// Get together our execution parameters
	var params =
		["-i",self.input]
			.concat(
				self.parameters
					.filter(function(param) {
						// Don't want parameters coming through twice.
						// Since we set this parameter as mandatory,
						// remove it from the params if it is present.
						return !String(param).match(/^\-y/i);
					})
			)
			.concat([
				"-y", // Overwrite output files
				self.output
			]);
	
	self.status = self.JOB_PROCESSING;
	self.ffmpeg = ffmpeg = spawn("ffmpeg",params);
	
	var buffer = "";
	ffmpeg.stderr.on("data",function(data) {
		data = data.toString();
		buffer += data;
		if (data.match(/^frame=/i)) {
			
			var components = data.match(/([a-z0-9]+)=\s*([0-9\.kmgptb]+)\s*/ig);
			
			// Die if we didn't get the info we wanted.
			if (!components) return;
			
			var progressData = {};
			
			components.forEach(function(chunk) {
				var chunkParts =
						chunk
							.replace(/\s*/ig,"")
							.split(/=/ig);
				
				progressData[chunkParts[0]] = chunkParts[1];
			});
			
			// Now work out how far through the file we are.
			var totalFrames = self.duration * self.fps;
			self.percentComplete = (progressData.frame / totalFrames)*100;
			
			progressData.percentComplete = self.percentComplete;
			
			self.emit("progress",progressData);
		}
	});
	
	ffmpeg.on("exit",function(code) {
		if (code === 0) {
			self.status = self.JOB_COMPLETE;
			self.emit("complete");
		} else {
			var deathMessage = buffer.substr(buffer.trim().lastIndexOf("\n")+1);
			
			self.status = self.JOB_ERROR;
			self.emit("error",deathMessage,code);
		}
	});
	
	
	process.on("exit",function() {
		ffmpeg.kill();
	});
};

NJob.prototype.stop = function() {
	var self = this;
	
	if (!self.ffmpeg) return true;
	
	self.emit("abort");
	
	// Quit!
	self.ffmpeg.stdin.write("q");
	
	return true;
};

module.exports = NJob;