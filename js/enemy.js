/**
 * enemy.js
 * 敌人坦克逻辑与行为树（简单 AI）
 */

const EnemyTypes = {
    light: {
        hp: 30,
        speed: 1.5,
        damage: 10,
        fireRate: 2000,
        color: '#795548', // 褐色涂装
        reward: 10 // 战争债券收益
    },
    medium: {
        hp: 60,
        speed: 1.2,
        damage: 20,
        fireRate: 3000,
        color: '#607d8b', // 蓝灰色
        reward: 25
    },
    heavy: {
        hp: 150,
        speed: 0.8,
        damage: 40,
        fireRate: 4000,
        color: '#bdbdbd', // 冰雪白
        reward: 50
    }
};

class EnemyTank {
    constructor(x, y, typeConf) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.type = typeConf;

        this.hp = typeConf.hp;
        this.speed = typeConf.speed;
        this.damage = typeConf.damage;
        this.fireRate = typeConf.fireRate;
        this.color = typeConf.color;
        this.reward = typeConf.reward;

        this.angle = 0;
        this.turretAngle = 0;
        this.lastFireTime = Date.now() + Utils.random(0, 1000); // 错开初始开火时间

        this.active = true;
        this.state = 'CHASE'; // 简单状态机：追踪或徘徊
    }

    update() {
        if (!GameState.playerTank || GameState.playerTank.hp <= 0) return;

        const player = GameState.playerTank;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. 瞄准玩家 (炮塔始终跟随)
        this.turretAngle = Math.atan2(dy, dx);

        // 2. 移动逻辑 (保持一定距离射击，太远则靠近)
        const optimalDist = 200;
        if (dist > optimalDist) {
            this.state = 'CHASE';
            // 车体缓缓转向玩家
            let targetAngle = Math.atan2(dy, dx);
            // 简单插值转向
            this.angle += (targetAngle - this.angle) * 0.1;

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        } else {
            this.state = 'SHOOTING';
            // 可以加入左右平移逻辑
        }

        // 防御越界
        this.x = Math.max(this.radius, Math.min(GameConfig.canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GameConfig.canvasHeight - this.radius, this.y));

        // 3. 射击逻辑
        const now = Date.now();
        if (now - this.lastFireTime > this.fireRate && dist < 500) { // 射程内开火
            this.fire();
            this.lastFireTime = now;
        }
    }

    fire() {
        // 敌人子弹速度稍慢于玩家
        const bulletSpeed = 5;
        const barrelLength = this.radius * 1.5;
        const spawnX = this.x + Math.cos(this.turretAngle) * barrelLength;
        const spawnY = this.y + Math.sin(this.turretAngle) * barrelLength;

        // isPlayer = false 表示敌军子弹
        const bullet = new Bullet(
            spawnX, spawnY, this.turretAngle, bulletSpeed, this.damage, '#ff5252', false
        );
        GameState.bullets.push(bullet);
        Assets.playSound('fire', false, 0.2); // 敌人声音轻一点
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.explode();
        }
    }

    explode() {
        this.active = false;
        // 增加资金
        GameConfig.funds += this.reward;
        updateHUD(); // 调用主程序的UI更新
        Assets.playSound('explosion', false, 0.5);

        // 爆炸粒子
        for (let i = 0; i < 20; i++) {
            GameState.particles.push(new Particle(this.x, this.y, ['#ff9800', '#f44336', '#212121'][Math.floor(Math.random() * 3)]));
        }
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.save();
        ctx.rotate(this.angle);

        // 尝试获取对应的敌人贴图
        let key = 'enemy_light';
        if (this.type === EnemyTypes.medium) key = 'enemy_medium';
        if (this.type === EnemyTypes.heavy) key = 'enemy_heavy';

        const img = Assets.images[key];

        if (img) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // 兜底方形
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius, -this.radius + 5, this.radius * 2, this.radius * 2 - 10);
        }
        ctx.restore();

        // 炮塔
        ctx.save();
        ctx.rotate(this.turretAngle);

        // 炮管
        ctx.fillStyle = '#222';
        ctx.fillRect(0, -2, this.radius * 1.2, 4);

        // 炮塔本身 (如果图片带有炮塔，这部分可以在最终精磨美术时去掉。目前保留兜底炮塔)
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius * 0.5, -this.radius * 0.5, this.radius, this.radius);

        ctx.restore();

        ctx.restore(); // 恢复translate
    }
}

