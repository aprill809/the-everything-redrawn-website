let video = document.getElementById("video");
let videoUpload = document.getElementById("videoUpload");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let currentFrame = 0;
let drawnFrames = JSON.parse(localStorage.getItem("drawnFrames") || "[]");

// Video upload handler
videoUpload.addEventListener("change", function (e) {
  let file = e.target.files[0];
  if (file) {
    let objectURL = URL.createObjectURL(file);
    video.src = objectURL;
    video.load();
    video.play();
    loadFrames(file);
  }
});

let ffmpeg = FFmpeg.createFFmpeg({ log: true });

// Load frames from the video
async function loadFrames(file) {
  await ffmpeg.load();
  ffmpeg.FS("writeFile", "video.mp4", await fetchFile(file));
  await ffmpeg.run("-i", "video.mp4", "-vf", "fps=1", "frame%04d.png");
  totalFrames = await ffmpeg.FS("readdir", "/").filter(f => f.endsWith(".png")).length;
}

// Show next frame
document.getElementById("nextFrame").addEventListener("click", async function () {
  let frameNumber = currentFrame + 1;
  let frameFile = `/frame${frameNumber.toString().padStart(4, "0")}.png`;

  if (drawnFrames.includes(frameFile)) {
    alert("Frame already redrawn.");
    return;
  }

  let data = await ffmpeg.FS("readFile", frameFile);
  let img = new Image();
  img.src = URL.createObjectURL(new Blob([data.buffer]));
  img.onload = function () {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    currentFrame++;
  };
});

// Save redrawn frame
document.getElementById("saveFrame").addEventListener("click", function () {
  let frameData = canvas.toDataURL();
  let frameFile = `/frame${currentFrame.toString().padStart(4, "0")}.png`;

  // Save to localStorage (or back-end if needed)
  localStorage.setItem("drawnFrames", JSON.stringify([...drawnFrames, frameFile]));
  let link = document.getElementById("downloadLink");
  let imgData = dataURItoBlob(frameData);
  let url = URL.createObjectURL(imgData);
  link.href = url;
  link.style.display = "inline-block";
  document.getElementById("downloadButton").style.display = "inline";
});

// Helper function to convert data URL to Blob
function dataURItoBlob(dataURI) {
  let byteString = atob(dataURI.split(',')[1]);
  let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  let ab = new ArrayBuffer(byteString.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}
