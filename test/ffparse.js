var chai = require("chai");
	expect = chai.expect;
	

describe("FFParse",function() {
	
	var NCoder = require("../");
		testEnc = new NCoder();
	
	var testFile = "/Users/cgiffard/Development/Projects/Vixen/30707792.mp4"
	
	it("should be able to wrap ffmpeg and extract data from it",function(done) {
		
		
		testEnc.metadata(testFile,function(metadata) {
		
			console.log(metadata.inputs[0]);
			done();
		});
	});
	
})