const video = document.getElementById('video');
const motionCanvas = document.getElementById('motion');
const score = document.getElementById('score');

const initSuccessCallback = () => DiffCamEngine.start();

const initErrorCallback = () => alert('Something went wrong.');

const captureCallback = payload => score.textContent = payload.score;

DiffCamEngine.init({ video, motionCanvas, initSuccessCallback, initErrorCallback, captureCallback });
