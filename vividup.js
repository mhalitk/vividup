(function(window){

function Vividup() {
  this.options = {
    uploadOffset: "0",
    chunkSize: 64*1024
  };
};

/**
 * Starts uploading video to vimeo with given options. If you already started uploading
 * video before this function will capture where it's left and will continue from there.
 * 
 * Video will be split into chunks for uploading, you can specify chunk size with chunkSize
 * option.
 * 
 * If you want to get information about progress you can pass callback function in onProgress
 * option.
 * 
 * 
 * @param {Object} options
 * @param {string} options.url Vimeo video upload url, this is the url video creation API returns
 * @param {File} options.file Video file to upload
 * @param {number} [options.uploadOffset] Upload offset, default value is 0
 * @param {number} [options.chunkSize] Chunk size for video upload, default value is 64KB
 * @param {Function} [options.onSuccess] Callback function that will call when upload complete successfully
 * @param {Function} [options.onError] Callback function that will call if an error occurs
 */
Vividup.prototype.upload = function(opt) {
  this.options = Object.assign(this.options, opt);
  let o = this.options;

  sendVideo(o, handlePatchResult);

  function handlePatchResult(err, result) {
    if (err) {
      if (err === "conflict") {
        updateUploadOffset(o.url, function(uploadOffset) {
          o.uploadOffset = uploadOffset;
          sendVideo(o, handlePatchResult);
        });
      } else {
        callIfFunction(o.onError);
      }
    } else {
      if (result.complete) {
        callIfFunction(o.onSuccess);
      } else {
        o.uploadOffset = result.uploadOffset;
        callIfFunction(o.onProgress, {
          size: o.file.size,
          offset: o.uploadOffset,
          percent: Math.floor((100*o.uploadOffset)/o.file.size)
        });
        sendVideo(o, handlePatchResult);
      }
    }
  }
}

let request = new XMLHttpRequest();
let updateUploadOffset = function(url, cb) {
  request.open("HEAD", url, true);
  request.setRequestHeader("Tus-Resumable", "1.0.0");
  request.onreadystatechange = function() {
    if (request.readyState === 4) {
      if (request.status === 200) {
        cb(parseInt(request.getResponseHeader("upload-offset")));
      } else {
        updateUploadOffset(cb);
      }
    }
  }
  request.send();
}

let callIfFunction = function(f, args) {
  if (f instanceof Function) {
    f.call(this, args);
  }
}

let sendVideo = function(o, cb) {
  let request = new XMLHttpRequest();

  request.open("PATCH", o.url, true);
  request.setRequestHeader("Tus-Resumable", "1.0.0");
  request.setRequestHeader("Content-Type", "application/offset+octet-stream");
  request.setRequestHeader("Upload-Offset", o.uploadOffset);

  request.onreadystatechange = function() {
    if (request.readyState === 4) {
      if (request.status === 200 || request.status === 204) {
        let newUploadOffset = parseInt(request.getResponseHeader("upload-offset"));
        cb(null, {
          uploadOffset: newUploadOffset,
          complete: newUploadOffset === o.file.size
        });
      } else if (request.status === 409) {
        cb("conflict");
      } else {
        cb("error");
      }
    }
  };

  request.send(o.file.slice(o.uploadOffset, o.uploadOffset+o.chunkSize));
}

window.Vividup = new Vividup();

})(window);