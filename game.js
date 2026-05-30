const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    zBuffer = new Array(canvas.width).fill(Infinity);
});

// ─── MAP ─────────────────────────────────────────────────────────────────────
const TILE_SIZE = 64;
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,0,0,1,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,1,0,1,1,1,1,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,1,0,1,0,0,1,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,1,1,0,1,1,0,1,1,0,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const MAP_W = MAP[0].length;
const MAP_H = MAP.length;

// ─── IMAGES ──────────────────────────────────────────────────────────────────
const enemyImage = new Image();
enemyImage.src = 'billiard.webp';
let enemyImageLoaded = false;
enemyImage.onload = () => { enemyImageLoaded = true; };

const ennemiImage = new Image();
ennemiImage.src = 'ennemi.avif';
let ennemiImageLoaded = false;
// Sprite sheet : 8 colonnes × 2 rangées (marche = rangée 0)
const ENNEMI_COLS = 8;
const ENNEMI_ROWS = 2;
ennemiImage.onload = () => { ennemiImageLoaded = true; };

const weaponImage = new Image();
weaponImage.src = 'arme1.avif';
let weaponImageLoaded = false;
weaponImage.onload = () => { weaponImageLoaded = true; };

// ─── GAME STATE ──────────────────────────────────────────────────────────────
const game = {
    score: 0, lives: 3, gameOver: false,
    wave: 1, enemiesDefeated: 0,
    ammo: 30, maxAmmo: 30,
    aiming: false,
    baseFOV: Math.PI / 3,
};

// ─── PLAYER ──────────────────────────────────────────────────────────────────
const player = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 1.5,
    angle: 0,
    speed: 2.5,
    fov: Math.PI / 3,
    viewDistance: TILE_SIZE * 10,
};

// ─── WEAPON ──────────────────────────────────────────────────────────────────
const weapon = {
    recoil: 0, recoilMax: 15,
    fireRate: 0, fireRateMax: 10,
    bobbing: 0, bobbingAmount: 0,
};

// ─── ARRAYS ──────────────────────────────────────────────────────────────────
const enemies = [];
const projectiles = [];
let nextEnemyId = 0;
let zBuffer = new Array(canvas.width).fill(Infinity);

// ─── INPUT ───────────────────────────────────────────────────────────────────
const keys = {};

window.addEventListener('keydown', e => {
    keys[e.key.toUpperCase()] = true;
    if (e.key === 'r' || e.key === 'R') reload();
});
window.addEventListener('keyup', e => { keys[e.key.toUpperCase()] = false; });

// Pointer Lock : clic sur le canvas capture la souris
canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
    }
});

// Rotation caméra via déplacement relatif (souris toujours capturée)
document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas) {
        player.angle += e.movementX * 0.003;
    }
});

