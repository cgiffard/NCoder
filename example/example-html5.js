#!/usr/bin/env node

var NCoder		= require("../"),
	ProgressBar	= require('progress'),
	ncoder		= new NCoder(),
	barText		= "Encoding [:bar] :percent :elapseds elapsed/:etas remaining";

var myFile = "/Users/cgiffard/Development/Projects/Vixen/30707792.mp4";

var encodeSettings = {
	
	"240": {
		"videoWidth":426,
		"videoHeight":240,
		"videoBitRate":"512k",
		"audioBitRate":"96k"
	},
	
	"360": {
		"videoWidth":640,
		"videoHeight":360,
		"videoBitRate":"1024k",
		"audioBitRate":"128k"
	},
	
	"576": {
		"videoWidth":1024,
		"videoHeight":576,
		"videoBitRate":"1536k",
		"audioBitRate":"160k"
	},
	
	"720": {
		"videoWidth":1280,
		"videoHeight":720,
		"videoBitRate":"3072k",
		"audioBitRate":"160k"
	},
	
	"1080": {
		"videoWidth":1920,
		"videoHeight":1080,
		"videoBitRate":"4608k",
		"audioBitRate":"256k"
	}
};

function runEncode(maxResolution,callback) {
	
	[240,360,576,720,1080]
		.forEach(function(res) {
			
		["mp4","webm"].forEach(function(codec) {
			
			if (res > maxResolution) return;
			
			var outF = res + "p." + codec;
			
			var job =
				ncoder[codec]
					.call(ncoder,
						myFile,
						outF,
						encodeSettings[res]
					);
			
			job.on("error",function(message,code) {
				console.log("Job died with error:",message);
			});
		});
		
	});
	
	// Build a progress bar based on the number of jobs...
	var progressBar = new ProgressBar(barText, { total: 1000, width: 50 }),
		previousPerc = 0;
	
	ncoder.queue.on("progress",function(data) {
		floorPerc = Math.floor(data.percentComplete*10);
	
		while (floorPerc > previousPerc) {
			progressBar.tick();
			previousPerc ++;
		}
	});
	
	ncoder.queue.on("complete",function() {
		console.log("Queue Complete");
	});
	
	console.log(
		"Processing %d jobs to a maximum resolution of %dp.",
		ncoder.queue.length,
		maxResolution);
	
	ncoder.queue.run();
}

ncoder.metadata(myFile,function(meta) {
	
	// The resolution (in lines) of the video file.
	// The source will not be encoded up beyond it. (Waste of resources!)
	
	maxResolution = 0;
	
	if (meta.inputs) {
		meta.inputs.forEach(function(input) {
			if (input.streams) {
				input.streams.forEach(function(stream) {
					if (stream.yResolution &&
						stream.yResolution > maxResolution) {
						maxResolution = stream.yResolution;
					}
				});
			}
		});
	}
	
	runEncode(maxResolution,function() {
		console.log("Encode complete!");
		process.exit(0);
	});
});