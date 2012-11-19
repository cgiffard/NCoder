#!/usr/bin/env node

var NCoder = require("../"),
	ProgressBar = require('progress'),
	myEnc = new NCoder(),
	progressBar = new ProgressBar('Encoding [:bar] :percent :elapseds elapsed/:etas remaining', { total: 1000, width: 50 });


var myFile = "/Users/cgiffard/Development/Projects/Vixen/30707792.mp4",
	myOutput = "./out.ogv";

var job =
	myEnc.ogv(
		myFile,
		myOutput,
		{
			"videoWidth":640,
			"videoHeight":360,
			"videoBitRate":"1024k",
			"audioBitRate":"128k"
		});

var previousPerc = 0;
job.on("progress",function(data) {
	floorPerc = Math.floor(data.percentComplete*10);

	while (floorPerc > previousPerc) {
		progressBar.tick();
		previousPerc ++;
	}
});

job.on("error",function(message,code) {
	console.log("Died:",message);
	process.exit(0);
});

job.on("complete",function(data) {
	console.log("\nJob complete.");
	process.exit(0);
});

job.run();