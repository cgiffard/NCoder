// NCoder Job Queue

var NCoder			= require("./ncoder.js"),
	NJob			= require("./njob.js"),
	EventEmitter	= require("events").EventEmitter;

var NQueue = function NQueue(ncoder) {
	this.ncoder = ncoder;
};

NQueue.prototype = new Array();

// Now, hackishly mix the array proto with the EventEmitter proto...
var evt = new EventEmitter(), prop;
for (prop in evt.__proto__) {
	NQueue.prototype[prop] = evt.__proto__[prop];
}

// Now add our own functions...

NQueue.prototype.addJob = function(job,priority) {
	var self = this;
	
	if (!job || !(job instanceof NJob))
		throw new Error("Not a valid job.");
	
	if (priority !== undefined)
		job.priority = priority;
	
	job.on("complete",function() {
		self.monitor(job);
	});
	
	job.on("progress",function() {
		self.monitor(job);
	});
	
	self.push(job);
	
	return self;
};

NQueue.prototype.getNextJob = function() {
	var self = this,
		jobIndex = 0,
		jobMaxIndex = 0,
		jobMaxPriority = -Infinity;
	
	for (jobIndex; jobIndex < self.length; jobIndex++) {
		if (self[jobIndex].status !== self[jobIndex].JOB_PENDING)
			continue;
		
		if (self[jobIndex].priority > jobMaxPriority) {
			jobMaxIndex = jobIndex;
			jobMaxPriority = self[jobIndex].priority;
		}
	}
	
	if (jobMaxPriority > -Infinity)
		return self[jobMaxIndex];
	
	return null;
};

NQueue.prototype.getAggregateProgress = function() {
	var self = this,
		jobIndex = 0,
		jobCount = self.length,
		aggregateProgress = 0;
	
	for (jobIndex; jobIndex < self.length; jobIndex++) {
		
		if (self[jobIndex].status === self[jobIndex].JOB_PENDING)
			continue;
			
		if (self[jobIndex].status === self[jobIndex].JOB_PROCESSING) {
			aggregateProgress += self[jobIndex].percentComplete;
			
		} else {
			
			// Job complete or died with errors
			aggregateProgress += 100;
		}
	}
	
	if (!aggregateProgress) return 0;
	
	if (aggregateProgress / jobCount < Infinity &&
		!isNaN(aggregateProgress / jobCount)) {
		
		return aggregateProgress / jobCount;
	} else {
		
		return 0;
	}
};

NQueue.prototype.monitor = function(job) {
	var nextJob, self = this;
	
	if (job.status === job.JOB_COMPLETE ||
		job.status === job.JOB_ERROR) {
		
		if ((nextJob = self.getNextJob())) {
			
			nextJob.run();
			
		} else {
			
			// There's no next job!
			self.emit("complete");
		}
		
	} else {
		self.emit("progress",{"percentComplete":this.getAggregateProgress()});
	}
};

NQueue.prototype.run = function() {
	var nextJob = this.getNextJob();
	if (nextJob) nextJob.run();
	return this;
};

NQueue.prototype.stop = function() {
	this.forEach(function(job) {
		job.stop();
	});
	
	self.emit("stopped");
};

module.exports = NQueue;