(function(window){

function Vividup() {
  this.options = {
    uploadOffset: "0"
  };
};

/**
 * Starts uploading video to vimeo with given options. If you already started uploading
 * video before this function will capture where it's left and will continue from there.
 * 
 * If you want to get information about progress you can pass callback function in onProgress
 * option.
 * 
 * @param {Object} options
 * @param {string} options.url Vimeo video upload url, this is the url video creation API returns
 * @param {File} options.file Video file to upload
 * @param {number} [options.uploadOffset] Upload offset, default value is 0
 * @param {Function} [options.onSuccess] Callback function that will call when upload complete successfully
 * @param {Function} [options.onError] Callback function that will call if an error occurs
 */
Vividup.prototype.upload = function(opt) {
  this.options = Object.assign(this.options, opt);
  let o = this.options;

  sendVideo(o, handleProgress, handlePatchResult);

  function handlePatchResult(err, result) {
    if (err) {
      if (err.reason === "conflict") {
        updateUploadOffset(o.url, function(uploadOffset) {
          o.uploadOffset = uploadOffset;
          sendVideo(o, handleProgress, handlePatchResult);
        });
      } else {
        callIfFunction(o.onError, err);
      }
    } else {
      if (result.complete) {
        callIfFunction(o.onSuccess);
      } else {
        o.uploadOffset = result.uploadOffset;
        sendVideo(o, handleProgress, handlePatchResult);
      }
    }
  }

  function handleProgress(progress) {
    callIfFunction(o.onProgress, {
      size: progress.size,
      offset: progress.offset,
      percent: Math.floor(progress.percent)
    });
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

let sendVideo = function(o, onProgress, cb) {
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
        cb({
          status: "error",
          reason: "conflict"
        });
      } else {
        cb({
          status: "error",
          reason: "Unexpected status code",
          message: "Vimeo server returned " + request.status + " status code " +
                   " while uploading video. You may want to try again.",
          meta: {
            url: o.url,
            uploadOffset: o.uploadOffset
          }
        });
      }
    }
  };

  request.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      onProgress({
        size: e.total,
        offset: e.loaded,
        percent: (e.loaded/e.total) * 100
      });
    }
  };

  request.send(o.file);
}

window.Vividup = new Vividup();

})(window);