// 终极BOSS坦克
class BossTank extends EnemyTank {
    constructor(x, y) {
        super(x, y, {
            hp: 2000,
            speed: 0.5,
            damage: 60,
            fireRate: 200, // 极高射速
            color: '#c62828', // 暗红
            reward: 1000
        });

        this.radius = 60; // 巨大体型
        this.isBoss = true;

        // 多炮塔系统: 主炮塔 + 两个副炮塔
        this.subTurretAngle1 = 0;
        this.subTurretAngle2 = 0;

        this.attackPatternPhase = 0; // 0: tracking, 1: bullet hell
        this.phaseTimer = 0;
    }

    update() {
        if (!GameState.playerTank || GameState.playerTank.hp <= 0) return;

        const player = GameState.playerTank;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 缓慢移动向玩家
        let targetAngle = Math.atan2(dy, dx);
        this.angle += (targetAngle - this.angle) * 0.02;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        this.x = Math.max(this.radius, Math.min(GameConfig.mapSize.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GameConfig.mapSize.height - this.radius, this.y));

        // 炮塔独立逻辑
        this.phaseTimer += 16;
        if (this.phaseTimer > 5000) {
            this.attackPatternPhase = (this.attackPatternPhase + 1) % 2;
            this.phaseTimer = 0;
        }

        if (this.attackPatternPhase === 0) {
            // 阶段一：全炮塔集火玩家
            this.turretAngle = targetAngle;
            this.subTurretAngle1 = targetAngle + 0.2;
            this.subTurretAngle2 = targetAngle - 0.2;
        } else {
            // 阶段二：弹幕洗地，炮塔自旋
            this.turretAngle += 0.05;
            this.subTurretAngle1 -= 0.08;
            this.subTurretAngle2 += 0.08;
        }

        const now = Date.now();
        if (now - this.lastFireTime > this.fireRate && dist < 1200) { // 超远射程
            this.fireMulti();
            this.lastFireTime = now;
        }
    }

    fireMulti() {
        // 主炮
        this.spawnBullet(this.turretAngle, 6, this.damage);

        // 副炮
        if (this.attackPatternPhase === 1 || Math.random() < 0.3) {
            this.spawnBullet(this.subTurretAngle1, 4, 15);
            this.spawnBullet(this.subTurretAngle2, 4, 15);
        }

        Assets.playSound('fire', false, 0.5);
    }

    spawnBullet(angle, speed, dmg) {
        const barrelLength = this.radius + 10;
        const spawnX = this.x + Math.cos(angle) * barrelLength;
        const spawnY = this.y + Math.sin(angle) * barrelLength;
        // Boss 默认使用高爆AOE的标记
        GameState.bullets.push(new Bullet(spawnX, spawnY, angle, speed, dmg, '#ffff00', false, true));
    }

    explode() {
        super.explode();
        // 游戏通关大爆
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                GameState.particles.push(new Particle(
                    this.x + Utils.random(-this.radius, this.radius),
                    this.y + Utils.random(-this.radius, this.radius),
                    ['#ff9800', '#f44336', '#ffffff'][Math.floor(Math.random() * 3)]
                ));
                Assets.playSound('explosion', false, 0.5);
            }, i * 50);
        }

        // 触发最终胜利逻辑
        setTimeout(() => {
            showVictoryScreen();
        }, 6000); // 6秒后胜利，欣赏爆炸
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.save();
        ctx.rotate(this.angle);

        const img = Assets.images['enemy_boss'];
        if (img) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // 兜底六边形或巨无霸方块
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius, -this.radius + 10, this.radius * 2, this.radius * 2 - 20);
            ctx.fillStyle = '#111';
            ctx.fillRect(-this.radius - 10, -this.radius + 20, 10, this.radius * 2 - 40);
            ctx.fillRect(this.radius, -this.radius + 20, 10, this.radius * 2 - 40);
        }

        ctx.restore();

        // 绘制BOSS血条 (浮在上方)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-this.radius, -this.radius - 20, this.radius * 2, 8);
        ctx.fillStyle = '#4caf50';
        const hpPercent = Math.max(0, this.hp / 2000);
        ctx.fillRect(-this.radius, -this.radius - 20, this.radius * 2 * hpPercent, 8);

        // 主炮塔
        ctx.save();
        ctx.rotate(this.turretAngle);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, -6, this.radius * 1.5, 12);
        ctx.fillStyle = '#ff5252';
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 副炮塔1
        ctx.save();
        ctx.translate(this.radius * 0.4, -this.radius * 0.4);
        ctx.rotate(this.subTurretAngle1);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -3, 30, 6);
        ctx.fillStyle = '#777';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 副炮塔2
        ctx.save();
        ctx.translate(this.radius * 0.4, this.radius * 0.4);
        ctx.rotate(this.subTurretAngle2);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -3, 30, 6);
        ctx.fillStyle = '#777';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}
