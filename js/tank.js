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

        // 飞出地图边界即销毁 (修复：之前用的是视口大小，导致大地图子弹提前消失)
        if (this.x < -20 || this.x > GameConfig.mapSize.width + 20 || this.y < -20 || this.y > GameConfig.mapSize.height + 20) {
            this.active = false;
        }
    }

    draw(ctx) {
        // 拖尾光效
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        const tailX = this.x - Math.cos(this.angle) * this.radius * 3;
        const tailY = this.y - Math.sin(this.angle) * this.radius * 3;
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // 弹头
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        // 发光效果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isAOE ? 15 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
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

        const keys = GameState.keys;
        const now = Date.now();

        // === 1. 方向键直接控制移动方向 (8方向) ===
        let moveX = 0, moveY = 0;
        if (keys['ArrowUp'] || keys['w']) moveY = -1;
        if (keys['ArrowDown'] || keys['s']) moveY = 1;
        if (keys['ArrowLeft'] || keys['a']) moveX = -1;
        if (keys['ArrowRight'] || keys['d']) moveX = 1;

        // 归一化对角线速度
        const moveMag = Math.sqrt(moveX * moveX + moveY * moveY);
        if (moveMag > 0) {
            moveX /= moveMag;
            moveY /= moveMag;

            // 车体自动朝向移动方向（平滑插值）
            const targetBodyAngle = Math.atan2(moveY, moveX);
            let angleDiff = targetBodyAngle - this.angle;
            // 归一化角度差到 [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.angle += angleDiff * 0.15; // 平滑转身

            // 施加加速度
            this.vx += moveX * this.speed * 0.12;
            this.vy += moveY * this.speed * 0.12;
        }

        // === 冲刺技能 (Dash) ===
        if (this.hasDash && keys['Shift'] && now - this.lastDashTime > 3000) {
            this.vx += moveX * this.speed * 5;
            this.vy += moveY * this.speed * 5;
            this.lastDashTime = now;
            Assets.playSound('explosion', false, 0.1);
            for (let i = 0; i < 5; i++) {
                GameState.particles.push(new Particle(this.x, this.y, '#03a9f4', 'spark'));
            }
        }

        // === 环境摩擦力 ===
        const friction = GameConfig.isIce ? 0.97 : 0.82;
        this.vx *= friction;
        this.vy *= friction;

        // 缓存位置
        const oldX = this.x;
        const oldY = this.y;

        this.x += this.vx;
        this.y += this.vy;

        // === 障碍物碰撞阻挡 ===
        for (let o of GameState.obstacles) {
            if (o.active && o.blocksMovement) {
                if (Utils.checkCollision(this, o)) {
                    this.x = oldX;
                    this.y = oldY;
                    this.vx = 0;
                    this.vy = 0;
                    break;
                }
            }
        }

        // === 边界限制 ===
        this.x = Math.max(this.radius, Math.min(GameConfig.mapSize.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GameConfig.mapSize.height - this.radius, this.y));

        // === 2. 炮塔永远瞄准鼠标位置 ===
        const mouseWorldX = GameState.mouse.x + GameConfig.camera.x;
        const mouseWorldY = GameState.mouse.y + GameConfig.camera.y;
        this.turretAngle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);

        // === 3. 射击 (鼠标左键) ===
        if (GameState.mouse.isDown && now - this.lastFireTime > this.fireRate) {
            this.fire();
            this.lastFireTime = now;
        }

        // === 4. 自动维修 (Regen) ===
        if (this.hasRegen && this.hp < this.maxHp) {
            this.hp += 0.02;
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

        // 优先使用专业版车身贴图
        const bodyImg = this.type === 'tiger' ? Assets.images['tiger_body'] : Assets.images[this.type];

        if (bodyImg) {
            // 统一增大显示大小
            const drawSize = this.radius * 3.0;
            ctx.drawImage(bodyImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
            // 兜底绘制
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius, -this.radius + 5, this.radius * 2, this.radius * 2 - 10);
        }
        ctx.restore();

        // 2. 绘制炮塔 (根据 this.turretAngle 旋转)
        ctx.save();

        const turretImg = this.type === 'tiger' ? Assets.images['tiger_turret'] : null;

        // 修复贴图反向：如果使用特定贴图，可能需要旋转180度(Math.PI)来纠正炮管方向
        if (turretImg) {
            ctx.rotate(this.turretAngle + Math.PI); // 翻转炮塔
            const drawSize = this.radius * 3.0; // 炮塔大小随车身放大
            ctx.drawImage(turretImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
            ctx.rotate(this.turretAngle);
            // 兜底绘制炮塔
            // 炮管 - 谢尔曼使用更细长的炮管
            const gunWidth = this.type === 'sherman' ? 4 : 6;
            const gunLength = this.type === 'sherman' ? this.radius * 1.8 : this.radius * 1.5;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, -gunWidth / 2, gunLength, gunWidth);
            // 炮口制退器
            ctx.fillRect(gunLength - 4, -gunWidth / 2 - 2, 5, gunWidth + 4);

            // 炮管高光
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(0, -gunWidth / 2 + 1, gunLength, 1.5);

            // 炮塔圆顶
            const turretRadius = this.type === 'sherman' ? this.radius * 0.5 : this.radius * 0.6;
            // 炮塔底色
            ctx.fillStyle = this.type === 'sherman' ? '#4a6b35' : this.color;
            ctx.beginPath();
            ctx.arc(0, 0, turretRadius, 0, Math.PI * 2);
            ctx.fill();
            // 炮塔边线
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 炮塔高光
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            ctx.arc(-turretRadius * 0.3, -turretRadius * 0.3, turretRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        ctx.restore(); // 恢复到 translate 之前
    }
}
