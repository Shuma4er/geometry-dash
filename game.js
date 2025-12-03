class GeometryDash {
    constructor() {
        console.log('🎮 GeometryDash constructor called');

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        window.game = this;

        if (!this.canvas) {
            console.error('❌ Canvas not found!');
            return;
        }

        this.setupMobile();
        this.setupAudio();
        this.setupCanvas();
        this.initGame();

        this.highScore = localStorage.getItem('geometryDashHighScore') || 0;
        if (this.highScoreElement) {
            this.highScoreElement.textContent = `🏆 Рекорд: ${this.highScore}`;
        }

        setTimeout(() => {
            this.setupEventListeners();
            this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }, 100);

        console.log('✅ Game initialized for mobile');
    }

    jump() {
        console.log('🎮 JUMP METHOD CALLED, gameState:', this.gameState);

        if (this.gameState !== 'playing') {
            console.log('⚠️ Cannot jump: game not playing');
            return;
        }

        if (!this.player.isJumping) {
            console.log('✅ Player jumps!');
            this.player.velocityY = this.jumpForce;
            this.player.isJumping = true;
            this.player.rotation = -25;
            this.player.scale = 0.8;

            // Эффекты прыжка
            this.createParticleEffect(this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                8, '#FFFFFF');
            this.playSound('jump');

            // Анимация рта при прыжке
            this.player.mouthState = 'surprised';
            this.player.mouthAnimationTimer = 10;

            setTimeout(() => {
                this.player.scale = 1;
            }, 100);
        } else {
            console.log('⚠️ Player already jumping');
        }
    }

    setupMobile() {
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('selectstart', (e) => {
            e.preventDefault();
        });

        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    }

    setupAudio() {
        this.audioContext = null;
        this.sounds = {
            jump: { freq: 300, type: 'sine', duration: 0.1 },
            score: { freq: 400, type: 'square', duration: 0.05 },
            crash: { freq: 150, type: 'sawtooth', duration: 0.3 },
            powerup: { freq: 600, type: 'triangle', duration: 0.2 }
        };

        this.initAudioOnFirstTouch();
    }

    initAudioOnFirstTouch() {
        const initAudio = () => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('🔊 Audio context initialized');
                } catch (e) {
                    console.log('❌ Audio not supported:', e);
                }
            }

            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
        };

        document.addEventListener('touchstart', initAudio, { once: true });
        document.addEventListener('click', initAudio, { once: true });
    }

    playSound(soundName) {
        if (!this.audioContext) return;

        const sound = this.sounds[soundName];
        if (!sound) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = sound.freq;
            oscillator.type = sound.type;

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + sound.duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + sound.duration);
        } catch (e) {
            console.log('Audio error:', e);
        }
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.ground.y = this.canvas.height - 120;
        });
    }

    initGame() {
        this.gameState = 'menu';
        this.score = 0;
        this.gameSpeed = 8;
        this.gravity = 0.9;
        this.jumpForce = -18;
        this.combo = 0;
        this.multiplier = 1;
        this.screenShake = 0;

        this.player = {
            x: 100,
            y: this.canvas.height - 180,
            width: 45,
            height: 45,
            velocityY: 0,
            isJumping: false,
            rotation: 0,
            scale: 1,
            color: '#FF6B6B',
            trail: [],
            // Новые свойства для анимации рта
            mouthState: 'normal', // normal, smiling, surprised, sad
            mouthAnimationTimer: 0,
            mouthOpenness: 0, // 0-1, где 0 закрыт, 1 полностью открыт
            mouthCycle: 0,
            isTalking: false,
            talkTimer: 0
        };

        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 70;
        this.particles = [];
        this.effects = [];
        this.collectibles = [];

        this.ground = {
            y: this.canvas.height - 120,
            height: 120
        };

        // Цветовые темы
        this.colorThemes = [
            { primary: '#FF6B6B', secondary: '#4ECDC4', bg: '#64B5F6' },
            { primary: '#FF9E6B', secondary: '#6BFFD3', bg: '#a18cd1' },
            { primary: '#6B83FF', secondary: '#FF6BE8', bg: '#fbc2eb' }
        ];
        this.currentTheme = 0;
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Обновление анимации рта
        this.updateMouthAnimation();

        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;

        this.player.rotation += this.player.velocityY * 0.5;
        this.player.rotation = Math.max(-25, Math.min(25, this.player.rotation));

        this.player.trail.push({
            x: this.player.x + this.player.width / 2,
            y: this.player.y + this.player.height / 2,
            life: 1
        });

        if (this.player.trail.length > 5) {
            this.player.trail.shift();
        }

        this.player.trail.forEach(point => point.life -= 0.2);
        this.player.trail = this.player.trail.filter(point => point.life > 0);

        if (this.player.y + this.player.height > this.ground.y) {
            this.player.y = this.ground.y - this.player.height;
            this.player.velocityY = 0;
            this.player.isJumping = false;
            this.player.rotation = 0;
        }

        this.obstacleTimer++;
        if (this.obstacleTimer > this.obstacleInterval) {
            this.createObstacle();
            this.obstacleTimer = 0;
            this.obstacleInterval = Math.max(40, this.obstacleInterval - 0.2);
        }

        if (Math.random() < 0.02) {
            this.createCollectible();
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameSpeed;

            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
                return;
            }

            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.score += 10 * this.multiplier;
                this.combo++;

                if (this.combo % 5 === 0) {
                    this.multiplier++;
                    this.createTextEffect('COMBO x' + this.multiplier, obstacle.x, obstacle.y, '#FFD700');
                    this.playSound('powerup');

                    // Анимация рта при комбо
                    this.player.mouthState = 'smiling';
                    this.player.mouthAnimationTimer = 15;
                }

                this.updateScore();
                this.createParticleEffect(obstacle.x, obstacle.y, 5, obstacle.color);
            }
        }

        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            collectible.x -= this.gameSpeed;
            collectible.rotation += 0.1;

            if (this.checkCollision(this.player, collectible)) {
                this.collectibles.splice(i, 1);
                this.score += 50;
                this.createTextEffect('+50', collectible.x, collectible.y, '#00FF00');
                this.createParticleEffect(collectible.x, collectible.y, 15, '#FFFF00');
                this.playSound('score');

                // Анимация рта при сборе монеты
                this.player.mouthState = 'smiling';
                this.player.mouthAnimationTimer = 20;
                this.player.isTalking = true;
                this.player.talkTimer = 10;

                this.updateScore();
            } else if (collectible.x + collectible.width < 0) {
                this.collectibles.splice(i, 1);
            }
        }

        this.gameSpeed += 0.001;

        this.updateParticles();
        this.updateEffects();

        if (this.screenShake > 0) {
            this.screenShake *= 0.9;
            if (this.screenShake < 0.1) this.screenShake = 0;
        }
    }

    updateMouthAnimation() {
        // Обновление таймера анимации
        if (this.player.mouthAnimationTimer > 0) {
            this.player.mouthAnimationTimer--;
        } else if (this.player.mouthState !== 'normal') {
            // Возврат к нормальному состоянию после анимации
            this.player.mouthState = 'normal';
        }

        // Обновление таймера разговора
        if (this.player.talkTimer > 0) {
            this.player.talkTimer--;
        } else {
            this.player.isTalking = false;
        }

        // Анимация открытия/закрытия рта
        if (this.player.isTalking) {
            // Для разговора - быстрая анимация
            this.player.mouthCycle = (this.player.mouthCycle + 0.3) % Math.PI;
            this.player.mouthOpenness = Math.sin(this.player.mouthCycle) * 0.5 + 0.5;
        } else {
            // Нормальное дыхание - медленная анимация
            this.player.mouthCycle = (this.player.mouthCycle + 0.05) % Math.PI;
            this.player.mouthOpenness = Math.sin(this.player.mouthCycle) * 0.2 + 0.2;
        }
    }

    draw() {
        const shakeX = this.screenShake * (Math.random() - 0.5) * 10;
        const shakeY = this.screenShake * (Math.random() - 0.5) * 10;

        this.ctx.save();
        this.ctx.translate(shakeX, shakeY);

        const theme = this.colorThemes[this.currentTheme];

        // ЯРКИЙ ФОН
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, theme.bg);
        gradient.addColorStop(1, this.darkenColor(theme.bg, 20));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // СОЛНЦЕ
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - 80, 80, 40, 0, Math.PI * 2);
        this.ctx.fill();

        // ЗЕМЛЯ
        this.ctx.fillStyle = '#81C784';
        this.ctx.fillRect(0, this.ground.y, this.canvas.width, this.ground.height);

        // ТРАВА
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(0, this.ground.y - 10, this.canvas.width, 10);

        this.collectibles.forEach(collectible => {
            this.ctx.save();
            this.ctx.translate(collectible.x + collectible.width / 2, collectible.y + collectible.height / 2);
            this.ctx.rotate(collectible.rotation);

            this.ctx.fillStyle = collectible.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, collectible.width / 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = '#FFA000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.restore();
        });

        // ПРЕПЯТСТВИЯ
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;

            if (obstacle.type === 'spike') {
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                this.ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        });

        // СЛЕД ИГРОКА
        this.ctx.strokeStyle = theme.primary;
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.player.trail.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;

        // ИГРОК
        this.ctx.save();
        this.ctx.translate(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
        );
        this.ctx.rotate(this.player.rotation * Math.PI / 180);
        this.ctx.scale(this.player.scale, this.player.scale);

        const playerGradient = this.ctx.createLinearGradient(
            -this.player.width / 2, -this.player.height / 2,
            this.player.width / 2, this.player.height / 2
        );
        playerGradient.addColorStop(0, theme.primary);
        playerGradient.addColorStop(1, this.darkenColor(theme.primary, 20));

        this.ctx.fillStyle = playerGradient;
        this.ctx.fillRect(-this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height);

        // ГЛАЗА
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(-this.player.width / 4, -this.player.height / 4, 8, 8);
        this.ctx.fillRect(this.player.width / 4 - 8, -this.player.height / 4, 8, 8);

        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-this.player.width / 4 + 2, -this.player.height / 4 + 2, 4, 4);
        this.ctx.fillRect(this.player.width / 4 - 6, -this.player.height / 4 + 2, 4, 4);

        // РОТ
        this.drawMouth();

        this.ctx.restore();

        // ЧАСТИЦЫ
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        // ТЕКСТОВЫЕ ЭФФЕКТЫ
        this.effects.forEach(effect => {
            this.ctx.globalAlpha = effect.life;
            this.ctx.fillStyle = effect.color;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y);
        });
        this.ctx.globalAlpha = 1;

        this.ctx.restore();
    }

    drawMouth() {
        const mouthY = this.player.height / 8; // Позиция рта относительно центра
        const mouthWidth = 20;
        let mouthHeight = 5;
        let mouthCurve = 0;

        // Настройки рта в зависимости от состояния
        switch (this.player.mouthState) {
            case 'normal':
                // Нормальный рот - улыбка
                mouthHeight = 3 + (this.player.mouthOpenness * 2);
                mouthCurve = 0.5;
                break;

            case 'smiling':
                // Широкая улыбка
                mouthHeight = 4 + (this.player.mouthOpenness * 3);
                mouthCurve = 1.5;
                break;

            case 'surprised':
                // Удивленный рот (круглый)
                mouthHeight = 8 + (this.player.mouthOpenness * 4);
                mouthCurve = 0;
                break;

            case 'sad':
                // Грустный рот (перевернутая улыбка)
                mouthHeight = 3 + (this.player.mouthOpenness * 2);
                mouthCurve = -0.5;
                break;
        }

        // Если рот полностью открыт в режиме разговора
        if (this.player.isTalking && this.player.mouthOpenness > 0.8) {
            mouthHeight = 8;
            mouthCurve = 0;
        }

        // Рисуем рот
        this.ctx.fillStyle = '#000000';

        if (mouthCurve === 0) {
            // Круглый рот (для удивления)
            this.ctx.beginPath();
            this.ctx.ellipse(0, mouthY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Изогнутый рот (улыбка или грусть)
            this.ctx.beginPath();

            if (mouthCurve > 0) {
                // Улыбка
                this.ctx.ellipse(0, mouthY + mouthHeight / 4, mouthWidth / 2, mouthHeight / 2,
                    0, Math.PI * 0.1, Math.PI * 0.9);
            } else {
                // Грусть (перевернутая улыбка)
                this.ctx.ellipse(0, mouthY - mouthHeight / 4, mouthWidth / 2, mouthHeight / 2,
                    0, Math.PI * 1.1, Math.PI * 1.9);
            }

            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Язык (если рот открыт достаточно широко)
        if (this.player.mouthOpenness > 0.7 && (this.player.mouthState === 'smiling' || this.player.isTalking)) {
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.beginPath();
            this.ctx.ellipse(0, mouthY + mouthHeight / 2, 4, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    gameOver() {
        this.gameState = 'gameover';

        // Перед gameover устанавливаем грустный рот
        this.player.mouthState = 'sad';
        this.player.mouthAnimationTimer = 30;

        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScore = document.getElementById('finalScore');
        const menu = document.getElementById('menu');
        const gameContainer = document.getElementById('gameContainer');

        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
        if (finalScore) finalScore.textContent = `⭐ Очки: ${this.score}`;
        if (menu) menu.classList.remove('hidden');
        if (gameContainer) {
            gameContainer.classList.remove('playing');
        }

        this.screenShake = 2;
        this.createParticleEffect(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 30, '#FF0000');
        this.playSound('crash');
        this.sendScoreToBot();
    }

    // ... остальные методы остаются без изменений ...
}

// Инициализация
function initializeGame() {
    console.log('🚀 INITIALIZING GAME...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.game = new GeometryDash();
        });
    } else {
        window.game = new GeometryDash();
    }
}

// Запуск
console.log('🎮 Geometry Dash Mobile Ultimate - Loading...');
initializeGame();