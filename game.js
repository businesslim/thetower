const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const modal = document.getElementById('modal');

// 게임 상태
let game = {
    state: 'start',  // start, playing, stage_clear, game_over, portal, item_selection
    floor: 1,
    kills: 0,
    totalKills: 0,
    startTime: 0,
    spawnTimer: 0,
    baseSpawnTime: 48,
    stageItemSelected: false
};

// 플레이어
let player = {
    x: 400,
    y: 300,
    size: 20,
    baseSpeed: 5,
    speed: 5,
    hearts: 3,
    maxHearts: 3,
    invincible: false,
    invincibleTimer: 0,
    attackCooldown: 0,
    baseAttackSpeed: 60,
    attackSpeed: 60,
    moving: false,
    doubleShot: false,
    currentWeapon: 'Pistol'
};

let enemies = [];
let bullets = [];
let items = [];
let stageItems = [];
let dropItems = [];
let keys = {};

// 키보드 이벤트
document.addEventListener('keydown', (e) => { 
    keys[e.key] = true; 
    if (e.key === 'Enter') handleEnter();
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// 적 생성
function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
    else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
    else { x = Math.random() * canvas.width; y = canvas.height; }
    enemies.push({ x, y, size: 15, speed: player.baseSpeed * 0.5 * (1 + 0.03 * (game.floor - 1)) });
}

// 플레이어 이동
function movePlayer() {
    player.moving = false;
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] && player.x - player.size > 0) dx = -1;
    if (keys['ArrowRight'] && player.x + player.size < canvas.width) dx = 1;
    if (keys['ArrowUp'] && player.y - player.size > 0) dy = -1;
    if (keys['ArrowDown'] && player.y + player.size < canvas.height) dy = 1;
    if (dx !== 0 || dy !== 0) {
        player.x += dx * player.speed;
        player.y += dy * player.speed;
        player.moving = true;
    }
}

// 총알 발사
function shootBullet() {
    if (!player.moving && player.attackCooldown <= 0 && enemies.length > 0) {
        const closestEnemy = enemies.reduce((closest, enemy) => {
            const distToClosest = Math.sqrt((player.x - closest.x) ** 2 + (player.y - closest.y) ** 2);
            const distToEnemy = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
            return distToEnemy < distToClosest ? enemy : closest;
        });
        bullets.push({ x: player.x, y: player.y, targetX: closestEnemy.x, targetY: closestEnemy.y, speed: 10, size: 5 });
        if (player.doubleShot && enemies.length > 1) {
            const secondEnemy = enemies.filter(e => e !== closestEnemy).reduce((closest, enemy) => {
                const distToClosest = Math.sqrt((player.x - closest.x) ** 2 + (player.y - closest.y) ** 2);
                const distToEnemy = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
                return distToEnemy < distToClosest ? enemy : closest;
            });
            bullets.push({ x: player.x, y: player.y, targetX: secondEnemy.x, targetY: secondEnemy.y, speed: 10, size: 5 });
        }
        player.attackCooldown = player.attackSpeed;
    }
    if (player.attackCooldown > 0) player.attackCooldown--;
}

// 적 이동
function moveEnemies() {
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;

        // 플레이어와 충돌
        if (dist < player.size + enemy.size && !player.invincible) {
            player.hearts--;
            player.invincible = true;
            player.invincibleTimer = 180;
            enemies.splice(enemies.indexOf(enemy), 1);
            if (player.hearts <= 0) game.state = 'game_over';
        }
    });
}

// 총알 이동 및 충돌
function moveBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > bullet.speed) {
            bullet.x += (dx / dist) * bullet.speed;
            bullet.y += (dy / dist) * bullet.speed;
        } else if (!enemies.some(e => Math.sqrt((bullet.x - e.x) ** 2 + (bullet.y - e.y) ** 2) < bullet.size + e.size)) {
            bullets.splice(bulletIndex, 1);
            return;
        }

        enemies.forEach((enemy, enemyIndex) => {
            const distToEnemy = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
            if (distToEnemy < bullet.size + enemy.size) {
                enemies.splice(enemyIndex, 1);
                bullets.splice(bulletIndex, 1);
                game.kills++;
                game.totalKills++;
                if (Math.random() < 0.05) items.push({ x: enemy.x, y: enemy.y, size: 15 });
            }
        });
    });
}

