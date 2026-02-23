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

        // 爆炸粒子
        for (let i = 0; i < 20; i++) {
            GameState.particles.push(new Particle(this.x, this.y, ['#ff9800', '#f44336', '#212121'][Math.floor(Math.random() * 3)]));
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // 车体
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 履带
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-this.radius + 5, -this.radius - 5, this.radius * 2 - 10, 8);
        ctx.fillRect(-this.radius + 5, this.radius - 3, this.radius * 2 - 10, 8);

        // 主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius + 5, this.radius * 2, this.radius * 2 - 10);

        ctx.restore();

        // 炮塔
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.turretAngle);

        // 炮管
        ctx.fillStyle = '#222';
        ctx.fillRect(0, -2, this.radius * 1.2, 4); // 敌军炮管稍细短

        // 炮塔本身 (方型或圆型)
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius * 0.5, -this.radius * 0.5, this.radius, this.radius);

        ctx.restore();
    }
}
