/**
 * tank.js
 * 游戏实体定义：子弹、粒子特效、玩家坦克
 */

class Bullet {
    constructor(x, y, angle, speed, damage, color, isPlayer, isAOE = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.isPlayer = isPlayer; // true表示是玩家射出的，false表示敌人射出的
        this.isAOE = isAOE; // 特殊高爆弹
        this.radius = isAOE ? 6 : 4; // 高爆弹大一点
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

        // 惯性与速度矢量 (为了冰面打滑和更平滑的移动)
        this.vx = 0;
        this.vy = 0;

        // 特殊能力开关
        this.hasAOE = false;
        this.hasRegen = false;
        this.hasDualGuns = false;
        this.hasDash = false;
        this.lastDashTime = 0;

        // 冷却计时器
        this.lastFireTime = 0;
    }

    update() {
        if (this.hp <= 0) return;

        // 1. 处理移动输入 (W/S 或 上/下)
        const keys = GameState.keys;
        let accel = 0;

        if (keys['w'] || keys['ArrowUp']) {
            accel = this.speed * 0.1; // 加速度
        }
        if (keys['s'] || keys['ArrowDown']) {
            accel = -this.speed * 0.05; // 倒车加速度较小
        }

        // --- 冲刺技能 (Dash) ---
        const now = Date.now();
        if (this.hasDash && keys['Shift'] && now - this.lastDashTime > 3000) {
            // 3秒冷却的冲刺
            this.vx += Math.cos(this.angle) * this.speed * 4;
            this.vy += Math.sin(this.angle) * this.speed * 4;
            this.lastDashTime = now;
            Assets.playSound('explosion', false, 0.1); // 借用爆炸声做音效
            for (let i = 0; i < 5; i++) {
                GameState.particles.push(new Particle(this.x, this.y, '#03a9f4', 'spark'));
            }
        }

        // --- 应用速度矢量 ---
        this.vx += Math.cos(this.angle) * accel;
        this.vy += Math.sin(this.angle) * accel;

        // --- 环境摩擦力 (正常地面 vs 冰面) ---
        const friction = GameConfig.isIce ? 0.98 : 0.85; // 冰面摩擦力小，保留更多惯性 (打滑)
        this.vx *= friction;
        this.vy *= friction;

        // 缓存当前位置用于还原碰撞
        const oldX = this.x;
        const oldY = this.y;

        this.x += this.vx;
        this.y += this.vy;

        // --- 障碍物碰撞阻挡 ---
        for (let o of GameState.obstacles) {
            if (o.active && o.blocksMovement) {
                if (Utils.checkCollision(this, o)) {
                    // 撞到障碍物，退回原位并消除法向速度 (简单处理：全停)
                    this.x = oldX;
                    this.y = oldY;
                    this.vx = 0;
                    this.vy = 0;
                    break;
                }
            }
        }

        // 2. 处理车体旋转 (A/D 或 左/右)
        // 冰面上旋转会有点打滑（也可以让玩家难易自选，这里保持旋转正常，只平移打滑）
        if (keys['a'] || keys['ArrowLeft']) {
            this.angle -= this.turnSpeed;
        }
        if (keys['d'] || keys['ArrowRight']) {
            this.angle += this.turnSpeed;
        }

        // 防御越界 (改为地图大小)
        this.x = Math.max(this.radius, Math.min(GameConfig.mapSize.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GameConfig.mapSize.height - this.radius, this.y));

        // 3. 炮塔永远瞄准鼠标位置 (计算时加上相机的偏移量)
        const mouseWorldX = GameState.mouse.x + GameConfig.camera.x;
        const mouseWorldY = GameState.mouse.y + GameConfig.camera.y;
        this.turretAngle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);

        // 4. 射击 (鼠标左键按下且冷却完毕)
        if (GameState.mouse.isDown && now - this.lastFireTime > this.fireRate) {
            this.fire();
            this.lastFireTime = now;
        }

        // 5. 自动维修 (Regen)
        if (this.hasRegen && this.hp < this.maxHp) {
            this.hp += 0.02; // 每帧回血
            if (this.hp > this.maxHp) this.hp = this.maxHp;
        }
    }

    fire() {
        // 炮口位置（坦克中心沿炮塔方向延伸）
        const barrelLength = this.radius * 1.5;
        const spawnX = this.x + Math.cos(this.turretAngle) * barrelLength;
        const spawnY = this.y + Math.sin(this.turretAngle) * barrelLength;

        if (this.hasDualGuns) {
            // 双联装，稍微偏移两个子弹的角度或位置
            const offsetAngle = Math.PI / 2;
            const offsetDist = 8;

            const b1X = spawnX + Math.cos(this.turretAngle + offsetAngle) * offsetDist;
            const b1Y = spawnY + Math.sin(this.turretAngle + offsetAngle) * offsetDist;
            const b2X = spawnX + Math.cos(this.turretAngle - offsetAngle) * offsetDist;
            const b2Y = spawnY + Math.sin(this.turretAngle - offsetAngle) * offsetDist;

            GameState.bullets.push(new Bullet(b1X, b1Y, this.turretAngle, this.bulletSpeed, this.damage, this.bulletColor, true, this.hasAOE));
            GameState.bullets.push(new Bullet(b2X, b2Y, this.turretAngle, this.bulletSpeed, this.damage, this.bulletColor, true, this.hasAOE));
        } else {
            const bullet = new Bullet(
                spawnX, spawnY, this.turretAngle, this.bulletSpeed, this.damage, this.bulletColor, true, this.hasAOE
            );
            GameState.bullets.push(bullet);
        }

        Assets.playSound('fire', false, 0.4);
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

        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. 绘制车身底盘 (根据 this.angle 旋转)
        ctx.save();
        ctx.rotate(this.angle);

        const img = Assets.images[this.type];
        if (img) {
            // 假设贴图默认朝右(0度)，我们需要调整如果贴图原本是朝上的
            // 这里统一将我们的逻辑角度 (-PI/2 为上) 直接应用
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // 兜底绘制
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius, -this.radius + 5, this.radius * 2, this.radius * 2 - 10);
        }
        ctx.restore();

        // 2. 绘制炮塔 (根据 this.turretAngle 旋转)
        ctx.save();
        ctx.rotate(this.turretAngle);

        // 炮管
        ctx.fillStyle = '#111';
        ctx.fillRect(0, -3, this.radius * 1.5, 6);

        // 炮塔圆顶
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        ctx.restore(); // 恢复到 translate 之前
    }
}
