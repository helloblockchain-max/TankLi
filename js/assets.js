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
            // 专业版素材 - 虎式组件
            'tiger_body': 'assets/img/tiger_body.png',
            'tiger_turret': 'assets/img/tiger_turret.png',
            // 专业版素材 - 环境
            'tree': 'assets/img/tree.png',

            // 专业版素材 - 柔性地面
            'bg_mud': 'assets/img/mud.png',
            'bg_snow': 'assets/img/snow.png',
            'bg_grass': 'assets/img/grass.png',

            // 兼容原有 Key (虎式使用独立贴图，其他走高清程序化渲染)
            'tiger': 'assets/img/tiger_body.png',

            // 下列图片故意指向不存在的文件，触发onerror调用 createFallbackImage 进行超高清程序化渲染
            'sherman': 'assets/img/missing.png',
            'enemy_light': 'assets/img/missing_light.png',
            'enemy_medium': 'assets/img/missing_medium.png',
            'enemy_heavy': 'assets/img/missing_heavy.png',
            'enemy_boss': 'assets/img/missing_boss.png'
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

    // 精细的Canvas写实坦克俯视图生成器 (修正为朝右 0度)
    createFallbackImage(key) {
        const size = 192;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        const cx = size / 2;
        const cy = size / 2;

        let hullColor, trackColor, accentColor, markingFn;
        // 缩放因子，将原128px设计扩展到192px
        const s = size / 128;

        if (key.includes('tiger')) {
            hullColor = '#5e616b'; trackColor = '#2b2c30'; accentColor = '#6c707a';
            markingFn = () => {
                // 铁十字
                ctx.fillStyle = '#111';
                ctx.fillRect(cx - 8 * s, cy - 10 * s, 16 * s, 20 * s);
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx - 6 * s, cy - 8 * s, 12 * s, 16 * s);
                ctx.fillStyle = '#111';
                ctx.fillRect(cx - 4 * s, cy - 12 * s, 8 * s, 24 * s);
                ctx.fillRect(cx - 10 * s, cy - 4 * s, 20 * s, 8 * s);
            };
        } else if (key.includes('sherman')) {
            hullColor = '#4a6b35'; trackColor = '#2a3a1a'; accentColor = '#5d7a45';
            markingFn = () => {
                // 大的五角白星
                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.beginPath();
                const starCx = cx - 6 * s;
                const starCy = cy;
                const outerR = 12 * s;
                const innerR = 5 * s;
                for (let i = 0; i < 10; i++) {
                    const a = (i * Math.PI / 5) - Math.PI / 2;
                    const r = i % 2 === 0 ? outerR : innerR;
                    if (i === 0) ctx.moveTo(starCx + r * Math.cos(a), starCy + r * Math.sin(a));
                    else ctx.lineTo(starCx + r * Math.cos(a), starCy + r * Math.sin(a));
                }
                ctx.closePath();
                ctx.fill();
                // 星星边框
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();

                // 装甲板焊接线细节
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 10 * s, cy - 16 * s);
                ctx.lineTo(cx - 10 * s, cy + 16 * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx + 8 * s, cy - 16 * s);
                ctx.lineTo(cx + 8 * s, cy + 16 * s);
                ctx.stroke();

                // 额外的工具箱
                ctx.fillStyle = 'rgba(60,50,30,0.6)';
                ctx.fillRect(cx - 22 * s, cy + 10 * s, 8 * s, 6 * s);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.strokeRect(cx - 22 * s, cy + 10 * s, 8 * s, 6 * s);
            };
        } else if (key.includes('boss')) {
            hullColor = '#3a0a0a'; trackColor = '#1a0505'; accentColor = '#5a0f0f';
            markingFn = () => {
                // 骷髅标记
                ctx.fillStyle = 'rgba(255,50,50,0.5)';
                ctx.beginPath();
                ctx.arc(cx - 4 * s, cy, 8 * s, 0, Math.PI * 2);
                ctx.fill();
            };
        } else if (key.includes('heavy')) {
            hullColor = '#706e62'; trackColor = '#36352f'; accentColor = '#807d70';
            markingFn = () => {
                // 三道条纹
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(cx - 15 * s, cy - 4 * s, 30 * s, 2 * s);
                ctx.fillRect(cx - 15 * s, cy + 2 * s, 30 * s, 2 * s);
            };
        } else if (key.includes('medium')) {
            hullColor = '#5e7261'; trackColor = '#2d382e'; accentColor = '#6f8773';
            markingFn = () => {
                // 简单编号
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.font = `bold ${10 * s}px sans-serif`;
                ctx.fillText('II', cx - 8 * s, cy + 4 * s);
            };
        } else {
            // Light
            hullColor = '#806e52'; trackColor = '#403628'; accentColor = '#907d5d';
            markingFn = () => { };
        }

        // --- 履带 (上方和下方, 因为车头朝右) ---
        ctx.fillStyle = trackColor;
        ctx.fillRect(cx - 30 * s, cy - 26 * s, 64 * s, 12 * s);
        ctx.fillRect(cx - 30 * s, cy + 14 * s, 64 * s, 12 * s);

        // 履带纹理 (垂直线段)
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5 * s;
        for (let i = -28; i < 32; i += 5) {
            ctx.beginPath();
            ctx.moveTo(cx + i * s, cy - 26 * s); ctx.lineTo(cx + i * s, cy - 14 * s); ctx.stroke();
            ctx.moveTo(cx + i * s, cy + 14 * s); ctx.lineTo(cx + i * s, cy + 26 * s); ctx.stroke();
        }

        // 履带负重轮
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = -24; i < 30; i += 12) {
            ctx.beginPath(); ctx.arc(cx + i * s, cy - 20 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + i * s, cy + 20 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
        }

        // --- 履带上的挡泥板 ---
        ctx.fillStyle = hullColor;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(cx - 32 * s, cy - 28 * s, 68 * s, 6 * s);
        ctx.fillRect(cx - 32 * s, cy + 22 * s, 68 * s, 6 * s);
        ctx.globalAlpha = 1.0;

        // --- 车体装甲 ---
        ctx.fillStyle = hullColor;
        ctx.beginPath();
        ctx.moveTo(cx - 25 * s, cy - 20 * s);
        ctx.lineTo(cx + 22 * s, cy - 20 * s);
        ctx.lineTo(cx + 28 * s, cy - 12 * s);
        ctx.lineTo(cx + 28 * s, cy + 12 * s);
        ctx.lineTo(cx + 22 * s, cy + 20 * s);
        ctx.lineTo(cx - 25 * s, cy + 20 * s);
        ctx.lineTo(cx - 30 * s, cy + 12 * s);
        ctx.lineTo(cx - 30 * s, cy - 12 * s);
        ctx.closePath();
        ctx.fill();

        // 车体边缘阴影
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 车体顶面高光
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.moveTo(cx - 20 * s, cy - 18 * s);
        ctx.lineTo(cx + 18 * s, cy - 18 * s);
        ctx.lineTo(cx + 24 * s, cy - 10 * s);
        ctx.lineTo(cx - 10 * s, cy - 10 * s);
        ctx.closePath();
        ctx.fill();

        // 引擎排气格栅 (左侧车尾)
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(cx - 24 * s, cy - 12 * s, 10 * s, 24 * s);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        for (let j = -10; j <= 10; j += 4) {
            ctx.beginPath(); ctx.moveTo(cx - 24 * s, cy + j * s); ctx.lineTo(cx - 14 * s, cy + j * s); ctx.stroke();
        }

        // --- 标记 ---
        markingFn();

        // 舱门细节
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(cx + 12 * s, cy - 10 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 12 * s, cy + 10 * s, 3 * s, 0, Math.PI * 2); ctx.fill();

        // --- 炮塔 ---
        if (!key.includes('boss')) {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(cx - 4 * s, cy, 14 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5 * s;
            ctx.stroke();

            // 炮塔高光
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.arc(cx - 8 * s, cy - 4 * s, 6 * s, 0, Math.PI * 2);
            ctx.fill();

            // 炮塔顶部舱盖
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.arc(cx - 6 * s, cy + 4 * s, 4 * s, 0, Math.PI * 2); ctx.fill();

            // --- 炮管 (朝右, 0度) ---
            ctx.fillStyle = '#1c1c1c';
            const gunLength = key.includes('light') ? 25 * s : (key.includes('heavy') ? 45 * s : 35 * s);
            const gunWidth = key.includes('heavy') ? 8 * s : 6 * s;
            ctx.fillRect(cx + 5 * s, cy - gunWidth / 2, gunLength, gunWidth);
            // 炮口制退器
            ctx.fillRect(cx + 5 * s + gunLength - 6 * s, cy - gunWidth / 2 - 2 * s, 6 * s, gunWidth + 4 * s);

            // 炮管高光
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(cx + 5 * s, cy - gunWidth / 2 + 1, gunLength, 2 * s);
        }

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
