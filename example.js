var NCoder = require("./");
	myEnc = new NCoder();


var myFile = "/Users/cgiffard/Development/Projects/Vixen/30707792.mp4"

myEnc.metadata(myFile,console.log.bind(console));