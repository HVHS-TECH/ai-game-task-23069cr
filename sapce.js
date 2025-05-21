 // Basic Raycaster for "Doom" style corridor
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;
const TILE_SIZE = 64;

const FOV = Math.PI / 3;  // 60 degrees
const NUM_RAYS = WIDTH;   // 1 ray per pixel column

// Simple map: 1 = wall, 0 = empty space
const map = [
  1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,1,0,0,0,1,
  1,0,0,0,0,1,0,0,0,1,
  1,0,0,0,0,1,0,0,0,1,
  1,0,0,1,1,1,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,1,1,1,1
];

let player = {
  x: TILE_SIZE * 1.5,
  y: TILE_SIZE * 1.5,
  angle: 0,
  speed: 0,
  turnSpeed: 0
};

const keys = {};

// Event listeners for controls
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

// Utility functions
function normalizeAngle(angle) {
  angle = angle % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
}

function isWallAt(x, y) {
  if (x < 0 || x >= MAP_WIDTH * TILE_SIZE || y < 0 || y >= MAP_HEIGHT * TILE_SIZE) {
    return true;  // outside map treated as wall
  }
  const mapX = Math.floor(x / TILE_SIZE);
  const mapY = Math.floor(y / TILE_SIZE);
  return map[mapY * MAP_WIDTH + mapX] === 1;
}

function castRay(rayAngle) {
  rayAngle = normalizeAngle(rayAngle);

  let hit = false;
  let distanceToWall = 0;

  const stepSize = 1; // step size for ray march

  let rayX = player.x;
  let rayY = player.y;

  while (!hit && distanceToWall < 1000) {
    distanceToWall += stepSize;
    rayX = player.x + Math.cos(rayAngle) * distanceToWall;
    rayY = player.y + Math.sin(rayAngle) * distanceToWall;

    if (isWallAt(rayX, rayY)) {
      hit = true;
    }
  }
  return distanceToWall;
}

function update() {
  // Move player
  if (keys['w']) {
    const nextX = player.x + Math.cos(player.angle) * 2;
    const nextY = player.y + Math.sin(player.angle) * 2;
    if (!isWallAt(nextX, nextY)) {
      player.x = nextX;
      player.y = nextY;
    }
  }
  if (keys['s']) {
    const nextX = player.x - Math.cos(player.angle) * 2;
    const nextY = player.y - Math.sin(player.angle) * 2;
    if (!isWallAt(nextX, nextY)) {
      player.x = nextX;
      player.y = nextY;
    }
  }
  if (keys['a']) {
    player.angle -= 0.05;
    player.angle = normalizeAngle(player.angle);
  }
  if (keys['d']) {
    player.angle += 0.05;
    player.angle = normalizeAngle(player.angle);
  }
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Draw ceiling
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, WIDTH, HEIGHT / 2);

  // Draw floor
  ctx.fillStyle = '#222';
  ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);

  // Cast and draw rays
  for (let col = 0; col < NUM_RAYS; col++) {
    const rayScreenPos = (col / NUM_RAYS) - 0.5;
    const rayAngle = normalizeAngle(player.angle + rayScreenPos * FOV);

    const dist = castRay(rayAngle);

    // Correct fish-eye
    const correctedDist = dist * Math.cos(rayAngle - player.angle);

    // Calculate wall height
    const wallHeight = (TILE_SIZE * HEIGHT) / correctedDist;

    // Shade walls based on distance
    const shade = Math.min(255, 255 - correctedDist * 0.7);
    ctx.fillStyle = `rgb(${shade}, ${shade / 2}, 0)`;

    ctx.fillRect(col, (HEIGHT / 2) - wallHeight / 2, 1, wallHeight);
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();