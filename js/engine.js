/**
 * engine.js
 * 游戏核心配置与全局对象管理
 */

const GameConfig = {
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    camera: { x: 0, y: 0 },
    mapSize: { width: window.innerWidth * 2, height: window.innerHeight * 2 }, // 大地图
    FPS: 60,
    enemySpawnRate: 2000,  // 初始敌人生成间隔(ms)
    funds: 0,
    currentLevel: 1,
    isGameOver: false,
    isPaused: false
};

// 全局游戏状态
const GameState = {
    playerTank: null,
    enemies: [],
    bullets: [],
    obstacles: [], // 环境障碍物
    particles: [], // 用于跳弹火花、爆炸等特效
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false, a: false, s: false, d: false,
        Space: false // 用于手动开火（可选）
    },
    mouse: {
        x: 0,
        y: 0,
        isDown: false
    }
};

// 各种坦克的静态配置数据 (投资策略的选择)
const TankData = {
    tiger: {
        name: "虎式重型坦克",
        color: "#5c5c5c", // 德国灰
        maxHp: 200,
        speed: 2.0,
        turnSpeed: 0.03, // 弧度/帧
        fireRate: 800, // ms 每次开火间隔
        damage: 50,
        bulletSpeed: 8,
        bulletColor: "#ff9800",
        armorBounceProbability: 0.3 // 30% 基础跳弹率
    },
    sherman: {
        name: "谢尔曼中型坦克",
        color: "#4caf50", // 橄榄绿
        maxHp: 100,
        speed: 4.5, // 极高机动
        turnSpeed: 0.06,
        fireRate: 250, // 高频机枪/副炮
        damage: 15,
        bulletSpeed: 12,
        bulletColor: "#03a9f4",
        armorBounceProbability: 0.05 // 5% 基础跳弹率，跑酷流
    }
};

// 通用工具函数
const Utils = {
    // 监听键盘按键
    initInput() {
        window.addEventListener('keydown', (e) => {
            if (GameState.keys.hasOwnProperty(e.key)) GameState.keys[e.key] = true;
            if (GameState.keys.hasOwnProperty(e.key.toLowerCase())) GameState.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            if (GameState.keys.hasOwnProperty(e.key)) GameState.keys[e.key] = false;
            if (GameState.keys.hasOwnProperty(e.key.toLowerCase())) GameState.keys[e.key.toLowerCase()] = false;
        });

        // 鼠标瞄准与开火
        window.addEventListener('mousemove', (e) => {
            GameState.mouse.x = e.clientX;
            GameState.mouse.y = e.clientY;
        });
        window.addEventListener('mousedown', () => GameState.mouse.isDown = true);
        window.addEventListener('mouseup', () => GameState.mouse.isDown = false);

        // 自动调整画布大小
        window.addEventListener('resize', () => {
            GameConfig.canvasWidth = window.innerWidth;
            GameConfig.canvasHeight = window.innerHeight;
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        });
    },

    // 碰撞检测 (圆形碰撞)
    checkCollision(circle1, circle2) {
        let dx = circle1.x - circle2.x;
        let dy = circle1.y - circle2.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        return distance < circle1.radius + circle2.radius;
    },

    // 生成范围内随机数
    random(min, max) {
        return Math.random() * (max - min) + min;
    }
};

// 预加载调用
Utils.initInput();
