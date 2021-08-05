//TODO:
//Implement FOV
//KD-tree
//3D
//WASM
//SIMD

type Starling = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

const canvas: HTMLCanvasElement = document.getElementById(
  "canvas"
) as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
ctx.fillStyle = "rgba(100,50,0, 1)";

const NUM_STARLINGS = 600;
const BOUNDARY_MARGIN = 200;
const BOUNDARY_COEFFICIENT = 0.8;
const SPEED_LIMIT = 12;
const VISUAL_FIELD = 75;
const SEPERATION_DIST = 20;
const SEPERATION_COEFFICIENT = 0.05;
const ALIGNMENT_COEFFICIENT = 0.05;
const COHESION_COEFFICIENT = 0.01;
const SHOW_VISUAL_FIELD = false;

let starlings: Starling[] = [];

function init() {
  for (let i = 0; i < NUM_STARLINGS; i++) {
    starlings.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dx: Math.random() * 8,
      dy: Math.random() * 8,
    });
  }
}

function distance(s1: Starling, s2: Starling) {
  return Math.hypot(s1.x - s2.x, s1.y - s2.y);
}

function checkBounds(starling: Starling) {
  if (starling.x > canvas.width - BOUNDARY_MARGIN) {
    starling.dx -= BOUNDARY_COEFFICIENT;
  }

  if (starling.x < BOUNDARY_MARGIN) {
    starling.dx += BOUNDARY_COEFFICIENT;
  }

  if (starling.y > canvas.height - BOUNDARY_MARGIN) {
    starling.dy -= BOUNDARY_COEFFICIENT;
  }

  if (starling.y < BOUNDARY_MARGIN) {
    starling.dy += BOUNDARY_COEFFICIENT;
  }
}

function computeNeighbours(starling: Starling, range: number): Starling[] {
  let neighbours: Starling[] = [];
  for (let fm of starlings) {
    if (fm !== starling) {
      if (distance(starling, fm) < range) {
        neighbours.push(fm);
      }
    }
  }
  return neighbours;
}

//avoid crowding local flockmates
function seperate(starling: Starling, neighbours: Starling[]) {
  let xdelta = 0;
  let ydelta = 0;
  for (let neighbour of neighbours) {
    xdelta += starling.x - neighbour.x;
    ydelta += starling.y - neighbour.y;
  }
  starling.dx += xdelta * SEPERATION_COEFFICIENT;
  starling.dy += ydelta * SEPERATION_COEFFICIENT;
}

//align velocity vector with average velocity vector of flockmates
function alignment(starling: Starling, neighbours: Starling[]) {
  let xvel = 0;
  let yvel = 0;
  for (let neighbour of neighbours) {
    xvel += neighbour.dx;
    yvel += neighbour.dy;
  }
  if (neighbours) {
    starling.dx += (xvel / neighbours.length) * ALIGNMENT_COEFFICIENT;
    starling.dy += (yvel / neighbours.length) * ALIGNMENT_COEFFICIENT;
  }
}

//steer in the direction of the average position of flock mates
function cohesion(starling: Starling, neighbours: Starling[]) {
  let xpos = 0;
  let ypos = 0;
  for (let neighbour of neighbours) {
    xpos += neighbour.x;
    ypos += neighbour.y;
  }

  if (neighbours) {
    starling.dx +=
      (xpos / neighbours.length - starling.x) * COHESION_COEFFICIENT;
    starling.dy +=
      (ypos / neighbours.length - starling.y) * COHESION_COEFFICIENT;
  }
}

function draw() {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let starling of starlings) {
    const local = computeNeighbours(starling, SEPERATION_DIST);
    const visual = computeNeighbours(starling, VISUAL_FIELD);
    cohesion(starling, visual);
    seperate(starling, local);
    alignment(starling, visual);

    const speed = Math.hypot(starling.dx, starling.dy);
    if (speed > SPEED_LIMIT) {
      starling.dx = (starling.dx / speed) * SPEED_LIMIT;
      starling.dy = (starling.dy / speed) * SPEED_LIMIT;
    }
    starling.x += starling.dx;
    starling.y += starling.dy;
    checkBounds(starling);
    drawStarling(starling, ctx);
  }
  window.requestAnimationFrame(draw);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawStarling(starling: Starling, ctx: CanvasRenderingContext2D) {
  /*if (SHOW_VISUAL_FIELD) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 100, 100, 0.3)";
    ctx.arc(starling.x, starling.y, VISUAL_FIELD, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }*/
  ctx.beginPath();
  ctx.ellipse(
    starling.x,
    starling.y,
    5,
    2,
    Math.atan(starling.dy / starling.dx),
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.closePath();
}

//IFFI
(function () {
  resizeCanvas();
  init();
  draw();
})();
