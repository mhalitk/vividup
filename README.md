# vividup

VImeo VIdeo UPloader helps you to upload your video to Vimeo without needing any other library.

# Installation

Include vividup.js in your page.

`<script src="vividup.js"></script>`

# Usage

Here is a sample usage of some fancy developer uses in his codebase (hopefully). 

```javascript
Vividup.upload({
  url: uploadLinkUrlReturnedFromVimeo,
  file: fileToUpload,
  onProgress: function(progress) {
    updateProgressBarWith(progress.percent);
  },
  onSuccess: function() {
    alert("Upload completed, let's check Vimeo!");
  },
  onError: function(err) {
    doSomeLogging(err.meta);
    sendMailToDeveloper(err.message);
    wakeUpPresidentFor(err.reason);
  }
});
````

# FAQ

## 1. Does vividup create video for me?
No, vividup doesn't create video for you, it just uploads given video file to previously created video url.