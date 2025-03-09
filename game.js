const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player = {
    x: 400,
    y: 300,
    size: 20,
    speed: 5
};

let enemies = [];
let spawnTimer = 0;

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

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawnTimer++;
    if (spawnTimer >= 48) {  // 약 0.8초마다 생성
        spawnEnemy();
        spawnTimer = 0;
    }
    movePlayer();
    moveEnemies();
    drawPlayer();
    drawEnemies();
    requestAnimationFrame(update);
}

update();