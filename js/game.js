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

    // 先进入加载状态
    document.getElementById('brand-message').innerText = "加载资产中...";
    Assets.loadAll(
        (progress) => {
            document.getElementById('brand-message').innerText = `加载战略物资: ${Math.floor(progress * 100)}%`;
        },
        () => {
            document.getElementById('brand-message').innerText = "马蛋制作";
            document.getElementById('btn-enter').addEventListener('click', showGarage);
            Assets.playSound('bgm_menu', true, 0.5); // 播放主菜单BGM
        }
    );
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

function selectTank(tankType) {
    GameState.playerTank = new PlayerTank(tankType);

    // 初始化关卡并显示简报，由简报界面的按钮来真正启动 gameLoop
    GameConfig.currentLevel = 1;
    const currentConf = LevelConfig[0];

    // 更新HUD初始数据
    updateHUD();

    // 触发第一关的剧情简报
    showStoryBriefing(currentConf);
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

    if (GameConfig.currentLevel === 5) {
        if (!GameConfig.bossSpawned && levelTimer > 8000) {
            GameConfig.bossSpawned = true;
            // BOSS从屏幕顶端中央入场
            GameState.enemies.push(new BossTank(GameConfig.mapSize.width / 2, 200));
            // BOSS入场怒吼声
            Assets.playSound('explosion', false, 0.8);
        }
        if (GameConfig.bossSpawned) return; // BOSS出来后，杂兵不再生成
    }

    enemySpawnTimer += dt;
    if (enemySpawnTimer > GameConfig.enemySpawnRate) {
        enemySpawnTimer = 0;

        // 随机四周边缘生成
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -30 : GameConfig.mapSize.width + 30;
            y = Math.random() * GameConfig.mapSize.height;
        } else {
            x = Math.random() * GameConfig.mapSize.width;
            y = Math.random() < 0.5 ? -30 : GameConfig.mapSize.height + 30;
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
        let collided = false;

        // 检查子弹是否打到障碍物
        for (let o = GameState.obstacles.length - 1; o >= 0; o--) {
            const obs = GameState.obstacles[o];
            if (obs.blocksBullets && Utils.checkCollision(bullet, obs)) {
                obs.takeDamage(bullet.damage);
                bullet.active = false;
                collided = true;
                triggerAOE(bullet); // 触发AOE
                GameState.particles.push(new Particle(bullet.x, bullet.y, '#fff'));
                break;
            }
        }
        if (collided) continue;

        // 1. 玩家的子弹打到敌人
        if (bullet.isPlayer) {
            for (let e = GameState.enemies.length - 1; e >= 0; e--) {
                const enemy = GameState.enemies[e];
                if (Utils.checkCollision(bullet, enemy)) {
                    enemy.takeDamage(bullet.damage);
                    bullet.active = false; // 子弹消失
                    triggerAOE(bullet); // 触发AOE
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

// 高爆弹 AOE 结算
function triggerAOE(bullet) {
    if (!bullet.isAOE) return;

    const aoeRadius = 80;
    const aoeDamage = bullet.damage * 0.5; // 溅射伤害为 50%

    // 生成大爆炸视觉特效
    Assets.playSound('explosion', false, 0.4);
    for (let i = 0; i < 30; i++) {
        GameState.particles.push(new Particle(bullet.x, bullet.y, ['#ff5722', '#ff9800', '#ffeb3b'][Math.floor(Math.random() * 3)]));
    }

    // 找出所有在半径内的敌人并给予伤害
    GameState.enemies.forEach(enemy => {
        let dx = enemy.x - bullet.x;
        let dy = enemy.y - bullet.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= aoeRadius + enemy.radius) {
            enemy.takeDamage(aoeDamage);
        }
    });

    // AOE也会破坏附近的障碍物
    GameState.obstacles.forEach(obs => {
        let dx = obs.x - bullet.x;
        let dy = obs.y - bullet.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= aoeRadius + obs.radius) {
            obs.takeDamage(aoeDamage);
        }
    });
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
    GameState.obstacles = GameState.obstacles.filter(o => o.active);
    GameState.particles = GameState.particles.filter(p => p.active);
}

// 渲染背景地形 (格子状泥地)
function drawBackground() {
    ctx.fillStyle = GameConfig.currentBgColor || '#4a5c4e'; // 军绿色
    // 只绘制画布大小，因为我们在改变视口
    ctx.fillRect(0, 0, GameConfig.canvasWidth, GameConfig.canvasHeight);

    ctx.strokeStyle = GameConfig.currentGridColor || '#3d4c40';
    ctx.lineWidth = 1;
    const gridSize = 100;

    // 根据相机偏移绘制网格
    const offsetX = GameConfig.camera.x % gridSize;
    const offsetY = GameConfig.camera.y % gridSize;

    for (let x = -offsetX; x < GameConfig.canvasWidth; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GameConfig.canvasHeight); ctx.stroke();
    }
    for (let y = -offsetY; y < GameConfig.canvasHeight; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GameConfig.canvasWidth, y); ctx.stroke();
    }
}

function updateCamera() {
    if (!GameState.playerTank) return;
    const p = GameState.playerTank;

    // 摄像机镜头平滑跟随玩家中心
    let targetX = p.x - GameConfig.canvasWidth / 2;
    let targetY = p.y - GameConfig.canvasHeight / 2;

    // 将镜头限制在地图边界内
    targetX = Math.max(0, Math.min(GameConfig.mapSize.width - GameConfig.canvasWidth, targetX));
    targetY = Math.max(0, Math.min(GameConfig.mapSize.height - GameConfig.canvasHeight, targetY));

    // 渐变跟随插值
    GameConfig.camera.x += (targetX - GameConfig.camera.x) * 0.1;
    GameConfig.camera.y += (targetY - GameConfig.camera.y) * 0.1;
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

        // 核心：推算摄像机位置
        updateCamera();

        // --- 图像渲染 ---
        ctx.clearRect(0, 0, GameConfig.canvasWidth, GameConfig.canvasHeight);
        drawBackground();

        ctx.save();
        // 应用摄像机平移偏移量
        ctx.translate(-GameConfig.camera.x, -GameConfig.camera.y);

        // 渲染顺序底到高：底图网格(已画) -> 障碍物 -> 敌人/玩家 -> 子弹 -> 粒子特效
        GameState.obstacles.forEach(o => o.draw(ctx));
        GameState.enemies.forEach(e => e.draw(ctx));
        if (GameState.playerTank) GameState.playerTank.draw(ctx);
        GameState.bullets.forEach(b => b.draw(ctx));
        GameState.particles.forEach(p => p.draw(ctx));

        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// The startup is now handled when clicking "收到，出击！" in resumeGame
let loopStarted = false;

function resumeGame() {
    hideAllScreens();
    document.getElementById('screen-hud').classList.remove('hidden');
    document.getElementById('screen-hud').classList.add('active');

    GameConfig.isPaused = false;

    if (!loopStarted) {
        Assets.playSound('bgm_battle', true, 0.4); // 播放战斗BGM
        startGameLoop();
        loopStarted = true;
    } else {
        lastTime = performance.now();
    }
}
