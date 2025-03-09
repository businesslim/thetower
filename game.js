const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const modal = document.getElementById('modal');
const joystick = document.getElementById('joystick');
const knob = document.getElementById('joystick-knob');

// 캔버스 크기 조정 (모바일 반응형)
function resizeCanvas() {
    const size = Math.min(window.innerWidth, window.innerHeight * 4 / 3);
    canvas.width = Math.min(800, size);
    canvas.height = canvas.width * 3 / 4;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 게임 상태
let game = {
    state: 'start',
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
    x: canvas.width / 2,
    y: canvas.height / 2,
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
let touch = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };

// 키보드 이벤트
document.addEventListener('keydown', (e) => { 
    keys[e.key] = true; 
    if (e.key === 'Enter') handleEnter();
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// 터치 이벤트
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.state === 'start') {
        handleEnter();
        return;
    }
    const touchEvent = e.touches[0];
    touch.active = true;
    touch.startX = touchEvent.clientX - canvas.offsetLeft;
    touch.startY = touchEvent.clientY - canvas.offsetTop;
    joystick.style.display = 'block';
    joystick.style.left = `${touch.startX - 50}px`;
    joystick.style.top = `${touch.startY - 50}px`;
    knob.style.left = '30px';
    knob.style.top = '30px';
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touch.active) return;
    const touchEvent = e.touches[0];
    const currentX = touchEvent.clientX - canvas.offsetLeft;
    const currentY = touchEvent.clientY - canvas.offsetTop;
    touch.dx = currentX - touch.startX;
    touch.dy = currentY - touch.startY;
    const dist = Math.sqrt(touch.dx * touch.dx + touch.dy * touch.dy);
    const maxDist = 50; // 조이스틱 이동 반경
    if (dist > maxDist) {
        touch.dx = (touch.dx / dist) * maxDist;
        touch.dy = (touch.dy / dist) * maxDist;
    }
    knob.style.left = `${30 + touch.dx}px`;
    knob.style.top = `${30 + touch.dy}px`;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touch.active = false;
    touch.dx = 0;
    touch.dy = 0;
    joystick.style.display = 'none';
}, { passive: false });

// 적 생성
function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
    else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
    else { x = Math.random() * canvas.width; y = canvas.height; }
    const enemy = { x, y, size: 15, speed: player.baseSpeed * 0.5 * (1 + 0.03 * (game.floor - 1)) };
    enemies.push(enemy);
    return enemy;
}

// 플레이어 이동
function movePlayer() {
    player.moving = false;
    let dx = 0, dy = 0;

    // 키보드 입력
    if (keys['ArrowLeft'] && player.x - player.size > 0) dx = -1;
    if (keys['ArrowRight'] && player.x + player.size < canvas.width) dx = 1;
    if (keys['ArrowUp'] && player.y - player.size > 0) dy = -1;
    if (keys['ArrowDown'] && player.y + player.size < canvas.height) dy = 1;

    // 터치 입력
    if (touch.active) {
        dx = touch.dx / 50; // 조이스틱 이동 거리 비율
        dy = touch.dy / 50;
    }

    if (dx !== 0 || dy !== 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / dist) * player.speed;
        player.y += (dy / dist) * player.speed;
        player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
        player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
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
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) continue;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;

        if (dist < player.size + enemy.size && !player.invincible) {
            player.hearts--;
            player.invincible = true;
            player.invincibleTimer = 180;
            enemies.splice(i, 1);
            if (player.hearts <= 0) game.state = 'game_over';
        }
    }
}

// 총알 이동 및 충돌
function moveBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > bullet.speed) {
            bullet.x += (dx / dist) * bullet.speed;
            bullet.y += (dy / dist) * bullet.speed;
        } else if (!enemies.some(e => Math.sqrt((bullet.x - e.x) ** 2 + (bullet.y - e.y) ** 2) < bullet.size + e.size)) {
            bullets.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distToEnemy = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);
            if (distToEnemy < bullet.size + enemy.size) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                game.kills++;
                game.totalKills++;
                if (Math.random() < 0.05) items.push({ x: enemy.x, y: enemy.y, size: 15 });
                break;
            }
        }
    }
}

// 아이템 획득
function checkItems() {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const dist = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
        if (dist < player.size + item.size) {
            game.state = 'item_selection';
            generateDropItems();
            items.splice(i, 1);
        }
    }
}

