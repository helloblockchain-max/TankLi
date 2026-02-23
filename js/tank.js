/**
 * tank.js
 * 游戏实体定义：子弹、粒子特效、玩家坦克
 */

class Bullet {
    constructor(x, y, angle, speed, damage, color, isPlayer) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.isPlayer = isPlayer; // true表示是玩家射出的，false表示敌人射出的
        this.radius = 4;
        this.active = true;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // 飞出屏幕即销毁
        if (this.x < 0 || this.x > GameConfig.canvasWidth || this.y < 0 || this.y > GameConfig.canvasHeight) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class Particle {
    constructor(x, y, color, type = 'spark') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.life = 1.0;
        this.decay = Utils.random(0.02, 0.05); // 生命衰减速度
        this.angle = Utils.random(0, Math.PI * 2);
        this.speed = Utils.random(1, 4);
        this.radius = Utils.random(1, 3);
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life -= this.decay;
        this.active = this.life > 0;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1.0;
    }
}

class PlayerTank {
    constructor(type) {
        const config = TankData[type];
        this.type = type;
        this.name = config.name;
        this.x = GameConfig.canvasWidth / 2;
        this.y = GameConfig.canvasHeight / 2;
        this.radius = 20; // 碰撞体积
        this.angle = -Math.PI / 2; // 车体朝向，默认向上
        this.turretAngle = -Math.PI / 2; // 炮塔朝向
        this.color = config.color;

        // 基础属性
        this.maxHp = config.maxHp;
        this.hp = this.maxHp;
        this.speed = config.speed;
        this.turnSpeed = config.turnSpeed;
        this.fireRate = config.fireRate;
        this.damage = config.damage;
        this.bulletSpeed = config.bulletSpeed;
        this.bulletColor = config.bulletColor;
        this.bounceProb = config.armorBounceProbability;

        // 冷却计时器
        this.lastFireTime = 0;
    }

    update() {
        if (this.hp <= 0) return;

        // 1. 处理移动 (W/S 或 上/下)
        let isMoving = false;
        const keys = GameState.keys;
        if (keys['w'] || keys['ArrowUp']) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            isMoving = true;
        }
        if (keys['s'] || keys['ArrowDown']) {
            this.x -= Math.cos(this.angle) * (this.speed * 0.6); // 倒车稍慢
            this.y -= Math.sin(this.angle) * (this.speed * 0.6);
            isMoving = true;
        }

        // 2. 处理车体旋转 (A/D 或 左/右)
        if (keys['a'] || keys['ArrowLeft']) {
            this.angle -= this.turnSpeed;
        }
        if (keys['d'] || keys['ArrowRight']) {
            this.angle += this.turnSpeed;
        }

        // 边界限制
        this.x = Math.max(this.radius, Math.min(GameConfig.canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GameConfig.canvasHeight - this.radius, this.y));

        // 3. 炮塔永远瞄准鼠标位置
        this.turretAngle = Math.atan2(GameState.mouse.y - this.y, GameState.mouse.x - this.x);

        // 4. 射击 (鼠标左键按下且冷却完毕)
        const now = Date.now();
        if (GameState.mouse.isDown && now - this.lastFireTime > this.fireRate) {
            this.fire();
            this.lastFireTime = now;
        }
    }

    fire() {
        // 炮口位置（坦克中心沿炮塔方向延伸）
        const barrelLength = this.radius * 1.5;
        const spawnX = this.x + Math.cos(this.turretAngle) * barrelLength;
        const spawnY = this.y + Math.sin(this.turretAngle) * barrelLength;

        const bullet = new Bullet(
            spawnX, spawnY, this.turretAngle, this.bulletSpeed, this.damage, this.bulletColor, true
        );
        GameState.bullets.push(bullet);
    }

    takeDamage(amount) {
        // --- 核心风控机制：跳弹计算 (Ricochet) ---
        // 抛一枚骰子
        const roll = Math.random();
        if (roll < this.bounceProb) {
            // 触发跳弹，完全免伤
            this.createRicochetEffect();
            return 0;
        }

        // 正常扣血
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.explode();
        }
        return amount; // 返回实际造成的伤害
    }

    createRicochetEffect() {
        // 播放基础叮当声 (用 AudioContext 或简单 HTML Audio，暂不加入以防跨域加载问题，用视觉替代)

        // 1. 产生火花粒子
        for (let i = 0; i < 8; i++) {
            GameState.particles.push(new Particle(this.x, this.y, '#ffeb3b'));
        }

        // 2. DOM 层浮现伤害减免文字
        const container = document.getElementById('ricochet-prompts');
        if (container) {
            const el = document.createElement('div');
            el.className = 'ricochet-text';
            el.innerText = 'RICOCHET!';
            // 稍作位置偏移
            el.style.left = (this.x + Utils.random(-20, 20)) + 'px';
            el.style.top = (this.y - this.radius - 30) + 'px';
            container.appendChild(el);

            // 动画结束后移除 DOM
            setTimeout(() => {
                el.remove();
            }, 1000);
        }
    }

    explode() {
        for (let i = 0; i < 30; i++) {
            GameState.particles.push(new Particle(this.x, this.y, ['#ff5722', '#d32f2f', '#ff9800'][Math.floor(Math.random() * 3)]));
        }
        GameConfig.isGameOver = true;
    }

    draw(ctx) {
        if (this.hp <= 0) return;

        // 绘制车身履带
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 左履带
        ctx.fillStyle = '#111';
        ctx.fillRect(-this.radius + 5, -this.radius - 5, this.radius * 2 - 10, 8);
        // 右履带
        ctx.fillRect(-this.radius + 5, this.radius - 3, this.radius * 2 - 10, 8);

        // 车身主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius + 5, this.radius * 2, this.radius * 2 - 10);

        ctx.restore();

        // 绘制炮塔 (独立旋转中心)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.turretAngle);

        // 炮管
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -3, this.radius * 1.5, 6);

        // 炮塔圆顶
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}
