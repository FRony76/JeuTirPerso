const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 768;

// Load background image
const backgroundImage = new Image();
backgroundImage.src = 'desert.jpg';
let backgroundLoaded = false;
backgroundImage.onload = () => { backgroundLoaded = true; };

// Load enemy (billiard ball) image
const enemyImage = new Image();
enemyImage.src = 'billiard.webp';
let enemyImageLoaded = false;
enemyImage.onload = () => { enemyImageLoaded = true; };

// Game state
const game = {
    score: 0,
    lives: 3,
    gameOver: false,
    wave: 1,
    enemiesDefeated: 0,
    ammo: 30,
    maxAmmo: 30,
    aiming: false,
    zoomLevel: 1
};

// Player camera (FPS view)
const player = {
    x: 512,
    y: 384,
    angle: 0,
    speed: 3,
    fov: Math.PI / 3, // 60 degrees
    viewDistance: 800
};

// Weapon state
const weapon = {
    recoil: 0,
    recoilMax: 15,
    fireRate: 0,
    fireRateMax: 10,
    bobbing: 0,
    bobbingAmount: 0
};

// Arrays
const enemies = [];
const projectiles = []; // balles visuelles tirées
let nextEnemyId = 0;

// Input
const keys = {};
let lastMouseX = canvas.width / 2;

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key.toUpperCase()] = true;
    if (e.key === 'r' || e.key === 'R') {
        reload();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toUpperCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const delta = mouseX - lastMouseX;
    player.angle += delta * 0.01;
    lastMouseX = mouseX;
});

// Clic gauche = tirer
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) shoot();
});

// Clic droit = viser (ADS)
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) game.aiming = true;
});
canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) game.aiming = false;
});

// Désactiver le menu contextuel sur clic droit
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Enemy class
class Enemy {
    constructor(x, y) {
        this.id = nextEnemyId++;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.speed = 1.2;
        this.hp = 1;
        this.distance = 0;
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        this.distance = Math.sqrt(dx * dx + dy * dy);

        // Move towards player
        const angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        // Check if hit player
        if (this.distance < 40) {
            return 'hit';
        }
        return null;
    }

