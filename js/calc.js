self.onmessage = function(e){

	var brot = e.data;
	var pixelH = ((brot.cyMax - brot.cyMin) / brot.height);
	var pixelW = ((brot.cxMax - brot.cxMin) / brot.width);
	var gy,gx;
	for (var y = 0; y < brot.height; y++) {
		gy = brot.cyMin + y * pixelH;
		for (var x = 0; x < brot.width; x++) {
			gx = brot.cxMin + x * pixelW;

			var i = 0, zx = 0.0, zy = 0.0, zx2 = 0.0, zy2 = 0.0;
			for (; i < brot.maxI && zx2 + zy2 < 4; i++) {
				zy = 2 * zx * zy + gy;
				zx = zx2 - zy2 + gx;
				zx2 = zx * zx;
				zy2 = zy * zy;
			}

			var inSet = (i == brot.maxI);
			var pixel = ((y * brot.width) + x) * 4;

			if (!inSet) {
				brot.imgData.data[pixel  ] = (i * 50) % 256;
				brot.imgData.data[pixel + 1] = (i * 30) % 256;
				brot.imgData.data[pixel + 2] = (i * 40) % 256;
				brot.imgData.data[pixel + 3] = 256;
			} else {
				brot.imgData.data[pixel  ] = (zx2 * brot.width) % 256;
				brot.imgData.data[pixel + 1] = (zy2 * brot.height) % 256;
				brot.imgData.data[pixel + 2] = ((zy2 * zx2 / 2) * (brot.width * brot.height / 2)) % 256;
				brot.imgData.data[pixel + 3] = 256;
			}

		}

	}
	self.postMessage(brot)

};



self.onerror = function (message) {
	log('worker error');
};

function log(msg) {
	var object = {
		type: 'debug',
		msg: msg + ' [' + Date.now() + ']'
	};
	self.postMessage(object);
}
