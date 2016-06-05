const DiffCamEngine = (function() {
	let stream;					// stream obtained from webcam
	let video;					// shows stream
	let captureCanvas;			// internal canvas for capturing full images from video
	let captureContext;			// context for capture canvas
	let diffCanvas;				// internal canvas for diffing downscaled captures
	let diffContext;			// context for diff canvas
	let motionCanvas;			// receives processed diff images
	let motionContext;			// context for motion canvas

	let initSuccessCallback;	// called when init succeeds
	let initErrorCallback;		// called when init fails
	let startCompleteCallback;	// called when start is complete
	let captureCallback;		// called when an image has been captured and diffed

	let captureInterval;		// interval for continuous captures
	let captureIntervalTime;	// time between captures, in ms
	let captureWidth;			// full captured image width
	let captureHeight;			// full captured image height
	let diffWidth;				// downscaled width for diff/motion
	let diffHeight;				// downscaled height for diff/motion
	let isReadyToDiff;			// has a previous capture been made to diff against?
	let pixelDiffThreshold;		// min for a pixel to be considered significant
	let scoreThreshold;			// min for an image to be considered significant
	let includeMotionBox;		// flag to calculate and draw motion bounding box
	let includeMotionPixels;	// flag to create object denoting pixels with motion

  const init = ({
    video = document.createElement('video'),
    motionCanvas = document.createElement('canvas'),
    captureIntervalTime = 100,
    captureWidth = 640,
    captureHeight = 480,
    diffWidth = 64,
    diffHeight = 48,
    pixelDiffThreshold = 32,
    scoreThreshold = 16,
    includeMotionBox = false,
    includeMotionPixels = false,
    initSuccessCallback = function() {},
    initErrorCallback = function() {},
    startCompleteCallback = function() {},
    captureCallback = function() {},
  }) => {
    const captureCanvas = document.createElement('canvas');
    const diffCanvas = document.createElement('canvas');
    const isReadyToDiff = false;
    video.autoplay = true;
    captureCanvas.width = captureWidth;
    captureCanvas.height = captureHeight;
    captureContext = captureCanvas.getContext('2d');
    diffCanvas.width = diffWidth;
    diffCanvas.height = diffHeight;
    diffContext = diffCanvas.getContext('2d');
    motionCanvas.width = diffWidth;
    motionCanvas.height = diffHeight;
    motionContext = motionCanvas.getContext('2d');
    requestWebcam();
  }

  const requestWebcam = () => navigator.mediaDevices.getUserMedia({
    audio: false, 
    video: { width: captureWidth, height: captureHeight },
  })
  .then(initSuccess)
  .catch(initError);

	const initSuccess = requestedStream => {
    stream = requestedStream;
    initSuccessCallback();
  }

	const initError = error => {
    console.log(error);
    initErrorCallback();
  }

  const start = {
    if (!stream) throw 'Cannot start after init fail';
    video.addEventListener('canplay', startComplete);
    video.srcObject = stream;
  }

  const startComplete = {
    video.removeEventListener('canplay', startComplete);
    captureInterval = setInterval(capture, captureIntervalTime);
    startCompleteCallback();
  }

  const stop = {
    clearInterval(captureInterval);
    video.src = '';
    motionContext.clearRect(0, 0, diffWidth, diffHeight);
    isReadyToDiff = false;
  }

  const capture = () => {
    captureContext.drawImage(video, 0, 0, captureWidth, captureHeight);
    const captureImageData = captureContext.getImageData(0, 0, captureWidth, captureHeight);
    diffContext.globalCompositeOperation = 'difference';
    diffContext.drawImage(video, 0, 0, diffWidth, diffHeight);
    const diffImageData = diffContext.getImageData(0, 0, diffWidth, diffHeight);
    if (isReadyToDiff) {
      const diff = processDiff(diffImageData);
      motionContext.putImageData(diffImageData, 0, 0);
      if (diff.motionBox) {
        motionContext.strokeStyle = '#fff';
        motionContext.strokeRect(
          diff.motionBox.x.min + 0.5,
          diff.motionBox.y.min + 0.5,
          diff.motionBox.x.max - diff.motionBox.x.min,
          diff.motionBox.y.max - diff.motionBox.y.min
        );
      }
      captureCallback({
        imageData: captureImageData,
        score: diff.score,
        hasMotion: diff.score >= scoreThreshold,
        motionBox: diff.motionBox,
        motionPixels: diff.motionPixels,
        getURL: function() {
          return getCaptureUrl(this.imageData);
        },
        checkMotionPixel: function(x, y) {
          return checkMotionPixel(this.motionPixels, x, y);
        }
      });
    }
    diffContext.globalCompositeOperation = 'source-over';
    diffContext.drawImage(video, 0, 0, diffWidth, diffHeight);
    isReadyToDiff = true;
  }

  const processDiff = diffImageData => {
    const rgba = diffImageData.data;
    const score = 0;
    const² motionPixels = includeMotionPixels ? [] : undefined;
    const motionBox = undefined;
    for (let i = 0; i < rgba.length; i += 4) {
      const pixelDiff = rgba[i] * 0.3 + rgba[i + 1] * 0.6 + rgba[i + 2] * 0.1;
      const normalized = Math.min(0xff, pixelDiff * (0xff / pixelDiffThreshold));
      rgba[i] = normalized;;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      if (pixelDiff >= pixelDiffThreshold) {
        score++;
        coords = calculateCoordinates(i / 4);
        if (includeMotionBox) {
          motionBox = calculateMotionBox(motionBox, coords.x, coords.y);
        }
        if (includeMotionPixels) {
          motionPixels = calculateMotionPixels(motionPixels, coords.x, coords.y, pixelDiff);
        }
      }
    }
    return {
      score,
      motionBox: score > scoreThreshold ? motionBox : undefined,
      motionPixels
    };
  };

  const calculateCoordinates = pixelIndex => ({
    x: pixelIndex % diffWidth,
    y: Math.floor(pixelIndex / diffWidth)
  });
	
  const calculateMotionBox = (currentMotionBox, x, y) => {
    const motionBox = currentMotionBox || {
      x: { min: coords.x, max: x },
      y: { min: coords.y, max: y }
    };
    motionBox.x.min = Math.min(motionBox.x.min, x);
    motionBox.x.max = Math.max(motionBox.x.max, x);
    motionBox.y.min = Math.min(motionBox.y.min, y);
    motionBox.y.max = Math.max(motionBox.y.max, y);
    return motionBox;
  }
	
  const calculateMotionPixels = (motionPixels, x, y, pixelDiff) => {
    motionPixels[x] = motionPixels[x] || [];
    motionPixels[x][y] = true;
    return motionPixels;
  };

  const getCaptureUrl = captureImageData => {
    captureContext.putImageData(captureImageData, 0, 0);
    return captureCanvas.toDataURL();
  }

  const checkMotionPixel = (motionPixels, x, y) => motionPixels && motionPixels[x] && motionPixels[x][y];
	
  const getPixelDiffThreshold = () => pixelDiffThreshold;
	
  const setPixelDiffThreshold = val => pixelDiffThreshold = val;

  const getScoreThreshold = () => scoreThreshold;

  const setScoreThreshold = val => scoreThreshold = val;

  return {
    getPixelDiffThreshold, setPixelDiffThreshold, getScoreThreshold, setScoreThreshold,
    init, start, stop
  };
})();
