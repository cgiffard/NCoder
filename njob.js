// Wrapper for NCode jobs

var NCoder			= require("./ncoder.js"),
	NQueue			= require("./nqueue.js"),
	EventEmitter	= require("events").EventEmitter;

var NJob = function NJob(input,output,parameters) {
	this.input		= input;
	this.output		= output ? output : input + ".out";
	this.parameters	= parameters;
};


module.exports = NJob;