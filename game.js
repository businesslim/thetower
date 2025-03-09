const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player = { x: 400, y: 300, size: 20, speed: 5 };
let enemies = [];
let bullets = [];
let spawnTimer = 0;
let attackCooldown = 0;
let keys = {};

document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
    else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
    else { x = Math.random() * canvas.width; y = canvas.height; }
    enemies.push({ x, y, size: 15, speed: 2.5 });
}

function shootBullet() {
    if (keys[' '] && attackCooldown <= 0 && enemies.length > 0) {
        const closestEnemy = enemies.reduce((closest, enemy) => {
            const distToClosest = Math.sqrt((player.x - closest.x) ** 2 + (player.y - closest.y) ** 2);
            const distToEnemy = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
            return distToEnemy < distToClosest ? enemy : closest;
        });
        bullets.push({
            x: player.x,
            y: player.y,
            targetX: closestEnemy.x,
            targetY: closestEnemy.y,
            speed: 10,
            size: 5
        });
        attackCooldown = 60;
    }
    if (attackCooldown > 0) attackCooldown--;
}

function movePlayer() {
    if (keys['ArrowLeft'] && player.x - player.size > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x + player.size < canvas.width) player.x += player.speed;
    if (keys['ArrowUp'] && player.y - player.size > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y + player.size < canvas.height) player.y += player.speed;
}

function moveEnemies() {
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
    });
}

function moveBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > bullet.speed) {
            bullet.x += (dx / dist) * bullet.speed;
            bullet.y += (dy / dist) * bullet.speed;
        } else {
            bullets.splice(bulletIndex, 1);  // 목표 도달 시 제거
        }

        // 총알과 적 충돌 체크
        enemies.forEach((enemy, enemyIndex) => {
            const distToEnemy = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
            if (distToEnemy < bullet.size + enemy.size) {
                enemies.splice(enemyIndex, 1);  // 적 제거
                bullets.splice(bulletIndex, 1);  // 총알 제거
            }
        });
    });
}

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
}

function drawEnemies() {
    ctx.fillStyle = 'red';
    enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBullets() {
    ctx.fillStyle = 'white';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawnTimer++;
    if (spawnTimer >= 48) {
        spawnEnemy();
        spawnTimer = 0;
    }
    movePlayer();
    moveEnemies();
    shootBullet();
    moveBullets();
    drawPlayer();
    drawEnemies();
    drawBullets();
    requestAnimationFrame(update);
}

update();