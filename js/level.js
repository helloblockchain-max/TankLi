/**
 * level.js
 * 核心剧情关卡与升级系统控制
 */

const LevelConfig = [
    {
        id: 1,
        name: "破晓突围",
        desc: "【军团长密令】\n“指挥官，我是老K。敌军昨晚突袭了我们的营地。\n现在大雾弥漫，是你突围的最佳时机。\n打垮挡路的那些破铜烂铁，活着出来！”",
        bgConfig: { color: "#4a5c4e", grid: "#3d4c40" },
        duration: 60000,
        spawnRate: 2000,
        enemyPool: ["light", "light"],
        mapSize: { w: 1600, h: 1200 },
        obstacles: 10,
        obsType: 'wall'
    },
    {
        id: 2,
        name: "夺桥遗恨",
        desc: "【前线侦察】\n“前方是我们必须夺下的石桥通道。\n敌军部署了高机动巡逻队。保持移动，不要被包抄！”",
        bgConfig: { color: "#3e2723", grid: "#4e342e" },
        duration: 80000,
        spawnRate: 1500,
        enemyPool: ["light", "medium"],
        mapSize: { w: 2000, h: 1000 }, // 狭长地图
        obstacles: 20,
        obsType: 'wall' // 墙体会阻挡子弹
    },
    {
        id: 3,
        name: "钢铁丛林",
        desc: "【战区通报】\n“进入深林腹地。雷达显示大量中型装甲正在逼近。\n稳扎稳打，不要陷入缠斗！”",
        bgConfig: { color: "#1b5e20", grid: "#2e7d32" },
        duration: 100000,
        spawnRate: 1200,
        enemyPool: ["medium", "medium", "heavy"],
        mapSize: { w: 2500, h: 2500 },
        obstacles: 50,
        obsType: 'tree'
    },
    {
        id: 4,
        name: "风雪阿登",
        desc: "【黑色预警】\n“暴风雪来了，前方冰面极度打滑。\n注意，敌方的王牌‘虎王’编队就潜伏在四周。\n利用跳弹风控机制生存下来！”",
        bgConfig: { color: "#cfd8dc", grid: "#e0e0e0" },
        duration: 100000,
        spawnRate: 1800,
        enemyPool: ["heavy", "heavy"],
        mapSize: { w: 3000, h: 3000 },
        obstacles: 30,
        obsType: 'tree',
        isIce: true // 特殊的冰面打滑物理机制
    },
    {
        id: 5,
        name: "帝国毁灭",
        desc: "【终局清算】\n“我们已经潜入敌军的中央兵工厂。\n没有退路了！全军出击，摧毁这里的一切！\n为了初中生的马蛋！”",
        bgConfig: { color: "#212121", grid: "#b71c1c" },
        duration: 120000,
        spawnRate: 1000,
        enemyPool: ["light", "medium", "heavy"],
        mapSize: { w: 2000, h: 3000 },
        obstacles: 20,
        obsType: 'wall'
    }
];

// 升级系统投资面板
const UpgradeTrees = {
    tiger: [
        { id: 't_armor', name: '倾斜装甲锻造', desc: '提升30%基础跳弹率（高风控）', cost: 70 },
        { id: 't_gun', name: '88mm高爆炮', desc: '提升巨额单发伤害，速度略减', cost: 140 },
        { id: 't_hp', name: '战地维修槽', desc: '增加最大生命值+100', cost: 105 }
    ],
    sherman: [
        { id: 's_gun', name: '双联装副炮', desc: '射速翻倍，形成弹幕网（高频交易）', cost: 70 },
        { id: 's_engine', name: '涡轮超载', desc: '极大提升机动躲避导弹', cost: 105 },
        { id: 's_pierce', name: '钨芯穿甲弹', desc: '对所有敌人造成额外+30伤害', cost: 140 }
    ]
};

// 当前关卡状态
let levelTimer = 0;

function updateLevelProgress(dt) {
    if (GameConfig.isGameOver) return;

    // 取当前关卡配置
    const currentConf = LevelConfig[GameConfig.currentLevel - 1];
    if (!currentConf) return; // 通关

    // 更新背景颜色等属性 (注入给 drawBackground)
    GameConfig.currentBgColor = currentConf.bgConfig.color;
    GameConfig.currentGridColor = currentConf.bgConfig.grid;
    GameConfig.enemySpawnRate = currentConf.spawnRate;
    if (currentConf.mapSize) {
        GameConfig.mapSize = {
            width: Math.max(window.innerWidth, currentConf.mapSize.w),
            height: Math.max(window.innerHeight, currentConf.mapSize.h)
        };
    }

    // 更新关卡时间
    levelTimer += dt;
    // 进度条或时间显示在HUD（可选功能）
    const remainingTimer = Math.max(0, currentConf.duration - levelTimer) / 1000;
    const timeDisplay = document.getElementById('level-timer-ui');
    if (timeDisplay) timeDisplay.innerText = "防线倒计时: " + Math.ceil(remainingTimer) + "s";

    if (levelTimer >= currentConf.duration && GameConfig.currentLevel < 5) {
        // 完成本关，进入升级界面 (第五关打死BOSS才结束，不以时间结算)
        completeLevel();
    }
}