// 아이템 획득
function checkItems() {
    items.forEach((item, index) => {
        const dist = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
        if (dist < player.size + item.size) {
            game.state = 'item_selection';
            generateDropItems();
            items.splice(index, 1);
        }
    });
}

// 드롭 아이템 생성
function generateDropItems() {
    dropItems = [
        { type: 'bomb', desc: 'Clear all enemies on this floor' },
        { type: 'double_pistol', desc: 'Fire 2 bullets at the same time' },
        { type: 'heal', desc: 'Heal 1 heart' },
        { type: 'portal', desc: 'Open a portal to the next floor' }
    ].sort(() => Math.random() - 0.5).slice(0, 2);  // 2개 랜덤 선택
    showItemModal();
}

// 스테이지 클리어 아이템 생성
function generateStageItems() {
    const allItems = [
        { type: 'weapon', value: Math.random() * (0.20 - 0.03) + 0.03, prob: 0.45 },
        { type: 'speed', value: Math.random() * (0.05 - 0.01) + 0.01, prob: 0.45 },
        { type: 'heart', value: 1, prob: 0.10 }
    ];
    stageItems = [];
    const positions = [[200, 400], [350, 400], [500, 400]].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
        let r = Math.random(), cumulative = 0;
        for (const item of allItems) {
            cumulative += item.prob;
            if (r <= cumulative) {
                stageItems.push({ type: item.type, value: item.value, x: positions[i][0], y: positions[i][1] });
                break;
            }
        }
    }
}

// 플레이어 상태 업데이트
function updatePlayer() {
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }
}

// 그리기 함수
function drawPlayer() {
    if (player.invincible && Math.floor(player.invincibleTimer / 10) % 2 === 0) return;
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

function drawItems() {
    ctx.fillStyle = 'green';
    items.forEach(item => {
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - item.size);
        ctx.lineTo(item.x + item.size, item.y + item.size / 2);
        ctx.lineTo(item.x - item.size, item.y + item.size / 2);
        ctx.fill();
    });
}

function drawHearts() {
    ctx.fillStyle = 'red';
    for (let i = 0; i < player.hearts; i++) {
        ctx.fillRect(10 + i * 30, 10, 20, 20);
    }
}

function drawText(text, x, y, color = 'white', size = 36) {
    ctx.fillStyle = color;
    ctx.font = `${size}px Arial`;
    ctx.fillText(text, x, y);
}

// 모달 표시
function showItemModal() {
    modal.style.display = 'block';
    modal.innerHTML = '<h2>Select Item</h2>';
    dropItems.forEach(item => {
        const button = document.createElement('button');
        button.innerHTML = `${item.type.replace('_', ' ')}<br>${item.desc}`;
        button.onclick = () => selectDropItem(item);
        modal.appendChild(button);
    });
}

function selectDropItem(item) {
    if (item.type === 'bomb') {
        enemies = [];
        bullets = [];
    } else if (item.type === 'double_pistol') {
        player.doubleShot = true;
        player.currentWeapon = 'Double Pistol';
    } else if (item.type === 'heal' && player.hearts < player.maxHearts) {
        player.hearts++;
    } else if (item.type === 'portal') {
        game.state = 'portal';
    }
    modal.style.display = 'none';
    if (game.state !== 'portal') game.state = 'playing';
}

// Enter 키 처리
function handleEnter() {
    if (game.state === 'start') {
        game.state = 'playing';
        resetFloor();
    } else if (game.state === 'stage_clear' && game.stageItemSelected) {
        game.floor++;
        game.state = 'playing';
        resetFloor();
    } else if (game.state === 'game_over') {
        game.state = 'playing';
        resetGame();
    } else if (game.state === 'portal') {
        game.floor++;
        game.state = 'playing';
        resetFloor();
    }
}

