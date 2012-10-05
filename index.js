// NCoder 0.0.1
// 2012 Christopher Giffard

var NCoder	= require("./ncoder.js"),
	NQueue	= require("./nqueue.js"),
	NJob	= require("./njob.js");

NCoder.NJob = NJob;
NCoder.NQueue = NQueue;
module.exports = NCoder;