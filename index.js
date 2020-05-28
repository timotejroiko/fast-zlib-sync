let zlib = require("zlib");
let methods = ["Inflate","Deflate","InflateRaw","DeflateRaw","Gzip","Gunzip","Unzip","BrotliDecompress","BrotliCompress"];

function lib(method,options = {}) {
	method = method.toString();
	method = method[0].toUpperCase() + method.substr(1);
	if(!methods.includes(method)) { throw new Error("invalid or unsupported zlib class"); }
	let brotli = method.startsWith("Brotli");
	if(!Number.isInteger(options.flush)) { options.flush = brotli ? zlib.constants.BROTLI_OPERATION_FLUSH : zlib.constants.Z_SYNC_FLUSH; }
	let z = new zlib[method](options);
	let handle = z._handle;
	let handleClose = z._handle.close;
	let close = z.close;
	let buffer = [];
	let d = (data,f) => {
		if(f !== true) {
			if(!Buffer.isBuffer(data)) { data = Buffer.from(data); }
			if(!Number.isInteger(f)) { f = z._defaultFlushFlag; }
		}
		z._handle.close = () => {};
		z.close = () => {};
		let result;
		let error;
		try {
			result = z._processChunk(data, f);
		} catch(e) {
			error = e;
		} finally {
			z._handle = handle;
			z._handle.close = handleClose;
			z.close = close;
			z.removeAllListeners("error");
			if(error) {
				z.reset();
				throw error;
			}
		}
		if(f !== true) {
			result = Buffer.from(result)
			if(f === (brotli ? zlib.constants.BROTLI_OPERATION_PROCESS : zlib.constants.Z_NO_FLUSH)) {
				if(result.length) {
					buffer.push(result);
					return Buffer.allocUnsafe(0);
				}
			} else if(buffer.length) {
				buffer.push(result);
				result = Buffer.concat(buffer);
				buffer = [];
			}
		}
		return result;
	}
	d.zlib = z;
	return d;
}

lib.constants = zlib.constants;
lib.constants.Z_SYNC_FLUSH_UNSAFE = true;

module.exports = lib;