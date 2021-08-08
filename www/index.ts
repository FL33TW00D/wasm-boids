import { Murmuration, Starling } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";

const murmuration = Murmuration.new();
const width = murmuration.width();
const height = murmuration.height();
const size = murmuration.size();

const canvas: HTMLCanvasElement = document.getElementById(
  "canvas"
) as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
ctx.fillStyle = "rgba(100, 50, 0, 1)";

class fpsCounter {
  fps: HTMLElement;
  frames: any;
  lastFrameTimeStamp: any;

  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = (1 / delta) * 1000;

    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }

    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    // Render the statistics.
    this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
  }
}

//let fps = new fpsCounter();

const renderLoop = () => {
  //fps.render();
  murmuration.tick();

  draw();
  requestAnimationFrame(renderLoop);
};

const draw = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const starlingPtr = murmuration.flock();
  const starlings = new Float32Array(memory.buffer, starlingPtr, size * 4);
  for (let i = 0; i < starlings.length - 4; i += 4) {
    drawStarling(
      starlings[i],
      starlings[i + 1],
      starlings[i + 2],
      starlings[i + 3]
    );
  }
};

//convert this to take a starling object
const drawStarling = (xpos: number, ypos: number, dx: number, dy: number) => {
  ctx.beginPath();
  ctx.ellipse(
    Math.floor(xpos),
    Math.floor(ypos),
    5,
    2,
    Math.atan(dy / dx),
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.closePath();
};

requestAnimationFrame(renderLoop);
