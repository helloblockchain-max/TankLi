/**
 * assets.js
 * 资源预加载与管理器 (图像、音频)
 */

const Assets = {
    images: {},
    audio: {},
    isLoaded: false,

    // 定义要加载的资源清单 (占位图，后续可替换为精美素材)
    manifest: {
        images: {
            'tiger': 'assets/img/tiger.png',
            'sherman': 'assets/img/sherman.png',
            'enemy_light': 'assets/img/enemy_light.png',
            'enemy_medium': 'assets/img/enemy_medium.png',
            'enemy_heavy': 'assets/img/enemy_heavy.png',
            'bg_mud': 'assets/img/bg_mud.jpg',
            'bg_snow': 'assets/img/bg_snow.jpg'
        },
        audio: {
            'fire': 'assets/audio/fire.mp3',
            'explosion': 'assets/audio/explosion.mp3',
            'ricochet': 'assets/audio/ricochet.mp3',
            'engine': 'assets/audio/engine.mp3',
            'bgm_menu': 'assets/audio/bgm_menu.mp3',
            'bgm_battle': 'assets/audio/bgm_battle.mp3'
        }
    },

    loadAll(onProgress, onComplete) {
        let total = Object.keys(this.manifest.images).length + Object.keys(this.manifest.audio).length;
        let loaded = 0;
        const completedKeys = new Set(); // 防止重复计数

        const checkComplete = (key) => {
            if (completedKeys.has(key)) return; // 已经计算过了跳过
            completedKeys.add(key);
            loaded++;
            if (onProgress) onProgress(loaded / total);
            if (loaded >= total) {
                this.isLoaded = true;
                if (onComplete) onComplete();
            }
        };

        // 1. 发起图像加载
        for (let key in this.manifest.images) {
            const img = new Image();
            img.src = this.manifest.images[key];
            img.onload = () => {
                this.images[key] = img;
                checkComplete('img_' + key);
            };
            img.onerror = () => {
                console.warn(`Image failed to load: ${img.src}. Creating fallback.`);
                this.images[key] = this.createFallbackImage(key);
                checkComplete('img_' + key);
            }
        }

        // 2. 发起音频加载
        for (let key in this.manifest.audio) {
            const aud = new Audio();
            aud.src = this.manifest.audio[key];
            aud.oncanplaythrough = () => {
                this.audio[key] = aud;
                checkComplete('aud_' + key);
            }
            aud.onerror = () => {
                console.warn(`Audio failed to load: ${aud.src}. Ignored.`);
                this.audio[key] = aud;
                checkComplete('aud_' + key);
            }
            // 兆底超时（某些浏览器对空白源不触发事件）
            setTimeout(() => checkComplete('aud_' + key), 3000);
        }
    },

    // 精细的Canvas写实坦克俯视图生成器
    createFallbackImage(key) {
        const size = 128;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        const cx = size / 2, cy = size / 2;

        if (key.includes('bg')) {
            // 背景纹理
            ctx.fillStyle = key.includes('snow') ? '#c0c8cc' : '#4a5c4e';
            ctx.fillRect(0, 0, size, size);
            // 噪点
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
                ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
            }
            const img = new Image(); img.src = c.toDataURL(); return img;
        }

        // --- 坦克配色方案 ---
        let hullColor, trackColor, accentColor, markingFn;

        if (key.includes('tiger')) {
            hullColor = '#5c5c5c'; trackColor = '#3a3a3a'; accentColor = '#444';
            markingFn = () => {
                // 德国十字
                ctx.fillStyle = '#222'; ctx.fillRect(cx - 2, cy - 10, 4, 20);
                ctx.fillRect(cx - 10, cy - 2, 20, 4);
            };
        } else if (key.includes('sherman')) {
            hullColor = '#4a6b3a'; trackColor = '#3a4a2a'; accentColor = '#5a7b4a';
            markingFn = () => {
                // 白星
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
                    const r = i % 2 === 0 ? 8 : 4;
                    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
                }
                ctx.fill();
            };
        } else if (key.includes('boss')) {
            hullColor = '#8b1a1a'; trackColor = '#4a0a0a'; accentColor = '#6b0000';
            markingFn = () => { };
        } else if (key.includes('heavy')) {
            hullColor = '#9e9e9e'; trackColor = '#616161'; accentColor = '#757575';
            markingFn = () => { };
        } else if (key.includes('medium')) {
            hullColor = '#546e7a'; trackColor = '#37474f'; accentColor = '#455a64';
            markingFn = () => { };
        } else {
            hullColor = '#6d4c41'; trackColor = '#4e342e'; accentColor = '#5d4037';
            markingFn = () => { };
        }

        // --- 履带 (left/right tracks) ---
        ctx.fillStyle = trackColor;
        ctx.fillRect(cx - 28, cy - 30, 12, 60); // 左履带
        ctx.fillRect(cx + 16, cy - 30, 12, 60); // 右履带
        // 履带纹理
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
        for (let i = -28; i < 32; i += 6) {
            ctx.beginPath();
            ctx.moveTo(cx - 28, cy + i); ctx.lineTo(cx - 16, cy + i); ctx.stroke();
            ctx.moveTo(cx + 16, cy + i); ctx.lineTo(cx + 28, cy + i); ctx.stroke();
        }

        // --- 车体 ---
        ctx.fillStyle = hullColor;
        // 主体梯形
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 25);
        ctx.lineTo(cx + 18, cy - 25);
        ctx.lineTo(cx + 22, cy - 15);
        ctx.lineTo(cx + 22, cy + 20);
        ctx.lineTo(cx + 18, cy + 28);
        ctx.lineTo(cx - 18, cy + 28);
        ctx.lineTo(cx - 22, cy + 20);
        ctx.lineTo(cx - 22, cy - 15);
        ctx.closePath();
        ctx.fill();

        // 车体阴影 (深色边缘)
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
        ctx.stroke();

        // 车体高光
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(cx - 15, cy - 22, 30, 12);

        // --- 炮塔 ---
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
        ctx.stroke();
        // 炮塔高光
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 6, 8, 0, Math.PI * 2);
        ctx.fill();

        // --- 炮管 (朔右, 0度) ---
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx, cy - 4, 38, 5);
        // 炮口火焰抑制器
        ctx.fillRect(cx + 35, cy - 6, 5, 9);

        // --- 标记 ---
        markingFn();

        // --- 车体细节装饰（舱口） ---
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(cx - 8, cy + 12, 4, 0, Math.PI * 2); ctx.fill(); // 驾驶舱
        ctx.beginPath(); ctx.arc(cx + 8, cy + 12, 3, 0, Math.PI * 2); ctx.fill(); // 副驾驶

        const img = new Image();
        img.src = c.toDataURL();
        return img;
    },

    playSound(key, loop = false, volume = 1.0) {
        if (!this.audio[key]) return;
        // HTML5 Audio在重复播放同名音效时需要重置currentTime或克隆
        const sound = this.audio[key].cloneNode();
        sound.volume = volume;
        sound.loop = loop;
        sound.play().catch(e => console.warn('Autoplay prevented:', e));
        return sound; // 返回对象以便控制停止 (如引擎声)
    }
};
