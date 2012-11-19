#!/usr/bin/env node

var NCoder = require("../");
	myEnc = new NCoder();


var myFile = "/Users/cgiffard/Development/Projects/Vixen/30707792.mp4";

myEnc.metadata(myFile,function(metadata) {
	
	console.log(metadata.inputs[0]);
	
});