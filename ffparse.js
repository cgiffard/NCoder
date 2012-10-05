// Little parser for FFMpeg

const	FF_UNINITIALISED	= 0,
		FF_BUILDINFO		= 1,
		FF_STREAMINFO		= 2,
		FF_STREAMMETA		= 3;


module.exports = function FFParser(ffchild) {
	// 
	this.inputs		= [];
	this.outputs	= [];
	this.progress	= 0;
	
	this._outputData = "";
	
	ffchild.stderr.on("data",this.parse.bind(this));
	ffchild.stdout.on("data",this.parse.bind(this));
};

module.exports.prototype.parse = function(data) {
	this.outputData += data;
	
	
	
};

module.exports.prototype.parseLine = function() {
	
};



// FFINPUT