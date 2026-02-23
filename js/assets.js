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

        const checkComplete = () => {
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
            // 即便失败也继续，避免卡死
            img.onload = () => {
                this.images[key] = img;
                checkComplete();
            };
            img.onerror = () => {
                console.warn(`Image failed to load: ${img.src}. Creating fallback dummy.`);
                this.images[key] = this.createFallbackImage(key);
                checkComplete();
            }
        }

        // 2. 发起音频加载
        for (let key in this.manifest.audio) {
            const aud = new Audio();
            aud.src = this.manifest.audio[key];
            // 音频如果可以播放了就认为加载完毕 (对本地/在线流友好)
            aud.oncanplaythrough = () => {
                this.audio[key] = aud;
                checkComplete();
            }
            aud.onerror = () => {
                console.warn(`Audio failed to load: ${aud.src}. Ignored.`);
                this.audio[key] = aud; // 存个空壳
                checkComplete();
            }
            // 某些浏览器对空白源不会触发事件，加个兜底
            setTimeout(checkComplete, 2000);
        }
    },

    // 生成纯色占位图用于Canvas渲染(如果没有真实图片)
    createFallbackImage(key) {
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');

        if (key.includes('tiger')) ctx.fillStyle = '#5c5c5c';
        else if (key.includes('sherman')) ctx.fillStyle = '#4caf50';
        else if (key.includes('enemy')) ctx.fillStyle = '#ff5252';
        else if (key.includes('bg')) ctx.fillStyle = '#4a5c4e';
        else ctx.fillStyle = '#ff00ff'; // 品红表示丢失

        ctx.fillRect(0, 0, 64, 64);

        // 画个箭头表示车头方向（向右，0度）
        if (!key.includes('bg')) {
            ctx.fillStyle = '#000';
            ctx.fillRect(40, 30, 20, 4);
        }

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
