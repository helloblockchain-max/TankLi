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
        this.maxHp = this.hp; // 修复：存储初始HP用于血条计算
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
        const particleColor = this.type === 'tree' ? '#4caf50' : '#9e9e9e';
        for (let i = 0; i < 15; i++) {
            GameState.particles.push(new Particle(this.x, this.y, particleColor));
        }
        Assets.playSound('explosion', false, 0.3);
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        const img = Assets.images['obs_' + this.type];
        if (img) {
            ctx.drawImage(img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            if (this.type === 'tree') {
                // 树干
                ctx.fillStyle = '#5d4037';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
                ctx.fill();
                // 树冠
                ctx.fillStyle = this.color;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            } else {
                // 墙壁 - 砖块效果
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.strokeStyle = '#3e2723';
                ctx.lineWidth = 2;
                ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
                // 砖缝
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-this.radius, 0);
                ctx.lineTo(this.radius, 0);
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(0, this.radius);
                ctx.stroke();
            }

            // 受损血条
            if (this.destructible && this.hp < this.maxHp) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-this.radius, -this.radius - 10, this.radius * 2, 4);
                ctx.fillStyle = '#00ff00';
                const hpPercent = Math.max(0, this.hp / this.maxHp);
                ctx.fillRect(-this.radius, -this.radius - 10, this.radius * 2 * hpPercent, 4);
            }
        }
        ctx.restore();
    }
}
