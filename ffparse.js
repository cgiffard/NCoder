// Little parser for FFMpeg

var EventEmitter = require("events").EventEmitter;

const	FF_UNINITIALISED	= 0,
		FF_BUILDINFO		= 1,
		FF_INFOWAITING		= 2,
		FF_STREAMWAITING	= 3,
		FF_STREAMINFO		= 4,
		FF_STREAMMETA		= 5,
		FF_STREAMDURATION	= 6;

// My build of ffmpeg outputs two space tabs. Yours may differ.
const	FF_INDENT_TOKEN		= "  ";


var FFParser = function(ffchild) {
	var self = this;
	
	// Externally accessible properties
	self.inputs		= [];
	self.outputs	= [];
	self.progress	= 0;
	self.status		= 0;
	
	// Managing the parser!
	self._outputBuffer = "";
	self._outputLines = [];
	self._cleanLines = [];
	self._lineIndex = 0;
	self._status = FF_UNINITIALISED;
	self._currentInput = null;
	self._currentStream = null;
	self._currentOutput = null;
	
	ffchild.stderr.on("data",self.parse.bind(self));
	ffchild.stdout.on("data",self.parse.bind(self));
	
	ffchild.on("exit",function() {
		if (self._outputBuffer.length) {
			self._lineIndex ++;
			self._outputLines.push(self._outputBuffer);
			self.parseLine(self._outputBuffer);
			self._outputBuffer = "";
		}
		
		self.emit("parsecomplete",self);
	});
	
	self.emit("init",self);
};

// Emit events!
FFParser.prototype = new EventEmitter;

// Split input, buffer by line.
// Then call parse on each line.
FFParser.prototype.parse = function(data) {
	data = data.toString();
	
	var self			= this,
		endsWithNewline	= data.match(/[\r\n]$/),
		lines			= data.split(/[\r\n]/ig);
	
	self.emit("chunkparse",data);
	
	// If there's something in the output buffer, prepend it to the first line.
	if (self._outputBuffer.length) {
		lines[0] = self._outputBuffer + lines[0];
	}
	
	// The last chunk might be part of more data to come.
	// Buffer it and remove it from the line list.
	
	if (!endsWithNewline) {
		self._outputBuffer = lines.pop();
	}
	
	// Now we have our lines from this chunk, concat them to the global store.
	if (lines.length) {
		self._outputLines = self._outputLines.concat(lines);
	}
	
	while (self._lineIndex < self._outputLines.length) {
		self.parseLine(self._outputLines[self._lineIndex]);
		self._lineIndex ++;
	}
	
	return self;
};

FFParser.prototype.parseLine = function(lineData) {
	var self = this;
	
	self.emit("lineparse",lineData);
	
	// First we test how much indentaton we're dealing with.
	var indentation = 0,
		indentRE = new RegExp("^" + FF_INDENT_TOKEN);
	
	while (indentRE.exec(lineData)) {
		lineData = lineData.substr(FF_INDENT_TOKEN.length);
		indentation ++
	}
	
	var procedureData, procedureName = "";
	if ((procedureData = lineData.match(/^([a-z0-9\-_]+)\s*\:*/i)) &&
							lineData.match(/\:/g)) {
		
		procedureName = procedureData[1];
		lineData = lineData.substr(procedureName.length);
	}
	
	
	switch (self.status) {
		
		case FF_UNINITIALISED:
			
			if (lineData.match(/^ffmpeg version/i))
				self.status = FF_BUILDINFO;
			
			break;
			
		case FF_BUILDINFO:
		
			if (lineData.length === 0 || lineData.match(/^\s+$/))
				self.status = FF_INFOWAITING;
			
			break;
		
		case FF_INFOWAITING:
		
			if (procedureName === "Input") {
				
				self.inputs.push(
					self._currentInput = new FFInput(lineData)
				);
				
				self.status = FF_STREAMWAITING;
				
			} else {
				throw new Error("Unrecognised procedure name.");
			}
			
			break;
		
		case FF_STREAMWAITING:
		
			console.log(procedureName,lineData);
		
		default:
			console.log(procedureName,lineData);
			throw new Error("Unrecognised parser status!");
	}
	
	// lineData
	
	// console.log(procedureName);
	// console.log(lineData);
	
	return self;
};


// FFINPUT
function FFInput(initData) {
	var self = this;
	
	if (!initData || !initData.length)
		throw new Error("Input initialisation data must be provided.");
	
	self.streams	= [];
	self.index		= 0;
	self.codecs		= []; // codecs supported by this container
	self.sourceFile	= "";
	
	var initParts = initData.split(/\s+from\s+'/i);
	
	self.sourceFile = initParts[1].replace(/\s*'\s*:\s*$/,"");
	
	initParts = initParts[0].split(/,\s+/i);
	
	self.index = parseInt(initParts[0].replace(/\D/g,""),10);
	
	self.codecs =
		initParts[1]
			.replace(/[^a-z0-9\,]/ig,"")
			.split(/,/g)
			.filter(function(item) {
				return item && item.length;
			});
	
	console.log(initParts);
	console.log(self.sourceFile);
	console.log(self.codecs);
	
	console.log("index was",self.index);
};


module.exports = FFParser;