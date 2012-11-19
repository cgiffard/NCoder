// Little parser for FFMpeg
var fs = require("fs");
var EventEmitter = require("events").EventEmitter;

const	FF_UNINITIALISED	= 0,
		FF_BUILDINFO		= 1,
		FF_INFOWAITING		= 2,
		FF_METAWAITING		= 3,
		FF_INPUTMETA		= 4,
		FF_STREAMWAITING	= 5,
		FF_STREAMINFO		= 6,
		FF_STREAMMETA		= 7,
		FF_STREAMDURATION	= 8,
		FF_OUTPUTWAITING	= 9,
		FF_STREAMMAPPING	= 10,
		FF_PROGRESS			= 11;

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
	self._debugLines	= [];
	self._outputBuffer	= "";
	self._outputLines	= [];
	self._lineIndex		= 0;
	self._status		= FF_UNINITIALISED;
	self._currentInput	= null;
	self._currentStream	= null;
	self._currentOutput	= null;
	self._previousIndentation = 0;
	
	ffchild.stderr.on("data",self.parse.bind(self));
	// ffchild.stdout.on("data",self.parse.bind(self));
	
	ffchild.stderr.on("end",function() {
		if (self._outputBuffer.length) {
			self._lineIndex ++;
			self._outputLines.push(self._outputBuffer);
			self.parseLine(self._outputBuffer);
		}
		
		// Delete all the private variables now we're done...
		for (var key in self) {
			if (self.hasOwnProperty(key) &&
				key !== "_events" &&
				key.match(/^\_/)) {
				
				delete self[key];
			}
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
	var origData = lineData;
	
	self.emit("lineparse",lineData);
	
	// Is this a debug message?
	if (lineData.match(/^\s*\[[a-z0-9\-\_]+\s*\@\s*0x[a-f0-9]+\]/ig)) {
		self.emit("debug",lineData)
		self._debugLines.push(lineData);
		return;
	}
	
	if (lineData.match(/^\s*Output\s*#\d+,/i)) {
		self.status = FF_OUTPUTWAITING;
	}
	
	// Check this isn't a junky error message
	if (lineData.match(/At least one/i)) return;
	
	// First we test how much indentaton we're dealing with.
	var indentation = 0,
		indentRE = new RegExp("^" + FF_INDENT_TOKEN);
	
	while (indentRE.exec(lineData)) {
		lineData = lineData.substr(FF_INDENT_TOKEN.length);
		indentation ++
	}
	
	var procedureData, procedureName = "";
	if ((procedureData = lineData.match(/^([a-z0-9\-_]+)\s*\:*.+/i)) &&
							lineData.match(/\:/g)) {
		
		procedureName = procedureData[1];
		lineData = lineData.substr(procedureName.length);
	}
	
	if (indentation < self._previousIndentation) {
		
		if (self.status === FF_INPUTMETA ||
			self.status === FF_STREAMMETA) {
			
			self.status = FF_STREAMWAITING;
		}
		
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
				
				self.status = FF_METAWAITING;
			
			} else if (lineData.match(/^\s*lib[a-z0-9]+/)) {
				
				// Whoops, still in the build info block.
				self.status = FF_BUILDINFO;
				
			} else {
				// console.log("UNEXPECTED ERROR",self.status);
				// console.log(origData);
				return;
			}
			
			break;
		
		case FF_METAWAITING:
			
			if (procedureName === "Metadata") {
				self.status = FF_INPUTMETA;
			
			// If we've got an unexpected procedure name and the line isn't blank
			} else if ((procedureName+lineData).replace(/\s+/ig,"").length) {
				
				// console.log("UNEXPECTED ERROR",self.status);
				// console.log(origData);
				return;
			}
			
			break;
		
		case FF_INPUTMETA:
			
			procedureName = camel(procedureName);
			
			self._currentInput.metadata[procedureName] =
				trim(lineData.replace(/^\s*:/g,""));
			
			break;
		
		case FF_STREAMWAITING:
			
			if (procedureName === "Duration") {
				
				self._currentInput.processDurationString(lineData);
				
			} else if (procedureName === "Stream") {
				
				self._currentInput.streams.push(
					self._currentStream = new FFStream(lineData)
				);
				
				self.status = FF_STREAMINFO;
			
			// If we've got an unexpected procedure name and the line isn't blank
			} else if ((procedureName+lineData).replace(/\s+/g,"").length) {
				// console.log("UNEXPECTED ERROR",self.status);
				// console.log(origData);
				return;
			}
			
			break;
			
		case FF_STREAMINFO:
		
			if (procedureName === "Metadata") {
				self.status = FF_STREAMMETA;
			
			// If we've got an unexpected procedure name and the line isn't blank
			} else if ((procedureName+lineData).replace(/\s+/ig,"").length) {
				// console.log("UNEXPECTED ERROR",self.status);
				// console.log(origData);
				return;
			}
			
			break;
		
		case FF_STREAMMETA:
			
			procedureName = camel(procedureName);
			
			self._currentStream.metadata[procedureName] =
				trim(lineData.replace(/^\s*:/g,""));
			
			break;
			
		case FF_OUTPUTWAITING:
			
			
			break;
			
		default:
			throw new Error("Unrecognised parser status!");
	}
	
	self._previousIndentation = indentation;
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
	self.metadata	= {};
	self.duration	= 0;
	self.bitRate	= 0;
	self.offset		= 0;
	
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
};

FFInput.prototype.processDurationString = function(duration) {
	var self = this,
		durationParts = duration.split(/,\s+/ig),
		duration = durationParts.shift().replace(/\s*:\s+/ig,"");
	
	durationParts.forEach(function(part) {
		var components = part.split(/:\s+/ig),
			metaname = components.shift(),
			metaval = components.pop();
		
		if (metaname === "start") {
			self.offset = parseFloat(metaval);
			
		} else if (metaname === "bitrate") {
			
			self.bitRate = deduceBitRate(metaval);
		}
		
	});
	
	durationParts = duration.split(/:/ig);
	duration = 0;
	
	durationParts.reverse().forEach(function(part,index) {
		part = part.replace(/[^\d\.]/ig,"");
		duration += parseFloat(part) * (index ? Math.pow(60,index) : 1);
	});
	
	self.duration = duration;
	
	return self;
};

// FFStream

function FFStream(initData) {
	var self = this;
	
	if (!initData || !initData.length)
		throw new Error("Input initialisation data must be provided.");
	
	self.index				= 0;
	self.kind				= "video";
	self.language			= undefined;
	self.codec				= "";
	self.codecDetail		= "";
	self.bitRate			= 0;
	self.metadata			= {};
	
	var initParts =
		initData.match(/\s*#\d:(\d+)(\(([a-zA-Z\-]+)\))\:\s*(Video|Audio)\s*:\s*(.*)/);
	
	if (!initParts) {
		// console.log(initData);
		throw new Error("Invalid stream initialisation string!");
	}
	
	var streamDetail = [].slice.call(initParts,0).pop(),
		streamDetailParts = streamDetail.split(/,\s+/g);
	
	if (initParts[1])
		self.index = parseInt(initParts[1],10);
	
	if (initParts[3] && initParts[3] !== "und")
		self.language = initParts[3];
	
	if (initParts[4])
		self.kind = initParts[4].toLowerCase();
		
	if (self.kind === "video") {
		
		self.xResolution		= 0;
		self.yResolution		= 0;
		self.aspectRatio		= "";
		self.pixelAspectRatio	= "";
		self.fps				= 0;
		self.tbn				= 0;
		self.tbc				= 0;
		self.tbr				= 0;
		
	} else if (self.kind === "audio") {
		
		self.sampleRate			= 0;
		self.bitDepth			= 0;
		self.channelCount		= 0;
		
	}
	
	streamDetailParts.forEach(function(part,index) {
		
		// Codec information comes first...
		if (index === 0) {
			var codecData = part.split(/\s+/);
			
			self.codec = codecData.shift();
			self.codecDetail = codecData.join(" ");
			
		}
		
		// Just sticking the colourspace data into the codecDetail for now.
		if (self.kind === "video" && index === 1 && part.match(/^[a-z0-9]+$/i)) {
			
			if (self.codecDetail.length)
				self.codecDetail += " ";
			
			self.codecDetail += part;
		}
		
		var resolutionComponents;
		if (resolutionComponents = part.match(/^\s*(\d+)x(\d+)\s*(\[([SD]AR\s*(\d+:\d+))\s*([SD]AR\s*(\d+:\d+))?\])?/i)) {
			
			if (resolutionComponents[1])
				self.xResolution = parseInt(resolutionComponents[1],10);
			
			if (resolutionComponents[2])
				self.yResolution = parseInt(resolutionComponents[2],10);
			
			// We have aspect ratio data...
			if (resolutionComponents[3] && resolutionComponents[3].length) {
				
				if (resolutionComponents[5]) {
					if (resolutionComponents[4].match(/sar/i)) {
						self.pixelAspectRatio = trim(resolutionComponents[5]);
					} else {
						self.aspectRatio = trim(resolutionComponents[5]);
					}
				}
				
				if (resolutionComponents[7]) {
					if (resolutionComponents[6].match(/sar/i)) {
						self.pixelAspectRatio = trim(resolutionComponents[7]);
					} else {
						self.aspectRatio = trim(resolutionComponents[7]);
					}
				}
				
			}
		}
		
		if (part.match(/^\d+\s*[kmg]b\/s/)) {
			self.bitRate = deduceBitRate(part);
		}
		
		if (part.match(/^\s*[\d\.]+\s+fps/i)) {
			self.fps = parseFloat(part.replace(/[^\d\.]/g,""));
		}
		
		if (part.match(/^\s*[\d\.]+\s+tbr/i)) {
			self.tbr = parseFloat(part.replace(/[^\d\.]/g,""));
		}
		
		if (part.match(/^\s*[\d\.kmb]+\s+tbn/i)) {
			self.tbn = part.replace(/[^\d\.km]+/g,"");
		}
		
		if (part.match(/^\s*[\d\.]+\s+tbc/i)) {
			self.tbc = parseFloat(part.replace(/[^\d\.]/g,""));
		}
		
		// Some dedicated stuff for audio...
		if (part.match(/stereo/i))
			self.channelCount = 2;
		
		if (part.match(/mono/i))
			self.channelCount = 1;
		
		if (trim(part).match(/^s\d+$/)) {
			self.bitDepth = parseInt(trim(part).replace(/\D/,""),10);
		}
		
		if (trim(part).match(/^\d{4,7} K?Hz$/)) {
			self.sampleRate = parseInt(trim(part).replace(/\D/,""),10);
		}
		
	});
	
	
}

function trim(input) {
	return input.replace(/^\s+/,"").replace(/\s+$/,"");
}

function camel(input) {
	return input
			.split(/\_/ig)
			.map(function(item,index) {
				if (!index) return item;
				
				item =
					item.substr(0,1).toUpperCase() +
					item.substr(1);
				
				return item;
			})
			.join("");
}

function deduceBitRate(input) {
	var bitparts = input.split(/\s+/ig),
		multiplier = 1,
		scale = bitparts.pop().replace(/\s*/ig,"");
	
	if (scale === "kb/s") multiplier = 1024;
	if (scale === "mb/s") multiplier = 1024 * 1024;
	if (scale === "gb/s") multiplier = 1024 * 1024 * 1024;
	
	return parseFloat(bitparts.join("")) * multiplier;
}


module.exports = FFParser;