// 드롭 아이템 생성
function generateDropItems() {
    dropItems = [
        { type: 'bomb', desc: 'Clear all enemies on this floor' },
        { type: 'double_pistol', desc: 'Fire 2 bullets at the same time' },
        { type: 'heal', desc: 'Heal 1 heart' },
        { type: 'portal', desc: 'Open a portal to the next floor' }
    ].sort(() => Math.random() - 0.5).slice(0, 2);
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
    const positions = [[canvas.width * 0.25, canvas.height * 0.75], [canvas.width * 0.45, canvas.height * 0.75], [canvas.width * 0.65, canvas.height * 0.75]].sort(() => Math.random() - 0.5);
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
    ctx.font = `${size * canvas.width / 800}px Arial`;
    ctx.fillText(text, x, y);
}

// 모달 표시
function showItemModal() {
    modal.style.display = 'block';
    modal.style.left = `${canvas.width / 2 - 150}px`;
    modal.style.top = `${canvas.height / 2 - 100}px`;
    modal.innerHTML = '<h2>Select Item</h2>';
    dropItems.forEach(item => {
        const button = document.createElement('button');
        button.innerHTML = `${item.type.replace('_', ' ')}<br>${item.desc}`;
        button.addEventListener('touchstart', () => selectDropItem(item));
        button.addEventListener('click', () => selectDropItem(item));
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

// Enter 및 터치 시작 처리
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
    player = { ...player, x: canvas.width / 2, y: canvas.height / 2, hearts: 3, maxHearts: 3, speed: 5, attackSpeed: 60, doubleShot: false, currentWeapon: 'Pistol' };
    game = { ...game, floor: 1, kills: 0, totalKills: 0 };
    resetFloor();
}

function resetFloor() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    enemies = [];
    for (let i = 0; i < 2; i++) spawnEnemy();
    bullets = [];
    items = [];
    game.kills = 0;
    game.startTime = performance.now();
    game.stageItemSelected = false;
    game.spawnTimer = 0;
    console.log('Floor reset:', { enemies: enemies.length, player: player.x, state: game.state });
}

// 메인 업데이트
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (game.state === 'start') {
        drawText('The Tower', canvas.width / 2 - 100, canvas.height / 2 - 50);
        drawText('Touch to Start', canvas.width / 2 - 120, canvas.height / 2 + 50, 'white', 24);
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
        drawText(`Weapon: ${player.currentWeapon}`, canvas.width - 200, 40, 'white', 24);

        if (game.kills >= 10 + (game.floor - 1)) {
            game.state = 'stage_clear';
            generateStageItems();
        }
    } else if (game.state === 'stage_clear') {
        const clearTime = Math.floor((performance.now() - game.startTime) / 1000);
        drawText('Stage Clear', canvas.width / 2 - 100, canvas.height / 2 - 100);
        drawText(`Enemies Killed: ${game.kills}`, canvas.width / 2 - 120, canvas.height / 2 - 50);
        drawText(`Clear Time: ${clearTime} sec`, canvas.width / 2 - 120, canvas.height / 2);
        stageItems.forEach(item => {
            ctx.fillStyle = 'gray';
            ctx.fillRect(item.x - 50, item.y - 25, 100, 50);
        });
        if (game.stageItemSelected) {
            drawText(`Selected: ${stageItems[0].text}`, canvas.width / 2 - 120, canvas.height / 2 + 50, 'yellow');
            drawText('Touch to Next Floor', canvas.width / 2 - 120, canvas.height / 2 + 100, 'white', 24);
        }
    } else if (game.state === 'game_over') {
        drawText(`You died at ${game.floor}${game.floor === 1 ? 'st' : game.floor === 2 ? 'nd' : game.floor === 3 ? 'rd' : 'th'} Floor`, canvas.width / 2 - 200, canvas.height / 2 - 50);
        drawText(`Total Enemies Killed: ${game.totalKills}`, canvas.width / 2 - 150, canvas.height / 2);
        drawText('Touch to Restart', canvas.width / 2 - 120, canvas.height / 2 + 50, 'white', 24);
    } else if (game.state === 'portal') {
        drawText('Portal Activated', canvas.width / 2 - 120, canvas.height / 2 - 50);
        drawText('Touch to Next Floor', canvas.width / 2 - 120, canvas.height / 2 + 50, 'white', 24);
    }

    requestAnimationFrame(update);
}

// 클릭 및 터치 이벤트 (스테이지 클리어 아이템 선택)
canvas.addEventListener('touchstart', (e) => {
    if (game.state === 'stage_clear' && !game.stageItemSelected) {
        const rect = canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;
        stageItems.forEach(item => {
            if (touchX > item.x - 50 && touchX < item.x + 50 && touchY > item.y - 25 && touchY < item.y + 25) {
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
}, { passive: false });

update();