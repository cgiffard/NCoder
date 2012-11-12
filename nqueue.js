// NCoder Job Queue

var NCoder	= require("./ncoder.js"),
	NJob	= require("./njob.js");

var NQueue = function NQueue(ncoder) {
	this.ncoder = ncoder;
};

NQueue.prototye = new Array();

NQueue.prototype.addJob = function(job,priority) {
	var self = this;
	
	if (!job || !(job instanceof NJob))
		throw new Error("Not a valid job.");
	
	if (priority !== undefined)
		job.priority = priority;
	
	job.on("complete",function() {
		self.monitor();
	});
	
	return self;
};

NQueue.prototype.getNextJob = function() {
	var self = this,
		jobIndex = 0,
		jobMaxIndex = 0,
		jobMaxPriority = -Infinity;
	
	for (jobIndex; jobIndex < self.length; jobIndex++) {
		if (self[jobIndex].priority > jobMaxPriority) {
			jobMaxIndex = jobIndex;
			jobMaxPriority = self[jobIndex].priority;
		}
	}
	
	if (jobMaxPriority > -Infinity)
		return self[jobMaxIndex];
	
	return null;
};

NQueue.prototype.monitor = function() {
	
};

NQueue.prototype.run = function() {
	
};

NQueue.prototype.stop = function() {
	
};

module.exports = NQueue;