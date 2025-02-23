let video = document.getElementById("video");
let videoUpload = document.getElementById("videoUpload");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let currentFrame = 0;
let drawnFrames = JSON.parse(localStorage.getItem("drawnFrames") || "[]");

let ffmpeg; // Declare ffmpeg outside of functions

// Asynchronously load the ffmpeg library
async function loadFFmpeg() {
  ffmpeg = await FFmpeg.createFFmpeg({ log: true }); // Initialize FFmpeg
  await ffmpeg.load(); // Wait for ffmpeg to load
  console.log("FFmpeg is ready");
}

// Call loadFFmpeg to initialize it
loadFFmpeg();

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

async function loadFrames(file) {
  try {
    await ffmpeg.load();
    ffmpeg.FS("writeFile", "video.mp4", await fetchFile(file));
    console.log("Video loaded into FFmpeg");

    // Extract frames at 1 FPS
    await ffmpeg.run("-i", "video.mp4", "-vf", "fps=1", "frame%04d.png");
    console.log("Frames extracted");

    let totalFrames = await ffmpeg.FS("readdir", "/").filter(f => f.endsWith(".png")).length;
    console.log(`Total frames extracted: ${totalFrames}`);
  } catch (error) {
    console.error("Error during frame extraction:", error);
  }
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

  localStorage.setItem("drawnFrames", JSON.stringify([...drawnFrames, frameFile]));
  let link = document.getElementById("downloadLink");
  let imgData = dataURItoBlob(frameData);
  let url = URL.createObjectURL(imgData);
  link.href = url;
  link.style.display = "inline-block";
  document.getElementById("downloadButton").style.display = "inline";
});

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
