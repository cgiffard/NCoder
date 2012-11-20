#!/usr/bin/env node

var NCoder = require("../");
	myEnc = new NCoder();


var myFile = process.argv.pop();

myEnc.metadata(myFile,function(metadata) {
	
	console.log(metadata.inputs[0]);
	
});