canvas.addEventListener('mousedown', e => {
    if (document.pointerLockElement !== canvas) return;
    if (e.button === 0) shoot();
    if (e.button === 2) game.aiming = true;
});
canvas.addEventListener('mouseup', e => { if (e.button === 2) game.aiming = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ─── MAP HELPERS ─────────────────────────────────────────────────────────────
function isWall(x, y) {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return true;
    return MAP[ty][tx] === 1;
}

function canMove(x, y) {
    const r = 14;
    return !isWall(x + r, y + r) && !isWall(x - r, y + r)
        && !isWall(x + r, y - r) && !isWall(x - r, y - r);
}

// ─── ENEMY CLASS ─────────────────────────────────────────────────────────────
class Enemy {
    constructor(x, y) {
        this.id = nextEnemyId++;
        this.x = x; this.y = y;
        this.speed = 0.7 + game.wave * 0.1;
        this.hp = 1;
        this.distance = 0;
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        this.distance = Math.sqrt(dx * dx + dy * dy);

        const ang = Math.atan2(dy, dx);
        const nx = this.x + Math.cos(ang) * this.speed;
        const ny = this.y + Math.sin(ang) * this.speed;
        if (!isWall(nx, this.y)) this.x = nx;
        if (!isWall(this.x, ny)) this.y = ny;

        if (this.distance < 28) return 'hit';
        return null;
    }
}

// ─── RAYCASTING ──────────────────────────────────────────────────────────────
function castRays() {
    const W = canvas.width, H = canvas.height;

    // Smooth ADS zoom via FOV
    const targetFOV = game.aiming ? game.baseFOV * 0.4 : game.baseFOV;
    player.fov += (targetFOV - player.fov) * 0.12;

    // Ciel
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
    skyGrad.addColorStop(0, '#3a5a8a');
    skyGrad.addColorStop(1, '#c8a86b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H / 2);

    // Sol
    const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
    floorGrad.addColorStop(0, '#b8895a');
    floorGrad.addColorStop(1, '#6a4c2a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H / 2, W, H / 2);

    // Rayons
    zBuffer = new Array(W).fill(Infinity);

    for (let col = 0; col < W; col++) {
        const rayAngle = player.angle - player.fov / 2 + (col / W) * player.fov;
        const rdx = Math.cos(rayAngle);
        const rdy = Math.sin(rayAngle);

        let mx = Math.floor(player.x / TILE_SIZE);
        let my = Math.floor(player.y / TILE_SIZE);

        const ddx = Math.abs(1 / (rdx || 1e-10));
        const ddy = Math.abs(1 / (rdy || 1e-10));

        let sdx, sdy, stepX, stepY;
        if (rdx < 0) { stepX = -1; sdx = (player.x / TILE_SIZE - mx) * ddx; }
        else          { stepX =  1; sdx = (mx + 1 - player.x / TILE_SIZE) * ddx; }
        if (rdy < 0) { stepY = -1; sdy = (player.y / TILE_SIZE - my) * ddy; }
        else          { stepY =  1; sdy = (my + 1 - player.y / TILE_SIZE) * ddy; }

        let side = 0, hit = false, steps = 0;
        while (!hit && steps++ < 40) {
            if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; }
            else           { sdy += ddy; my += stepY; side = 1; }
            if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H || MAP[my][mx] === 1) hit = true;
        }

        let dist;
        if (side === 0) dist = (mx - player.x / TILE_SIZE + (1 - stepX) / 2) / rdx;
        else            dist = (my - player.y / TILE_SIZE + (1 - stepY) / 2) / rdy;
        if (dist < 0.01) dist = 0.01;

        // Stocker distance en pixels pour le zbuffer
        zBuffer[col] = dist * TILE_SIZE;

        // Hauteur de la tranche
        const wallH = Math.min(H * 5, Math.floor(H / dist));
        const drawStart = Math.max(0, (H - wallH) >> 1);
        const drawEnd   = Math.min(H - 1, (H + wallH) >> 1);

        // Couleur sable avec ombrage
        const bright = side === 0 ? 1.0 : 0.6;
        const fog    = Math.max(0.1, 1 - (dist * TILE_SIZE) / player.viewDistance);
        const r = Math.min(255, Math.floor((170 * fog + 40) * bright));
        const g = Math.min(255, Math.floor((120 * fog + 20) * bright));
        const b = Math.min(255, Math.floor(( 60 * fog + 10) * bright));

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(col, drawStart, 1, drawEnd - drawStart + 1);
    }
}

// ─── DRAW ENEMIES ────────────────────────────────────────────────────────────
function drawEnemies() {
    const W = canvas.width, H = canvas.height;
    const projFactor = (W / 2) / Math.tan(player.fov / 2);
    const now = Date.now();

    // Peintre : plus loin d'abord
    const sorted = [...enemies].sort((a, b) => b.distance - a.distance);

    for (const e of sorted) {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) continue;

        let relAngle = Math.atan2(dy, dx) - player.angle;
        while (relAngle >  Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

        if (Math.abs(relAngle) > player.fov / 2 + 0.4) continue;
        if (Math.abs(relAngle) >= Math.PI / 2 - 0.05) continue;

        const screenX = Math.floor(W / 2 + Math.tan(relAngle) * projFactor);
        const spriteH = Math.min(H * 2, Math.floor(H * TILE_SIZE / dist));

        // Grand personnage debout : colonnes 6-7 sur toute la hauteur (x=1500, w=500, h=1125)
        const frameX  = 1500;
        const frameW  = 500;
        const frameH  = ennemiImageLoaded ? ennemiImage.naturalHeight : 1125;
        const aspect  = frameH > 0 ? frameW / frameH : 0.44;
        const spriteW = Math.floor(spriteH * aspect);

        // Animation de marche : bobbing vertical + légère oscillation latérale
        const walkFreq  = 0.004 * (0.7 + e.speed);
        const walkPhase = now * walkFreq + e.id * 2.37;
        const bob       = Math.sin(walkPhase)      * Math.max(2, spriteH * 0.04);
        const sway      = Math.sin(walkPhase * 0.5) * Math.max(1, spriteH * 0.015);

        const centerY = H / 2;
        const top     = Math.floor(centerY - spriteH / 2 + bob);
        const bottom  = Math.floor(centerY + spriteH / 2 + bob);
        const left    = Math.floor(screenX - spriteW / 2 + sway);
        const right   = left + spriteW;

        const startCol = Math.max(0, left);
        const endCol   = Math.min(W - 1, right - 1);
        if (startCol > endCol) continue;

        const intensity = Math.max(0.2, 1 - dist / player.viewDistance);

        if (ennemiImageLoaded) {
            // Masque zbuffer : on regroupe les colonnes visibles en runs contigus
            ctx.save();
            ctx.beginPath();
            let hasVisible = false;
            let runStart   = -1;
            for (let col = startCol; col <= endCol + 1; col++) {
                const vis = col <= endCol && dist < zBuffer[col];
                if (vis && runStart < 0) {
                    runStart = col;
                } else if (!vis && runStart >= 0) {
                    ctx.rect(runStart, 0, col - runStart, H);
                    hasVisible = true;
                    runStart = -1;
                }
            }
            if (hasVisible) {
                ctx.clip();
                ctx.globalAlpha = Math.min(1, intensity + 0.25);
                ctx.globalCompositeOperation = 'multiply';
                // Grand personnage debout (zone droite du sprite sheet)
                ctx.drawImage(ennemiImage,
                    frameX, 0, frameW, frameH,       // source : grand perso debout
                    left, top, spriteW, bottom - top  // destination
                );
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        } else {
            // Fallback rouge
            for (let col = startCol; col <= endCol; col++) {
                if (dist >= zBuffer[col]) continue;
                ctx.fillStyle = `rgb(${Math.floor(230*intensity)},0,0)`;
                ctx.fillRect(col, Math.max(0,top), 1, Math.min(H,bottom)-Math.max(0,top));
            }
        }
    }
}

// ─── SHOOT ───────────────────────────────────────────────────────────────────
function shoot() {
    if (game.gameOver || game.ammo <= 0 || weapon.fireRate > 0) return;

    game.ammo--;
    weapon.fireRate = weapon.fireRateMax;
    weapon.recoil  = weapon.recoilMax;

    // Projectile visuel
    const gunX = canvas.width - 300 + weapon.recoil * 5;
    const gunY = canvas.height - 240;
    projectiles.push({ x: gunX + 40, y: gunY + 80, targetX: canvas.width / 2, targetY: canvas.height / 2, size: 40, life: 1.0 });

    // Détection d'impact : ennemi le plus proche au centre de l'écran
    const W = canvas.width;
    const projFactor = (W / 2) / Math.tan(player.fov / 2);
    let best = null, bestDist = Infinity;

    for (const e of enemies) {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let relAngle = Math.atan2(dy, dx) - player.angle;
        while (relAngle >  Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;
        if (Math.abs(relAngle) >= Math.PI / 2 - 0.05) continue;

        const screenX = Math.floor(W / 2 + Math.tan(relAngle) * projFactor);
        const spriteW = Math.floor(Math.min(W * 3, Math.floor(W * TILE_SIZE / dist)) * 0.65);

        if (Math.abs(screenX - W / 2) < spriteW / 2 + 10 && dist < bestDist && dist < player.viewDistance) {
            best = e;
            bestDist = dist;
        }
    }

    if (best) {
        best.hp--;
        if (best.hp <= 0) {
            enemies.splice(enemies.indexOf(best), 1);
            game.score += 100;
            game.enemiesDefeated++;
            if (game.enemiesDefeated % 5 === 0) {
                game.wave++;
                spawnEnemies();
            }
        }
    }
}

// ─── RELOAD ──────────────────────────────────────────────────────────────────
function reload() { game.ammo = game.maxAmmo; }

// ─── SPAWN ENEMIES ───────────────────────────────────────────────────────────
function spawnEnemies() {
    const count = 2 + game.wave;
    let spawned = 0, tries = 0;
    while (spawned < count && tries++ < 300) {
        const tx = 1 + Math.floor(Math.random() * (MAP_W - 2));
        const ty = 1 + Math.floor(Math.random() * (MAP_H - 2));
        if (MAP[ty][tx] === 0) {
            const wx = (tx + 0.5) * TILE_SIZE;
            const wy = (ty + 0.5) * TILE_SIZE;
            if (Math.hypot(wx - player.x, wy - player.y) > TILE_SIZE * 3) {
                enemies.push(new Enemy(wx, wy));
                spawned++;
            }
        }
    }
}

// ─── UPDATE PLAYER ───────────────────────────────────────────────────────────
function updatePlayer() {
    const spd = player.speed;
    let mx = 0, my = 0;

    if (keys['W']) { mx += Math.cos(player.angle) * spd; my += Math.sin(player.angle) * spd; weapon.bobbingAmount = 1; }
    if (keys['S']) { mx -= Math.cos(player.angle) * spd; my -= Math.sin(player.angle) * spd; weapon.bobbingAmount = 0.6; }
    if (keys['A']) { mx += Math.cos(player.angle - Math.PI / 2) * spd; my += Math.sin(player.angle - Math.PI / 2) * spd; weapon.bobbingAmount = 0.8; }
    if (keys['D']) { mx += Math.cos(player.angle + Math.PI / 2) * spd; my += Math.sin(player.angle + Math.PI / 2) * spd; weapon.bobbingAmount = 0.8; }

    // Collision glissante
    if (canMove(player.x + mx, player.y)) player.x += mx;
    if (canMove(player.x, player.y + my)) player.y += my;

    if (weapon.fireRate > 0) weapon.fireRate--;
    if (weapon.recoil  > 0) weapon.recoil -= 0.5;
    weapon.bobbing += weapon.bobbingAmount * 0.05;
    weapon.bobbingAmount *= 0.95;
}

// ─── DRAW WEAPON ─────────────────────────────────────────────────────────────
function drawWeapon() {
    const gunW = 300, gunH = 240;
    const gunX = canvas.width  - gunW + weapon.recoil * 5;
    const gunY = canvas.height - gunH + Math.sin(weapon.bobbing) * 10;

    if (weaponImageLoaded) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(weaponImage, gunX, gunY, gunW, gunH);
        ctx.globalCompositeOperation = 'source-over';
    } else {
        ctx.fillStyle = '#555';
        ctx.fillRect(gunX + 40, gunY, 40, 80);
        ctx.fillStyle = '#444';
        ctx.fillRect(gunX + 50, gunY - 25, 60, 15);
    }

    // Flash de tir
    if (weapon.fireRate > weapon.fireRateMax - 5) {
        ctx.fillStyle = 'rgba(255,150,0,0.8)';
        ctx.beginPath(); ctx.arc(gunX + 30, gunY + gunH * 0.35, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,0,0.6)';
        ctx.beginPath(); ctx.arc(gunX + 30, gunY + gunH * 0.35, 10, 0, Math.PI * 2); ctx.fill();
    }
}

// ─── MINIMAP ─────────────────────────────────────────────────────────────────
function drawMinimap() {
    const scale = 5;
    const ox = 10;
    const oy = canvas.height - MAP_H * scale - 10;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(ox - 2, oy - 2, MAP_W * scale + 4, MAP_H * scale + 4);

    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            ctx.fillStyle = MAP[y][x] === 1 ? '#999' : '#2a2a2a';
            ctx.fillRect(ox + x * scale, oy + y * scale, scale - 1, scale - 1);
        }
    }

    // Ennemis
    for (const e of enemies) {
        ctx.fillStyle = '#f44';
        ctx.fillRect(ox + (e.x / TILE_SIZE) * scale - 1.5, oy + (e.y / TILE_SIZE) * scale - 1.5, 3, 3);
    }

    // Joueur
    const px = ox + (player.x / TILE_SIZE) * scale;
    const py = oy + (player.y / TILE_SIZE) * scale;
    ctx.fillStyle = '#0f0';
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.angle) * 8, py + Math.sin(player.angle) * 8);
    ctx.stroke();
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
function update() {
    if (game.gameOver) return;

    updatePlayer();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const res = enemies[i].update();
        if (res === 'hit') {
            game.lives--;
            enemies.splice(i, 1);
            if (game.lives <= 0) {
                game.gameOver = true;
                document.getElementById('gameOver').style.display = 'block';
                document.getElementById('finalScore').textContent = `Score: ${game.score} | Vague: ${game.wave}`;
            }
        }
    }

    if (enemies.length === 0) spawnEnemies();

    document.getElementById('score').textContent = `Score: ${game.score}`;
    document.getElementById('lives').textContent = `Vies: ${game.lives}`;
    document.getElementById('ammo').textContent  = `Munitions: ${game.ammo}/${game.maxAmmo}`;
    document.getElementById('wave').textContent  = `Vague: ${game.wave}`;
}