    isHitByRaycast(angle, maxDist) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) return false;

        const angleTo = Math.atan2(dy, dx);

        // Normaliser la différence d'angle entre -PI et PI
        let angleDiff = angleTo - angle;
        while (angleDiff > Math.PI)  angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        return Math.abs(angleDiff) < 0.2;
    }

    drawFirstPerson(screenX, screenWidth, distanceToCenter) {
        if (this.distance > player.viewDistance) return;

        // Calculate size based on distance (smaller = farther)
        const scale = 100 / this.distance;
        const size = Math.max(20, Math.min(300, this.height * scale));

        const screenY = canvas.height / 2 - size / 2;
        const screenWidth_ = size * 0.6;

        // Color based on distance (darker = farther)
        const colorIntensity = Math.max(0.3, 1 - this.distance / player.viewDistance);
        const r = Math.floor(255 * colorIntensity);
        const g = 0;
        const b = 0;

        // Draw enemy as red square
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(screenX, screenY, screenWidth_, size);

        // Eyes
        const eyeSize = size * 0.1;
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(screenX + screenWidth_ * 0.3, screenY + size * 0.3, eyeSize, eyeSize);
        ctx.fillRect(screenX + screenWidth_ * 0.6, screenY + size * 0.3, eyeSize, eyeSize);

        ctx.strokeStyle = `rgb(${r}, 100, 0)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, screenWidth_, size);
    }
}

function shoot() {
    if (game.gameOver || game.ammo <= 0) return;
    if (weapon.fireRate > 0) return;

    game.ammo--;
    weapon.fireRate = weapon.fireRateMax;
    weapon.recoil = weapon.recoilMax;

    // Ajouter un projectile visuel (balle de billard)
    const gunX = canvas.width - 150 + weapon.recoil * 5;
    const gunY = canvas.height - 120;
    projectiles.push({
        x: gunX + 60,
        y: gunY,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2,
        size: 40,
        life: 1.0  // 1.0 = neuf, diminue jusqu'à 0
    });

    // Raycast to detect enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isHitByRaycast(player.angle, player.viewDistance)) {
            enemy.hp--;
            if (enemy.hp <= 0) {
                enemies.splice(i, 1);
                game.score += 100;
                game.enemiesDefeated++;

                // Next wave
                if (game.enemiesDefeated % 5 === 0) {
                    game.wave++;
                    spawnEnemies();
                }
            }
            break;
        }
    }
}

function reload() {
    game.ammo = game.maxAmmo;
}

function spawnEnemies() {
    const enemyCount = 2 + game.wave;
    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        const angle = Math.random() * Math.PI * 2;
        const distance = 600 + Math.random() * 300;

        x = player.x + Math.cos(angle) * distance;
        y = player.y + Math.sin(angle) * distance;

        enemies.push(new Enemy(x, y));
    }
}

function updatePlayer() {
    let moveX = 0;
    let moveY = 0;

    if (keys['W']) {
        moveX = Math.cos(player.angle) * player.speed;
        moveY = Math.sin(player.angle) * player.speed;
        weapon.bobbingAmount = 1;
    }
    if (keys['S']) {
        moveX = Math.cos(player.angle) * -player.speed;
        moveY = Math.sin(player.angle) * -player.speed;
        weapon.bobbingAmount = 0.5;
    }

    player.x += moveX;
    player.y += moveY;

    // Update weapon state
    if (weapon.fireRate > 0) weapon.fireRate--;
    if (weapon.recoil > 0) weapon.recoil -= 0.5;

    // Weapon bobbing
    weapon.bobbing += weapon.bobbingAmount * 0.05;
    weapon.bobbingAmount *= 0.95;
}

function drawWeapon() {
    const gunX = canvas.width - 150 + weapon.recoil * 5;
    const gunY = canvas.height - 150 + Math.sin(weapon.bobbing) * 10;

    // Gun barrel
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gunX + 50, gunY - 20);
    ctx.lineTo(gunX + 120, gunY - 30);
    ctx.stroke();

    // Gun grip
    ctx.fillStyle = '#444444';
    ctx.fillRect(gunX + 40, gunY, 40, 80);

    // Gun slide
    ctx.fillStyle = '#555555';
    ctx.fillRect(gunX + 50, gunY - 25, 60, 15);

    // Sights
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gunX + 60, gunY - 35);
    ctx.lineTo(gunX + 60, gunY - 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gunX + 110, gunY - 40);
    ctx.lineTo(gunX + 110, gunY - 50);
    ctx.stroke();

    // Muzzle flash
    if (weapon.fireRate > weapon.fireRateMax - 5) {
        ctx.fillStyle = 'rgba(255, 150, 0, 0.7)';
        ctx.fillRect(gunX + 115, gunY - 30, 30, 20);
    }
}

function update() {
    if (game.gameOver) return;

    updatePlayer();

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const result = enemies[i].update();
        if (result === 'hit') {
            game.lives--;
            enemies.splice(i, 1);

            if (game.lives <= 0) {
                game.gameOver = true;
                document.getElementById('gameOver').style.display = 'block';
                document.getElementById('finalScore').textContent = `Score: ${game.score} | Vague: ${game.wave}`;
            }
        }
    }

    // Spawn enemies if none
    if (enemies.length === 0) {
        spawnEnemies();
    }

    // Update UI
    document.getElementById('score').textContent = `Score: ${game.score}`;
    document.getElementById('lives').textContent = `Vies: ${game.lives}`;
    document.getElementById('ammo').textContent = `Munitions: ${game.ammo}/${game.maxAmmo}`;
    document.getElementById('wave').textContent = `Vague: ${game.wave}`;
}

function draw() {
    // Zoom progressif quand on vise
    const targetZoom = game.aiming ? 2.0 : 1.0;
    game.zoomLevel += (targetZoom - game.zoomLevel) * 0.15;
    const z = game.zoomLevel;

    // Draw background avec zoom centré
    if (backgroundLoaded) {
        const sw = canvas.width / z;
        const sh = canvas.height / z;
        const sx = (backgroundImage.width - sw * (backgroundImage.width / canvas.width)) / 2;
        const sy = (backgroundImage.height - sh * (backgroundImage.height / canvas.height)) / 2;
        ctx.drawImage(backgroundImage, sx, sy, backgroundImage.width / z, backgroundImage.height / z, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback: Draw sky (gradient)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

        // Draw ground
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

        // Draw horizon line
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    // Sort enemies by distance (painter's algorithm)
    enemies.sort((a, b) => b.distance - a.distance);

    // Draw enemies
    const centerX = canvas.width / 2;
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const angleDiff = player.angle - Math.atan2(enemy.y - player.y, enemy.x - player.x);
        const screenX = centerX + Math.sin(angleDiff) * 200;

        enemy.drawFirstPerson(screenX, 100, angleDiff);
    }

    // Draw et update projectiles (balles de billard)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= 0.06;
        if (p.life <= 0) { projectiles.splice(i, 1); continue; }

        // Interpolation vers le viseur
        p.x += (p.targetX - p.x) * 0.18;
        p.y += (p.targetY - p.y) * 0.18;

        const s = p.size * p.life;
        ctx.globalAlpha = p.life;
        if (enemyImageLoaded) {
            ctx.drawImage(enemyImage, p.x - s / 2, p.y - s / 2, s, s);
        } else {
            ctx.fillStyle = '#222277';
            ctx.beginPath();
            ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    // Draw weapon
    drawWeapon();

    // Draw crosshair
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.lineCap = 'round';

    if (game.aiming) {
        // Mode visée : petit cercle rouge précis
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
        ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
        ctx.stroke();

        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
        ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
        ctx.stroke();
    } else {
        // Mode normal : croix blanche avec gap
        const gap = 5;
        const len = 18;

        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + gap + len, cy);
        ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + gap + len);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + gap + len, cy);
        ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + gap + len);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
spawnEnemies();
gameLoop();
