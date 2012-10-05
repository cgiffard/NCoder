// NCoder Job Queue

var NCoder	= require("./ncoder.js"),
	NJob	= require("./njob.js");

var NQueue = function NQueue(ncoder) {
	this.ncoder = ncoder;
};

NQueue.prototye = new Array();

NQueue.prototype.add = function() {

};

module.exports = NQueue;