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

        const img = this.type === 'tree' ? Assets.images['tree'] : (this.type === 'wall' ? Assets.images['walls'] : null);
        const hasValidImg = img && img.complete && img.naturalWidth > 1;

        if (this.type === 'tree') {
            if (hasValidImg) {
                const drawSize = this.radius * 2.2;
                ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            }
            // 树干
            ctx.fillStyle = '#422c1d';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            // 树冠 (带阴影和层次)
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;

            const grad = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 0, 0, 0, this.radius);
            grad.addColorStop(0, '#7cb342');
            grad.addColorStop(0.6, '#558b2f');
            grad.addColorStop(1, '#33691e');

            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                const r = this.radius * (0.85 + Math.sin(angle * 3.7 + this.x) * 0.15);
                if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
                else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.globalAlpha = 1.0;

        } else if (this.type === 'water') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, 'rgba(56, 73, 85, 0.9)');
            grad.addColorStop(0.6, 'rgba(74, 91, 102, 0.7)');
            grad.addColorStop(1, 'rgba(92, 108, 117, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = i * Math.PI * 2 / 10;
                const r = this.radius * (0.9 + Math.sin(i * 2.1) * 0.15);
                ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.ellipse(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.4, this.radius * 0.15, Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // 墙壁 - 废墟破损红砖墙 (始终使用 Canvas 绘制，不依赖贴图)
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;

            // 底色：深灰泥土垫底
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

            ctx.shadowColor = 'transparent';

            // 砖块纹理
            const brickW = 16;
            const brickH = 8;
            const rows = (this.radius * 2) / brickH;
            const cols = (this.radius * 2) / brickW;

            // 使用确定性的伪随机，避免每帧闪烁
            const seed = Math.floor(this.x * 7 + this.y * 13);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const hash = ((r * 31 + c * 17 + seed) % 100) / 100;
                    if (hash < 0.2) continue;

                    let colorLuminance = 40 + (hash * 20);
                    ctx.fillStyle = `hsl(10, 40%, ${colorLuminance}%)`;

                    let offset = (r % 2 === 0) ? 0 : brickW / 2;
                    let bx = -this.radius + c * brickW - offset;
                    let by = -this.radius + r * brickH;

                    let bw = brickW - 1;
                    if (bx < -this.radius) { bw -= (-this.radius - bx); bx = -this.radius; }
                    if (bx + bw > this.radius) { bw = this.radius - bx; }

                    if (bw > 0) {
                        ctx.fillRect(bx, by, bw, brickH - 1);
                    }
                }
            }

            // 墙壁边框加固视觉
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        }

        // 受损血条
        if (this.active && this.destructible && this.hp < this.maxHp) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-this.radius, -this.radius - 10, this.radius * 2, 4);
            ctx.fillStyle = '#00ff00';
            const hpPercent = Math.max(0, this.hp / this.maxHp);
            ctx.fillRect(-this.radius, -this.radius - 10, this.radius * 2 * hpPercent, 4);
        }
        ctx.restore();
    }
}
