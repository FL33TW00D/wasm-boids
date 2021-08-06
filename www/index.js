import { Murmuration, Starling } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg";

const murmuration = Murmuration.new();
const width = murmuration.width();
const height = murmuration.height();
const size = murmuration.size();

const canvas = document.getElementById("canvas");
canvas.height = height;
canvas.width = width;

const ctx = canvas.getContext("2d");
ctx.fillStyle = "rgba(100,50,0, 1)";

const renderLoop = () => {
  murmuration.tick();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  draw();
  requestAnimationFrame(renderLoop);
};

const draw = () => {
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

const drawStarling = (xpos, ypos, dx, dy) => {
 // console.log(`xpos: ${xpos} ypos: ${ypos} dx: ${dx} dy: ${dy}`);
  ctx.beginPath();
  ctx.ellipse(xpos, ypos, 5, 2, Math.atan(dy / dx), 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
};

requestAnimationFrame(renderLoop);
