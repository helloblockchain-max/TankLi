/**
 * game.js
 * 主逻辑控制器、碰撞结算与渲染循环
 */

let canvas, ctx;
let lastTime = 0;
let enemySpawnTimer = 0;

function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 强制画布尺寸同步
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 绑定开始按钮
    document.getElementById('btn-enter').addEventListener('click', showGarage);
}

// UI 切换逻辑
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active', 'hidden'));
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
}

function showGarage() {
    hideAllScreens();
    document.getElementById('screen-garage').classList.remove('hidden');
    document.getElementById('screen-garage').classList.add('active');
}

// 玩家选择坦克投入战斗
function selectTank(tankType) {
    GameState.playerTank = new PlayerTank(tankType);

    hideAllScreens();
    document.getElementById('screen-hud').classList.remove('hidden');
    document.getElementById('screen-hud').classList.add('active'); // 虽然 HUD 不用 flex 但为了统一

    updateHUD();
    startGameLoop();
}

// 更新界面数据
function updateHUD() {
    if (!GameState.playerTank) return;

    document.getElementById('hp-val').innerText = Math.round(GameState.playerTank.hp);
    document.getElementById('hp-max').innerText = GameState.playerTank.maxHp;

    const hpPercent = Math.max(0, (GameState.playerTank.hp / GameState.playerTank.maxHp) * 100);
    const hpBar = document.getElementById('health-bar');
    hpBar.style.width = hpPercent + '%';

    // 血量变色
    if (hpPercent > 50) hpBar.style.backgroundColor = '#388e3c'; // 绿
    else if (hpPercent > 20) hpBar.style.backgroundColor = '#fbc02d'; // 黄
    else hpBar.style.backgroundColor = '#d32f2f'; // 红

    document.getElementById('funds').innerText = GameConfig.funds;
}

// 敌人生成逻辑 (根据当前关卡动态调整)
function spawnEnemyGenerator(dt) {
    if (GameConfig.isGameOver) return;

    enemySpawnTimer += dt;
    if (enemySpawnTimer > GameConfig.enemySpawnRate) {
        enemySpawnTimer = 0;

        // 随机四周边缘生成
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -30 : GameConfig.canvasWidth + 30;
            y = Math.random() * GameConfig.canvasHeight;
        } else {
            x = Math.random() * GameConfig.canvasWidth;
            y = Math.random() < 0.5 ? -30 : GameConfig.canvasHeight + 30;
        }

        // 根据关卡决定敌人类型权重
        // Level 1: 全是 Light
        let typeConf = EnemyTypes.light;

        if (GameConfig.currentLevel >= 2) {
            // Level 2 开始混入中型
            if (Math.random() > 0.7) typeConf = EnemyTypes.medium;
        }

        GameState.enemies.push(new EnemyTank(x, y, typeConf));
    }
}

// 核心碰撞结算与伤害判定
function checkCollisionsAndDamage() {
    const player = GameState.playerTank;
    if (!player || player.hp <= 0) return;

    for (let b = GameState.bullets.length - 1; b >= 0; b--) {
        const bullet = GameState.bullets[b];

        // 1. 玩家的子弹打到敌人
        if (bullet.isPlayer) {
            for (let e = GameState.enemies.length - 1; e >= 0; e--) {
                const enemy = GameState.enemies[e];
                if (Utils.checkCollision(bullet, enemy)) {
                    enemy.takeDamage(bullet.damage);
                    bullet.active = false; // 子弹消失
                    // 产生小型粒子
                    GameState.particles.push(new Particle(bullet.x, bullet.y, '#fff'));
                    break;
                }
            }
        }
        // 2. 敌军的子弹打到玩家
        else {
            if (Utils.checkCollision(bullet, player)) {
                bullet.active = false; // 子弹消失
                // 玩家受到伤害（内部含跳弹判定Ricochet机制）
                player.takeDamage(bullet.damage);
                updateHUD();

                if (player.hp <= 0) {
                    gameOver();
                }
            }
        }
    }
}

function gameOver() {
    GameConfig.isGameOver = true;
    setTimeout(() => {
        hideAllScreens();
        document.getElementById('screen-gameover').classList.remove('hidden');
        document.getElementById('screen-gameover').classList.add('active');
    }, 1500); // 延迟展示结束画面，看看爆炸
}

// 清理失效对象
function gc() {
    GameState.bullets = GameState.bullets.filter(b => b.active);
    GameState.enemies = GameState.enemies.filter(e => e.active);
    GameState.particles = GameState.particles.filter(p => p.active);
}

// 渲染背景地形 (格子状泥地)
function drawBackground() {
    ctx.fillStyle = GameConfig.currentBgColor || '#4a5c4e'; // 军绿色
    ctx.fillRect(0, 0, GameConfig.canvasWidth, GameConfig.canvasHeight);

    ctx.strokeStyle = GameConfig.currentGridColor || '#3d4c40';
    ctx.lineWidth = 1;
    const gridSize = 100;

    // 简单的网格背景增加速度感
    for (let x = 0; x < GameConfig.canvasWidth; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GameConfig.canvasHeight); ctx.stroke();
    }
    for (let y = 0; y < GameConfig.canvasHeight; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GameConfig.canvasWidth, y); ctx.stroke();
    }
}

// 主渲染与更新循环
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime || performance.now() - lastTime;
    lastTime = timestamp;

    if (!GameConfig.isPaused) {
        // --- 逻辑更新 ---
        updateLevelProgress(dt);
        spawnEnemyGenerator(dt);

        if (GameState.playerTank) GameState.playerTank.update();

        GameState.enemies.forEach(e => e.update());
        GameState.bullets.forEach(b => b.update());
        GameState.particles.forEach(p => p.update());

        checkCollisionsAndDamage();
        gc();

        // --- 图像渲染 ---
        ctx.clearRect(0, 0, GameConfig.canvasWidth, GameConfig.canvasHeight);
        drawBackground();

        // 渲染顺序底到高：粒子底 -> 敌人/玩家 -> 子弹 -> 火花顶
        GameState.enemies.forEach(e => e.draw(ctx));
        if (GameState.playerTank) GameState.playerTank.draw(ctx);
        GameState.bullets.forEach(b => b.draw(ctx));
        GameState.particles.forEach(p => p.draw(ctx));
    }

    requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// 独立启动点
window.onload = init;
