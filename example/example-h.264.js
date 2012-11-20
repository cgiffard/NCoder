#!/usr/bin/env node

var NCoder = require("../"),
	ProgressBar = require('progress'),
	myEnc = new NCoder(),
	progressBar = new ProgressBar('Encoding [:bar] :percent :elapseds elapsed/:etas remaining', { total: 1000, width: 50 });


var myFile = process.argv.pop(),
	myOutput = "./out.mp4";

var job =
	myEnc.mp4(
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