// ─── DRAW ────────────────────────────────────────────────────────────────────
function draw() {
    castRays(); // ciel + sol + murs

    // Projectiles visuels
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= 0.06;
        if (p.life <= 0) { projectiles.splice(i, 1); continue; }
        p.x += (p.targetX - p.x) * 0.18;
        p.y += (p.targetY - p.y) * 0.18;
        const s = p.size * p.life;
        ctx.globalAlpha = p.life;
        if (enemyImageLoaded) ctx.drawImage(enemyImage, p.x - s / 2, p.y - s / 2, s, s);
        else { ctx.fillStyle = '#22f'; ctx.beginPath(); ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
    }

    drawEnemies();
    drawWeapon();
    drawMinimap();

    // Message "cliquer pour jouer" si souris non capturée
    if (document.pointerLockElement !== canvas) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(canvas.width/2 - 200, canvas.height/2 - 30, 400, 60);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Cliquez pour jouer', canvas.width/2, canvas.height/2 + 8);
        ctx.textAlign = 'left';
    }

    // Viseur
    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.lineCap = 'round';

    if (game.aiming) {
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-16,cy); ctx.lineTo(cx+16,cy); ctx.moveTo(cx,cy-16); ctx.lineTo(cx,cy+16); ctx.stroke();
        ctx.strokeStyle = '#f44'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-16,cy); ctx.lineTo(cx+16,cy); ctx.moveTo(cx,cy-16); ctx.lineTo(cx,cy+16); ctx.stroke();
    } else {
        const gap = 5, len = 15;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx-gap-len,cy); ctx.lineTo(cx-gap,cy);
        ctx.moveTo(cx+gap,cy);     ctx.lineTo(cx+gap+len,cy);
        ctx.moveTo(cx,cy-gap-len); ctx.lineTo(cx,cy-gap);
        ctx.moveTo(cx,cy+gap);     ctx.lineTo(cx,cy+gap+len);
        ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx-gap-len,cy); ctx.lineTo(cx-gap,cy);
        ctx.moveTo(cx+gap,cy);     ctx.lineTo(cx+gap+len,cy);
        ctx.moveTo(cx,cy-gap-len); ctx.lineTo(cx,cy-gap);
        ctx.moveTo(cx,cy+gap);     ctx.lineTo(cx,cy+gap+len);
        ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    }
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

spawnEnemies();
gameLoop();