function completeLevel() {
    GameConfig.isPaused = true;
    levelTimer = 0; // 重置本关计时器
    GameState.bullets = []; // 清空同屏子弹
    GameState.enemies = []; // 清空同屏敌人

    if (GameConfig.currentLevel >= 5) {
        showVictoryScreen();
        return;
    }

    // 弹出升级界面
    hideAllScreens();
    document.getElementById('screen-upgrade').classList.remove('hidden');
    document.getElementById('screen-upgrade').classList.add('active');

    renderUpgradeOptions();
}

function renderUpgradeOptions() {
    const container = document.getElementById('upgrade-options');
    container.innerHTML = ''; // 清空中

    // 当前金钱显示
    const fundsDisplay = document.createElement('h3');
    fundsDisplay.innerHTML = `当前可用资金: <span style="color:#ffb300">${GameConfig.funds}</span>`;
    container.appendChild(fundsDisplay);

    const type = GameState.playerTank.type;
    const options = UpgradeTrees[type];

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerHTML = `${opt.name} - 💰${opt.cost}<br><small style="font-size:0.8em; color:#ccc;">${opt.desc}</small>`;

        if (GameConfig.funds >= opt.cost) {
            btn.onclick = () => purchaseUpgrade(opt);
        } else {
            btn.classList.add('disabled');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
        container.appendChild(btn);
    });

    // 下一关按钮
    const nextBtn = document.getElementById('btn-next-level');
    nextBtn.classList.remove('hidden');
    nextBtn.onclick = () => startNextLevel();
}

function purchaseUpgrade(opt) {
    if (GameConfig.funds < opt.cost) return;
    GameConfig.funds -= opt.cost;

    const p = GameState.playerTank;

    // 简单应用升级属性与特殊能力（实装）
    switch (opt.id) {
        case 't_armor': p.bounceProb += 0.3; break;
        case 't_gun': p.damage += 30; p.bulletSpeed = Math.max(4, p.bulletSpeed - 2); p.hasAOE = true; break;
        case 't_hp': p.maxHp += 100; p.hp += 100; p.hasRegen = true; break;
        case 's_gun': p.fireRate /= 1.5; p.hasDualGuns = true; break;
        case 's_engine': p.speed *= 1.2; p.hasDash = true; break;
        case 's_pierce': p.damage += 30; break;
    }

    // 更新按钮状态
    renderUpgradeOptions();
    updateHUD();
}

function startNextLevel() {
    GameConfig.currentLevel++;
    GameConfig.bossSpawned = false; // 重置boss状态
    const currentConf = LevelConfig[GameConfig.currentLevel - 1];

    document.getElementById('current-level').innerText = currentConf.id;
    document.getElementById('level-name').innerText = currentConf.name;

    // 播放关卡提示弹窗
    showStoryBriefing(currentConf);
}

function showStoryBriefing(currentConf) {
    hideAllScreens();
    const briefingScreen = document.getElementById('screen-briefing');
    if (!briefingScreen) {
        // 兼容没有这个DOM的情况，直接开始
        resumeGame();
        return;
    }

    briefingScreen.classList.remove('hidden');
    briefingScreen.classList.add('active');

    document.getElementById('briefing-title').innerText = `第 ${currentConf.id} 战区: ${currentConf.name}`;
    document.getElementById('briefing-text').innerText = currentConf.desc;

    // 生成该关卡的障碍物
    GameState.obstacles = [];
    if (currentConf.obstacles) {
        for (let i = 0; i < currentConf.obstacles; i++) {
            let ox = Utils.random(100, GameConfig.mapSize.width - 100);
            let oy = Utils.random(100, GameConfig.mapSize.height - 100);

            // 避免生成在地图中心（玩家复活点附近）
            let cx = GameConfig.mapSize.width / 2;
            let cy = GameConfig.mapSize.height / 2;
            if (Math.sqrt((ox - cx) ** 2 + (oy - cy) ** 2) < 200) {
                ox += 400; // 偏移出安全区
            }

            let obsType = currentConf.obsType || 'wall';
            GameState.obstacles.push(new Obstacle(ox, oy, {
                type: obsType,
                radius: Utils.random(30, 60),
                destructible: true,
                hp: obsType === 'tree' ? 50 : 200,
                color: obsType === 'tree' ? '#2e7d32' : '#5d4037'
            }));
        }
    }

    // 注入冰面机制
    GameConfig.isIce = currentConf.isIce === true;

    // 重置玩家位置到地图中心
    if (GameState.playerTank) {
        GameState.playerTank.x = GameConfig.mapSize.width / 2;
        GameState.playerTank.y = GameConfig.mapSize.height / 2;
        GameState.playerTank.vx = 0;
        GameState.playerTank.vy = 0;
    }
}

// resumeGame() is now inside game.js

function showVictoryScreen() {
    hideAllScreens();
    const overScreen = document.getElementById('screen-gameover');
    overScreen.innerHTML = `
        <h1 style="color:#ffb300">战争胜利</h1>
        <p>你打爆了空头，实现了财富自由！为了爸爸的马蛋！</p>
        <button class="btn primary-btn" onclick="location.reload()">重新开启另一个周期</button>
    `;
    overScreen.classList.remove('hidden');
    overScreen.classList.add('active');
}
