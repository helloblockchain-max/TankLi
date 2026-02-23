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

    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();

            // 主音量控制
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioCtx.destination);
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    playSound(key, loop = false, volume = 1.0) {
        // 用户交互后初始化 AudioContext
        this.initAudioContext();
        if (!this.audioCtx) return;

        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(0, t);

        // --- 核心：程序化音效合成 ---
        if (key === 'fire') {
            // 射击音效：快速下降的频率和包络
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

            gain.gain.linearRampToValueAtTime(volume, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);

        } else if (key === 'explosion') {
            // 爆炸：白噪声 + 低频正弦波 (此处用锯齿波+快速调制近似)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);

            // 添加一点不规则调制
            const osc2 = this.audioCtx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(50, t);
            osc2.connect(gain);
            osc2.start(t);
            osc2.stop(t + 0.5);

            gain.gain.linearRampToValueAtTime(volume * 1.5, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);

        } else if (key === 'ricochet') {
            // 跳弹：高频急促，带点金属质感 (三角波高音)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);

            gain.gain.linearRampToValueAtTime(volume, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);

        } else if (key === 'bgm_menu') {
            // 菜单背景音效：低频嗡嗡声营造军工氛围
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, t);
            // 简单的低频LFO调制
            const lfo = this.audioCtx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.5;
            const lfoGain = this.audioCtx.createGain();
            lfoGain.gain.value = 20;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();

            gain.gain.linearRampToValueAtTime(volume * 0.3, t + 2); // 缓入
            osc.start(t);
            // 如果是循环音效，返回用来停止的对象
            return {
                stop: () => {
                    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 1);
                    setTimeout(() => { osc.stop(); lfo.stop(); }, 1000);
                }
            };
        } else if (key === 'bgm_battle') {
            // 战斗背景音：紧张的低频脉冲
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, t);

            gain.gain.setValueAtTime(0, t);

            // 手动实现脉冲感 (在音频线程很难完美模拟复杂的曲子，所以用环境氛围音代替)
            setInterval(() => {
                if (osc.playbackState === osc.PLAYING_STATE) return; // 已停止的保护
                const now = this.audioCtx.currentTime;
                gain.gain.setTargetAtTime(volume * 0.4, now, 0.1);
                gain.gain.setTargetAtTime(0.1, now + 0.2, 0.2);
            }, 600); // 100bpm脉冲

            osc.start(t);
            return {
                stop: () => {
                    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
                    setTimeout(() => osc.stop(), 500);
                }
            };
        }
    }
};