// 게임 리셋
function resetGame() {
    player = { ...player, x: 400, y: 300, hearts: 3, maxHearts: 3, speed: 5, attackSpeed: 60, doubleShot: false, currentWeapon: 'Pistol' };
    game = { ...game, floor: 1, kills: 0, totalKills: 0 };
    resetFloor();
}

function resetFloor() {
    player.x = 400;
    player.y = 300;
    enemies = [spawnEnemy(), spawnEnemy()];
    bullets = [];
    items = [];
    game.kills = 0;
    game.startTime = performance.now();
    game.stageItemSelected = false;
    game.spawnTimer = 0;
}

// 메인 업데이트
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (game.state === 'start') {
        drawText('The Tower', 300, 250);
        drawText('Press Enter to Start', 280, 350, 'white', 24);
    } else if (game.state === 'playing') {
        game.spawnTimer++;
        if (game.spawnTimer >= game.baseSpawnTime * (1 - 0.03 * (game.floor - 1))) {
            spawnEnemy();
            game.spawnTimer = 0;
        }
        movePlayer();
        moveEnemies();
        shootBullet();
        moveBullets();
        checkItems();
        updatePlayer();

        drawPlayer();
        drawEnemies();
        drawBullets();
        drawItems();
        drawHearts();
        drawText(`${game.floor}${game.floor === 1 ? 'st' : game.floor === 2 ? 'nd' : game.floor === 3 ? 'rd' : 'th'} Floor`, 10, 40);
        drawText(`Weapon: ${player.currentWeapon}`, 600, 40, 'white', 24);

        if (game.kills >= 10 + (game.floor - 1)) {
            game.state = 'stage_clear';
            generateStageItems();
        }
    } else if (game.state === 'stage_clear') {
        const clearTime = Math.floor((performance.now() - game.startTime) / 1000);
        drawText('Stage Clear', 300, 200);
        drawText(`Enemies Killed: ${game.kills}`, 300, 250);
        drawText(`Clear Time: ${clearTime} sec`, 300, 300);
        stageItems.forEach(item => {
            ctx.fillStyle = 'gray';
            ctx.fillRect(item.x, item.y, 100, 50);
        });
        if (game.stageItemSelected) {
            drawText(`Selected: ${stageItems[0].text}`, 300, 350, 'yellow');
            drawText('Press Enter for Next Floor', 280, 550);
        }
        document.addEventListener('click', (e) => {
            if (game.state === 'stage_clear' && !game.stageItemSelected) {
                stageItems.forEach(item => {
                    if (e.clientX - canvas.offsetLeft > item.x && e.clientX - canvas.offsetLeft < item.x + 100 &&
                        e.clientY - canvas.offsetTop > item.y && e.clientY - canvas.offsetTop < item.y + 50) {
                        if (item.type === 'weapon') {
                            player.attackSpeed *= (1 - item.value);
                            player.attackSpeed = Math.max(10, player.attackSpeed);
                            item.text = `Weapon Speed +${Math.floor(item.value * 100)}%`;
                        } else if (item.type === 'speed') {
                            player.speed += player.baseSpeed * item.value;
                            item.text = `Move Speed +${Math.floor(item.value * 100)}%`;
                        } else if (item.type === 'heart') {
                            player.maxHearts++;
                            player.hearts = player.maxHearts;
                            item.text = 'Heart +1';
                        }
                        stageItems = [item];
                        game.stageItemSelected = true;
                    }
                });
            }
        }, { once: true });
    } else if (game.state === 'game_over') {
        drawText(`You died at ${game.floor}${game.floor === 1 ? 'st' : game.floor === 2 ? 'nd' : game.floor === 3 ? 'rd' : 'th'} Floor`, 200, 250);
        drawText(`Total Enemies Killed: ${game.totalKills}`, 250, 300);
        drawText('Press Enter to Restart', 280, 350);
    } else if (game.state === 'portal') {
        drawText('Portal Activated', 300, 250);
        drawText('Press Enter to Next Floor', 280, 350);
    }

    requestAnimationFrame(update);
}

update();