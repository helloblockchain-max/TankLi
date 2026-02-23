/**
 * level.js
 * 核心剧情关卡与升级系统控制
 */

const LevelConfig = [
    {
        id: 1,
        name: "破晓突围",
        desc: "晨雾弥漫的兵营废墟，轻微抵抗。目标：全歼所有轻型装甲车，积累本金。",
        bgConfig: { color: "#4a5c4e", grid: "#3d4c40" },
        duration: 30000, // 每关持续 30秒 简单演示
        spawnRate: 2000,
        enemyPool: ["light", "light"]
    },
    {
        id: 2,
        name: "夺桥遗恨",
        desc: "狭窄的石桥争夺战，遇到高机动的反装甲车。",
        bgConfig: { color: "#3e2723", grid: "#4e342e" }, // 泥地
        duration: 40000,
        spawnRate: 1500,
        enemyPool: ["light", "medium"]
    },
    {
        id: 3,
        name: "钢铁丛林",
        desc: "泥泞的森林，装甲集群编队。",
        bgConfig: { color: "#1b5e20", grid: "#2e7d32" }, // 深林绿
        duration: 50000,
        spawnRate: 1200,
        enemyPool: ["medium", "medium", "heavy"]
    },
    {
        id: 4,
        name: "风雪阿登",
        desc: "极寒天气打滑机制，遭遇精英虎王重坦伏击。",
        bgConfig: { color: "#cfd8dc", grid: "#e0e0e0" }, // 冰雪白
        duration: 50000,
        spawnRate: 1800, // 减慢刷新但都是重坦
        enemyPool: ["heavy", "heavy"]
    },
    {
        id: 5,
        name: "帝国毁灭 (最终战)",
        desc: "杀入秘密兵工厂，摧毁终极防御工事。",
        bgConfig: { color: "#212121", grid: "#b71c1c" }, // 钢铁厂内部红黑
        duration: 60000,
        spawnRate: 1000,
        enemyPool: ["light", "medium", "heavy"] // BOSS战稍后实现为特例
    }
];

// 升级系统投资面板
const UpgradeTrees = {
    tiger: [
        { id: 't_armor', name: '倾斜装甲锻造', desc: '提升30%基础跳弹率（高风控）', cost: 100 },
        { id: 't_gun', name: '88mm高爆炮', desc: '提升巨额单发伤害，速度略减', cost: 200 },
        { id: 't_hp', name: '战地维修槽', desc: '增加最大生命值+100', cost: 150 }
    ],
    sherman: [
        { id: 's_gun', name: '双联装副炮', desc: '射速翻倍，形成弹幕网（高频交易）', cost: 100 },
        { id: 's_engine', name: '涡轮超载', desc: '极大提升机动躲避导弹', cost: 150 },
        { id: 's_pierce', name: '钨芯穿甲弹', desc: '对所有敌人造成额外+30伤害', cost: 200 }
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

    // 更新关卡时间
    levelTimer += dt;
    if (levelTimer >= currentConf.duration) {
        // 完成本关，进入升级界面
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

    // 简单应用升级属性（实装）
    switch (opt.id) {
        case 't_armor': p.bounceProb += 0.3; break;
        case 't_gun': p.damage += 50; p.bulletSpeed -= 2; break;
        case 't_hp': p.maxHp += 100; p.hp += 100; break;
        case 's_gun': p.fireRate /= 2; break;
        case 's_engine': p.speed *= 1.5; break;
        case 's_pierce': p.damage += 30; break;
    }

    // 更新按钮状态
    renderUpgradeOptions();
    updateHUD();
}

function startNextLevel() {
    GameConfig.currentLevel++;
    const currentConf = LevelConfig[GameConfig.currentLevel - 1];

    document.getElementById('current-level').innerText = currentConf.id;
    document.getElementById('level-name').innerText = currentConf.name;

    hideAllScreens();
    document.getElementById('screen-hud').classList.remove('hidden');
    document.getElementById('screen-hud').classList.add('active');

    GameConfig.isPaused = false;
    lastTime = performance.now();
}

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
