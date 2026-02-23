/**
 * obstacle.js
 * 环境障碍物系统：树木、墙壁等
 */

class Obstacle {
    constructor(x, y, typeConf) {
        this.x = x;
        this.y = y;
        this.type = typeConf.type; // 'tree', 'wall', 'water' 等
        this.radius = typeConf.radius || 30;
        this.color = typeConf.color || '#8bc34a';
        this.hp = typeConf.hp || 50;
        this.destructible = typeConf.destructible !== false;
        this.blocksMovement = typeConf.blocksMovement !== false;
        this.blocksBullets = typeConf.blocksBullets !== false;
        this.active = true;
    }

    takeDamage(amount) {
        if (!this.destructible) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.explode();
        }
    }

    explode() {
        this.active = false;
        // 产生碎片粒子
        // 树木产生绿色碎片，墙壁产生灰色碎片
        const particleColor = this.type === 'tree' ? '#4caf50' : '#9e9e9e';
        for (let i = 0; i < 15; i++) {
            GameState.particles.push(new Particle(this.x, this.y, particleColor));
        }
        Assets.playSound('explosion', false, 0.3); // 较轻的爆炸声
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 如果有美术贴图资源
        const img = Assets.images['obs_' + this.type];
        if (img) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // 兜底绘制
            ctx.beginPath();
            if (this.type === 'wall') {
                ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.fillStyle = this.color || '#795548';
            } else {
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color || '#2e7d32';
            }
            ctx.fill();
            ctx.closePath();

            // 绘制血条 (如果是可破坏的且受损)
            if (this.destructible && this.hp < (this.type === 'tree' ? 50 : 150)) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-this.radius, -this.radius - 10, this.radius * 2, 4);
                ctx.fillStyle = '#00ff00';
                const hpPercent = Math.max(0, this.hp / (this.type === 'tree' ? 50 : 150));
                ctx.fillRect(-this.radius, -this.radius - 10, this.radius * 2 * hpPercent, 4);
            }
        }
        ctx.restore();
    }
}
