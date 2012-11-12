#!/usr/bin/env node

var NCoder = require("./"),
	ProgressBar = require('progress'),
	myEnc = new NCoder(),
	progressBar = new ProgressBar('Encoding [:bar] :percent :elapseds elapsed/:etas remaining', { total: 1000, width: 50 });


var myFile = "/Users/cgiffard/Development/Projects/Vixen/30707792.mp4",
	myOutput = "./out.mp4";

var job = myEnc.h264(myFile,myOutput,{"videoWidth":640,"videoHeight":360,"videoBitRate":"1000k"});

var previousPerc = 0;
job.on("progress",function(data) {
	if ((data.percentComplete*10|0) > previousPerc) {
		progressBar.tick();
		previousPerc = data.percentComplete*10|0;
		
		console.log(data.percentComplete);
	}
})

job.run();

job.on("complete",function(data) {
	console.log("\nJob complete. Looks like we beat the death timer.");
	process.exit(0);
});

// setTimeout(function() {
// 	job.stop();
// 	process.exit(0);
// },100000);