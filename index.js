let video;
let canvas;

const constraints = {
  audio: false,
  video: { width: 640, height: 480 }
};

navigator.mediaDevices.getUserMedia(constraints)
  .then(success)
  .catch(error);

function success(stream) {
  const video = document.getElementById('video');
  video.srcObject = stream;
}

function error(error) {
  console.log(error);
}

video = document.getElementById('video');
canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
const context = canvas.getContext('2d');

setInterval(capture, 100);

function capture() {
  context.drawImage(video, 0, 0, 640, 480);
}

var dataURL = canvas.toDataURL();

context.globalCompositeOperation = 'difference';

var imageScore = 0;

for (var i = 0; i < imageData.data.length; i += 4) {
    var r = imageData.data[i] / 3;
    var g = imageData.data[i + 1] / 3;
    var b = imageData.data[i + 2] / 3;
    var pixelScore = r + g + b;
    
    if (pixelScore >= PIXEL_SCORE_THRESHOLD) {
        imageScore++;
    }
}

if (imageScore >= IMAGE_SCORE_THRESHOLD) {
    // we have motion!
}

