const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;
const TILE_SIZE = 64;

const FOV = Math.PI / 3; // 60 degrees field of view
const NUM_RAYS = WIDTH;

const map = [
  1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,1,0,0,0,0,1,
  1,0,0,0,1,0,0,0,0,1,
  1,0,0,0,1,1,1,0,0,1,
  1,0,0,0,0,0,1,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,1,1,1,1
];

const player = {
  x: TILE_SIZE * 1.5,
  y: TILE_SIZE * 1.5,
  angle: 0
};

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function normalizeAngle(angle) {
  angle %= 2 * Math.PI;
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function isWallAt(x, y) {
  if (x < 0 || x >= MAP_WIDTH * TILE_SIZE || y < 0 || y >= MAP_HEIGHT * TILE_SIZE) return true;
  const mx = Math.floor(x / TILE_SIZE);
  const my = Math.floor(y / TILE_SIZE);
  return map[my * MAP_WIDTH + mx] === 1;
}

function castRay(rayAngle, maxDistance = 1000) {
  rayAngle = normalizeAngle(rayAngle);
  let distanceToWall = 0;
  const stepSize = 1;

  while (distanceToWall < maxDistance) {
    distanceToWall += stepSize;
    const testX = player.x + Math.cos(rayAngle) * distanceToWall;
    const testY = player.y + Math.sin(rayAngle) * distanceToWall;
    if (isWallAt(testX, testY)) break;
  }
  return distanceToWall;
}

// Enemies on map with health
let enemies = [
  { x: TILE_SIZE * 5.5, y: TILE_SIZE * 4.5, health: 3 },
  { x: TILE_SIZE * 7.5, y: TILE_SIZE * 2.5, health: 3 }
];

// Gun recoil animation data
const gun = {
  baseX: WIDTH / 2,
  baseY: HEIGHT * 0.75,
  width: 150,
  height: 100,
  recoilOffset: 0,
  recoilMax: 15,
  recoilSpeed: 1.5,
  isRecoiling: false
};

let canShoot = true;
const shootCooldown = 300;

function shoot() {
  if (!canShoot) return;
  canShoot = false;
  gun.isRecoiling = true;
  gun.recoilOffset = gun.recoilMax;

  // Cast ray to find if enemy hit
  const rayDist = castRay(player.angle, 800);
  const shootRange = 800;
  let hitEnemy = null;
  let minDist = Infinity;

  enemies.forEach(enemy => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = distance(player.x, player.y, enemy.x, enemy.y);

    if (dist < shootRange) {
      let angleToEnemy = Math.atan2(dy, dx);
      angleToEnemy = normalizeAngle(angleToEnemy);

      let angleDiff = Math.abs(normalizeAngle(player.angle) - angleToEnemy);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff < 0.035) {
        if (dist < minDist && dist < rayDist) {
          minDist = dist;
          hitEnemy = enemy;
        }
      }
    }
  });

  if (hitEnemy) {
    hitEnemy.health -= 1;
    if (hitEnemy.health <= 0) {
      enemies = enemies.filter(e => e !== hitEnemy);
    }
  }

  setTimeout(() => { canShoot = true; }, shootCooldown);
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space') shoot();
});

function update() {
  // Movement controls
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

  // Animate gun recoil
  if (gun.isRecoiling) {
    gun.recoilOffset -= gun.recoilSpeed;
    if (gun.recoilOffset <= 0) {
      gun.recoilOffset = 0;
      gun.isRecoiling = false;
    }
  }
}

function drawWalls() {
  for (let col = 0; col < NUM_RAYS; col++) {
    const rayScreenPos = (col / NUM_RAYS) - 0.5;
    const rayAngle = normalizeAngle(player.angle + rayScreenPos * FOV);
    const dist = castRay(rayAngle);

    // Fish-eye correction
    const correctedDist = dist * Math.cos(rayAngle - player.angle);
    const wallHeight = (TILE_SIZE * HEIGHT) / correctedDist;

    const shade = Math.min(255, 255 - correctedDist * 0.7);
    ctx.fillStyle = `rgb(${shade}, ${shade / 2}, 0)`;
    ctx.fillRect(col, (HEIGHT / 2) - wallHeight / 2, 1, wallHeight);
  }
}

function drawEnemies() {
  enemies.forEach(enemy => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = distance(player.x, player.y, enemy.x, enemy.y);

    let angleToEnemy = Math.atan2(dy, dx);
    angleToEnemy = normalizeAngle(angleToEnemy);

    let angleDiff = angleToEnemy - player.angle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (Math.abs(angleDiff) < FOV / 2) {
      const screenX = Math.tan(angleDiff) * (WIDTH / 2) / Math.tan(FOV / 2) + (WIDTH / 2);
      const spriteHeight = (TILE_SIZE * HEIGHT) / dist;
      const spriteWidth = spriteHeight;

      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(screenX - spriteWidth / 2, (HEIGHT / 2) - spriteHeight / 2, spriteWidth, spriteHeight);

      // Health bar
      const healthBarWidth = spriteWidth;
      const healthBarHeight = 5;
      ctx.fillStyle = 'black';
      ctx.fillRect(screenX - healthBarWidth / 2, (HEIGHT / 2) - spriteHeight / 2 - 10, healthBarWidth, healthBarHeight);
      ctx.fillStyle = 'lime';
      ctx.fillRect(screenX - healthBarWidth / 2, (HEIGHT / 2) - spriteHeight / 2 - 10, healthBarWidth * (enemy.health / 3), healthBarHeight);
    }
  });
}

function drawGun() {
  const offsetY = gun.recoilOffset;
  const x = gun.baseX;
  const y = gun.baseY - offsetY;

  ctx.save();
  ctx.translate(x, y);

  // Gun body
  ctx.fillStyle = '#555';
  ctx.fillRect(-gun.width / 2, -gun.height / 2, gun.width, gun.height);

  // Gun barrel
  ctx.fillStyle = '#222';
  ctx.fillRect(gun.width / 4, -gun.height / 8, gun.width / 2, gun.height / 4);

  // Gun handle
  ctx.fillStyle = '#333';
  ctx.fillRect(-gun.width / 4, gun.height / 4, gun.width / 5, gun.height / 3);

  ctx.restore();
}

function render() {
  // Clear screen
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Draw ceiling
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, WIDTH, HEIGHT / 2);

  // Draw floor
  ctx.fillStyle = '#222';
  ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);

  // Draw walls and enemies
  drawWalls();
  drawEnemies();

  // Draw gun on top
  drawGun();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();