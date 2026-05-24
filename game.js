const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 768;

// Game state
const game = {
    score: 0,
    lives: 3,
    gameOver: false,
    wave: 1,
    enemiesDefeated: 0
};

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 20,
    height: 30,
    angle: 0,
    speed: 3,
    velocity: { x: 0, y: 0 },
    hp: 3
};

// Arrays
const bullets = [];
const enemies = [];
const explosions = [];

// Input
const keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key.toUpperCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toUpperCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    shoot();
});

// Bullet class
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 7;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    isOutOfBounds() {
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height;
    }
}

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 1.5;
        this.hp = 1;
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
    }

    update() {
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Enemy body
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Enemy eye
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(5, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isColliding(bullet) {
        return (
            bullet.x > this.x - this.width / 2 &&
            bullet.x < this.x + this.width / 2 &&
            bullet.y > this.y - this.height / 2 &&
            bullet.y < this.y + this.height / 2
        );
    }

    distanceToPlayer() {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Explosion class
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30
            });
        }
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.1;
        });
    }

    draw() {
        this.particles.forEach(p => {
            if (p.life > 0) {
                ctx.fillStyle = `rgba(255, ${Math.max(0, 100 * (p.life / 30))}, 0, ${p.life / 30})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    isDone() {
        return this.particles.every(p => p.life <= 0);
    }
}

// Functions
function shoot() {
    if (!game.gameOver) {
        const bulletAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        bullets.push(new Bullet(player.x, player.y, bulletAngle));
    }
}

function spawnEnemies() {
    const enemyCount = 3 + game.wave;
    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        const side = Math.floor(Math.random() * 4);

        switch(side) {
            case 0: // top
                x = Math.random() * canvas.width;
                y = -30;
                break;
            case 1: // right
                x = canvas.width + 30;
                y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * canvas.width;
                y = canvas.height + 30;
                break;
            case 3: // left
                x = -30;
                y = Math.random() * canvas.height;
                break;
        }

        enemies.push(new Enemy(x, y));
    }
}

function updatePlayer() {
    player.velocity.x = 0;
    player.velocity.y = 0;

    if (keys['W']) {
        player.velocity.x = Math.cos(player.angle) * player.speed;
        player.velocity.y = Math.sin(player.angle) * player.speed;
    }
    if (keys['S']) {
        player.velocity.x = Math.cos(player.angle) * -player.speed;
        player.velocity.y = Math.sin(player.angle) * -player.speed;
    }

    player.x += player.velocity.x;
    player.y += player.velocity.y;

    // Update angle to face mouse
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);

    // Boundaries
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Player body
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    // Gun barrel
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();

    ctx.restore();
}

function update() {
    if (game.gameOver) return;

    // Update player
    updatePlayer();

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();

        if (bullets[i].isOutOfBounds()) {
            bullets.splice(i, 1);
            continue;
        }

        // Collision detection
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j].isColliding(bullets[i])) {
                enemies[j].hp--;
                if (enemies[j].hp <= 0) {
                    explosions.push(new Explosion(enemies[j].x, enemies[j].y));
                    enemies.splice(j, 1);
                    game.score += 100;
                    game.enemiesDefeated++;

                    // Next wave
                    if (game.enemiesDefeated % 5 === 0) {
                        game.wave++;
                        spawnEnemies();
                    }
                }
                bullets.splice(i, 1);
                break;
            }
        }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update();

        // Collision with player
        if (enemy.distanceToPlayer() < 30) {
            game.lives--;
            explosions.push(new Explosion(player.x, player.y));
            enemies.splice(i, 1);

            if (game.lives <= 0) {
                game.gameOver = true;
                document.getElementById('gameOver').style.display = 'block';
                document.getElementById('finalScore').textContent = `Score: ${game.score}`;
            }
        }
    }

    // Update explosions
    explosions.forEach(exp => exp.update());
    for (let i = explosions.length - 1; i >= 0; i--) {
        if (explosions[i].isDone()) {
            explosions.splice(i, 1);
        }
    }

    // Spawn enemies if none
    if (enemies.length === 0) {
        spawnEnemies();
    }

    // Update UI
    document.getElementById('score').textContent = `Score: ${game.score}`;
    document.getElementById('lives').textContent = `Vies: ${game.lives}`;
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw everything
    drawPlayer();

    bullets.forEach(bullet => bullet.draw());
    enemies.forEach(enemy => enemy.draw());
    explosions.forEach(exp => exp.draw());

    // Draw crosshair
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouseX - 15, mouseY);
    ctx.lineTo(mouseX + 15, mouseY);
    ctx.moveTo(mouseX, mouseY - 15);
    ctx.lineTo(mouseX, mouseY + 15);
    ctx.stroke();
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
