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
            this.createClouds(); // Пересоздаем облака при изменении размера
            this.createGrass(); // Пересоздаем траву при изменении размера
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

        // Параметры для солнца
        this.sun = {
            x: this.canvas.width - 80,
            y: 80,
            radius: 40,
            baseY: 80, // Базовая позиция Y
            waveOffset: 0, // Смещение для волны
            speed: 0.02 // Скорость движения волны
        };

        // Массив для облаков
        this.clouds = [];
        this.createClouds();

        // Массив для травинок
        this.grassBlades = [];
        this.grassOffset = 0;
        this.createGrass();

        this.player = {
            x: 100,
            y: this.canvas.height - 180,
            width: 50,
            height: 50,
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

    createClouds() {
        this.clouds = [];
        const cloudCount = Math.floor(this.canvas.width / 150) + 3; // Количество облаков в зависимости от ширины

        for (let i = 0; i < cloudCount; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width * 1.5,
                y: Math.random() * 150 + 50,
                width: Math.random() * 80 + 60,
                height: Math.random() * 40 + 30,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.4 + 0.3
            });
        }
    }

    createGrass() {
        this.grassBlades = [];
        const grassCount = Math.floor(this.canvas.width / 10); // Количество травинок

        for (let i = 0; i < grassCount; i++) {
            this.grassBlades.push({
                x: i * 10 + Math.random() * 5,
                baseHeight: Math.random() * 15 + 10, // Базовая высота травинки
                currentHeight: 0,
                waveOffset: Math.random() * Math.PI * 2, // Случайное смещение для волны
                width: Math.random() * 1 + 0.5, // Толщина травинки
                speed: Math.random() * 0.03 + 0.01, // Скорость колебания
                color: this.getGrassColor() // Цвет травинки
            });
        }
    }

    getGrassColor() {
        // Возвращает случайный зеленый цвет для травинки
        const greens = ['#4CAF50', '#66BB6A', '#81C784', '#43A047', '#388E3C'];
        return greens[Math.floor(Math.random() * greens.length)];
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startGame();
            });

            startBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startGame();
            }, { passive: false });
        }

        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareScore());
        }

        this.setupCanvasControls();

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.jump();
            }
        });

        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
        }

        console.log('✅ All event listeners setup complete');
    }

    setupCanvasControls() {
        const handleJump = (e) => {
            if (e.type === 'touchstart') {
                e.preventDefault();
            }

            if (this.gameState === 'playing') {
                this.jump();

                if (this.isMobile) {
                    this.createTapEffect(e);
                }
            }

            if (this.gameState === 'menu') {
                this.startGame();
            }
        };

        this.canvas.addEventListener('click', handleJump);
        this.canvas.addEventListener('touchstart', handleJump, { passive: false });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                handleJump(e);
            }
        });
    }

    createTapEffect(e) {
        let x, y;
        if (e.touches && e.touches[0]) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        const effect = document.createElement('div');
        effect.style.position = 'fixed';
        effect.style.left = (x - 25) + 'px';
        effect.style.top = (y - 25) + 'px';
        effect.style.width = '50px';
        effect.style.height = '50px';
        effect.style.borderRadius = '50%';
        effect.style.backgroundColor = 'rgba(255, 107, 107, 0.3)';
        effect.style.border = '2px solid rgba(255, 107, 107, 0.5)';
        effect.style.zIndex = '9998';
        effect.style.pointerEvents = 'none';
        effect.style.animation = 'tapEffect 0.5s forwards';

        document.body.appendChild(effect);

        setTimeout(() => {
            document.body.removeChild(effect);
        }, 500);
    }

    setupSwipeControls() {
        let startX, startY;

        this.canvas.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;

            const diffX = endX - startX;
            const diffY = endY - startY;

            if (Math.abs(diffY) > Math.abs(diffX) && diffY < -30) {
                this.jump();
            }

            startX = startY = null;
        }, { passive: true });
    }

    startGame() {
        console.log('🎮 START GAME');

        this.gameState = 'playing';

        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const menu = document.getElementById('menu');
        const gameContainer = document.getElementById('gameContainer');

        if (startScreen) startScreen.classList.add('hidden');
        if (gameOverScreen) gameOverScreen.classList.add('hidden');
        if (menu) menu.classList.add('hidden');

        if (gameContainer) {
            gameContainer.classList.add('playing');
        }

        this.createParticleEffect(this.player.x, this.player.y, 20, this.player.color);
        this.playSound('powerup');
        this.gameLoop();
    }

    createParticleEffect(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                size: Math.random() * 4 + 2,
                speedX: (Math.random() - 0.5) * 8,
                speedY: (Math.random() - 0.5) * 8,
                color: color,
                life: 1,
                decay: Math.random() * 0.02 + 0.01
            });
        }
    }

    createTextEffect(text, x, y, color) {
        this.effects.push({
            text: text,
            x: x,
            y: y,
            color: color,
            life: 1
        });
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Обновление анимации рта
        this.updateMouthAnimation();

        // Обновление движения солнца (плавное движение вверх-вниз)
        this.sun.waveOffset += this.sun.speed;
        this.sun.y = this.sun.baseY + Math.sin(this.sun.waveOffset) * 15;

        // Обновление облаков
        this.updateClouds();

        // Обновление травы
        this.updateGrass();

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

    updateClouds() {
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            cloud.x -= cloud.speed * 0.5; // Облака двигаются медленнее фона

            // Если облако ушло за левую границу, перемещаем его вправо
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvas.width + Math.random() * 100;
                cloud.y = Math.random() * 150 + 50;
            }
        }
    }

    updateGrass() {
        // Обновляем смещение для волнового эффекта травы
        this.grassOffset += 0.1;

        for (let i = 0; i < this.grassBlades.length; i++) {
            const blade = this.grassBlades[i];

            // Плавное появление травинок
            if (blade.currentHeight < blade.baseHeight) {
                blade.currentHeight += 0.5;
            }

            // Колебание травинок (волновой эффект)
            blade.waveOffset += blade.speed;

            // Если игрок прыгает рядом, усиливаем колебания
            const distanceToPlayer = Math.abs(this.player.x - blade.x * 10);
            if (distanceToPlayer < 100 && this.player.isJumping) {
                blade.waveOffset += 0.1;
            }
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

    createCollectible() {
        this.collectibles.push({
            x: this.canvas.width,
            y: this.ground.y - 80,
            width: 20,
            height: 20,
            color: '#FFFF00',
            rotation: 0,
            type: 'coin'
        });
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life -= 0.02;
            effect.y -= 2;

            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    createObstacle() {
        const types = [
            { width: 35, height: 60, type: 'spike' },
            { width: 35, height: 90, type: 'spike' },
            { width: 80, height: 40, type: 'platform' }
        ];

        const type = types[Math.floor(Math.random() * types.length)];
        const theme = this.colorThemes[this.currentTheme];

        this.obstacles.push({
            x: this.canvas.width,
            y: type.type === 'platform' ? this.ground.y - type.height : this.ground.y - type.height,
            width: type.width,
            height: type.height,
            color: theme.secondary,
            type: type.type
        });
    }

    checkCollision(player, object) {
        return player.x < object.x + object.width &&
            player.x + player.width > object.x &&
            player.y < object.y + object.height &&
            player.y + player.height > object.y;
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

        // ОБЛАКА
        this.drawClouds();

        // СОЛНЦЕ с анимацией
        this.drawSun();

        // ЗЕМЛЯ
        this.ctx.fillStyle = '#81C784';
        this.ctx.fillRect(0, this.ground.y, this.canvas.width, this.ground.height);

        // ТРАВА
        this.drawGrass();

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

        // НОВЫЙ ВИД ПЕРСОНАЖА (более округлый и мультяшный)
        this.drawNewPlayer();

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

    drawClouds() {
        this.clouds.forEach(cloud => {
            this.ctx.save();
            this.ctx.globalAlpha = cloud.opacity;
            this.ctx.fillStyle = '#FFFFFF';

            // Рисуем пушистое облако из нескольких кругов
            const centerX = cloud.x + cloud.width / 2;
            const centerY = cloud.y + cloud.height / 2;

            // Основная часть облака
            this.ctx.beginPath();
            this.ctx.ellipse(centerX, centerY, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);

            // Добавляем пушистые части
            this.ctx.ellipse(centerX - cloud.width / 3, centerY - cloud.height / 4, cloud.width / 3, cloud.height / 3, 0, 0, Math.PI * 2);
            this.ctx.ellipse(centerX + cloud.width / 3, centerY - cloud.height / 4, cloud.width / 3, cloud.height / 3, 0, 0, Math.PI * 2);
            this.ctx.ellipse(centerX - cloud.width / 4, centerY + cloud.height / 4, cloud.width / 4, cloud.height / 4, 0, 0, Math.PI * 2);
            this.ctx.ellipse(centerX + cloud.width / 4, centerY + cloud.height / 4, cloud.width / 4, cloud.height / 4, 0, 0, Math.PI * 2);

            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawSun() {
        this.ctx.save();

        // Яркое свечение солнца
        const gradient = this.ctx.createRadialGradient(
            this.sun.x, this.sun.y, this.sun.radius,
            this.sun.x, this.sun.y, this.sun.radius * 2
        );
        gradient.addColorStop(0, '#FFEB3B');
        gradient.addColorStop(0.7, '#FFC107');
        gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x, this.sun.y, this.sun.radius * 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Само солнце
        this.ctx.fillStyle = '#FFEB3B';
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x, this.sun.y, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Детали солнца (улыбка и глаза)
        this.ctx.fillStyle = '#FF9800';

        // Глаза
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x - 12, this.sun.y - 8, 4, 0, Math.PI * 2);
        this.ctx.arc(this.sun.x + 12, this.sun.y - 8, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Улыбка
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x, this.sun.y + 5, 15, 0.2, Math.PI - 0.2);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#FF9800';
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawGrass() {
        // Основной слой травы (зеленая полоса)
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(0, this.ground.y - 10, this.canvas.width, 10);

        // Рисуем отдельные травинки
        this.grassBlades.forEach(blade => {
            this.ctx.save();

            // Позиция травинки
            const x = blade.x;
            const baseY = this.ground.y - 10;

            // Вычисляем высоту травинки с учетом волнового эффекта
            const waveEffect = Math.sin(blade.waveOffset + x * 0.01) * 2;
            const currentHeight = Math.max(0, blade.currentHeight + waveEffect);

            // Цвет травинки (немного варьируется)
            this.ctx.fillStyle = blade.color;
            this.ctx.strokeStyle = this.darkenColor(blade.color, 20);
            this.ctx.lineWidth = blade.width;

            // Рисуем травинку как изогнутую линию
            this.ctx.beginPath();
            this.ctx.moveTo(x, baseY);

            // Плавная кривая для травинки
            const cp1x = x + Math.sin(blade.waveOffset) * 3;
            const cp1y = baseY - currentHeight * 0.3;
            const cp2x = x - Math.sin(blade.waveOffset + 0.5) * 2;
            const cp2y = baseY - currentHeight * 0.7;

            this.ctx.bezierCurveTo(
                cp1x, cp1y,
                cp2x, cp2y,
                x + Math.sin(blade.waveOffset) * 5, baseY - currentHeight
            );

            this.ctx.stroke();

            // Верхушка травинки (маленький треугольник)
            this.ctx.beginPath();
            const tipX = x + Math.sin(blade.waveOffset) * 5;
            const tipY = baseY - currentHeight;
            this.ctx.moveTo(tipX, tipY);
            this.ctx.lineTo(tipX - 2, tipY - 3);
            this.ctx.lineTo(tipX + 2, tipY - 3);
            this.ctx.closePath();
            this.ctx.fill();

            // Цветочки на некоторых травинках (случайно)
            if (Math.random() > 0.7) {
                this.ctx.fillStyle = ['#FF6B6B', '#FFD166', '#FF4081'][Math.floor(Math.random() * 3)];
                this.ctx.beginPath();
                this.ctx.arc(tipX, tipY - 5, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });

        // Мелкие детали на земле (камушки, комочки земли)
        this.drawGroundDetails();
    }

    drawGroundDetails() {
        // Рисуем мелкие детали на земле
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.ground.y - 5 + Math.random() * 5;
            const size = Math.random() * 3 + 1;

            this.ctx.fillStyle = ['#795548', '#5D4037', '#4E342E'][Math.floor(Math.random() * 3)];
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawNewPlayer() {
        const theme = this.colorThemes[this.currentTheme];
        const width = this.player.width;
        const height = this.player.height;

        // Тело персонажа (округлый квадрат)
        this.ctx.fillStyle = theme.primary;
        this.ctx.beginPath();
        this.ctx.roundRect(-width / 2, -height / 2, width, height, 15);
        this.ctx.fill();

        // Тень для объема
        const shadowGradient = this.ctx.createLinearGradient(
            -width / 2, -height / 2,
            width / 2, height / 2
        );
        shadowGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
        shadowGradient.addColorStop(1, 'rgba(0,0,0,0.1)');

        this.ctx.fillStyle = shadowGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(-width / 2, -height / 2, width, height, 15);
        this.ctx.fill();

        // Обводка
        this.ctx.strokeStyle = this.darkenColor(theme.primary, 30);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(-width / 2, -height / 2, width, height, 15);
        this.ctx.stroke();

        // ГЛАЗЫ
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(-width / 4, -height / 4, 6, 0, Math.PI * 2);
        this.ctx.arc(width / 4, -height / 4, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Зрачки
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(-width / 4, -height / 4, 3, 0, Math.PI * 2);
        this.ctx.arc(width / 4, -height / 4, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Блики в глазах
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(-width / 4 - 1, -height / 4 - 1, 1.5, 0, Math.PI * 2);
        this.ctx.arc(width / 4 - 1, -height / 4 - 1, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // РОТ С АНИМАЦИЕЙ
        this.drawNewMouth();
    }

    drawNewMouth() {
        const mouthY = this.player.height / 8;
        const mouthWidth = 22;
        let mouthHeight = 6;
        let mouthCurve = 0;
        let isRound = false;

        // Настройки рта в зависимости от состояния
        switch (this.player.mouthState) {
            case 'normal':
                // Нормальный рот - улыбка
                mouthHeight = 5 + (this.player.mouthOpenness * 2);
                mouthCurve = 0.6;
                break;

            case 'smiling':
                // Широкая улыбка
                mouthHeight = 6 + (this.player.mouthOpenness * 4);
                mouthCurve = 1.8;
                break;

            case 'surprised':
                // Удивленный рот (круглый)
                mouthHeight = 10 + (this.player.mouthOpenness * 6);
                mouthCurve = 0;
                isRound = true;
                break;

            case 'sad':
                // Грустный рот (перевернутая улыбка)
                mouthHeight = 4 + (this.player.mouthOpenness * 2);
                mouthCurve = -0.8;
                break;
        }

        // Если рот полностью открыт в режиме разговора
        if (this.player.isTalking && this.player.mouthOpenness > 0.8) {
            mouthHeight = 12;
            mouthCurve = 0;
            isRound = true;
        }

        // Рисуем рот
        this.ctx.fillStyle = '#000000';

        if (isRound) {
            // Круглый рот
            this.ctx.beginPath();
            this.ctx.ellipse(0, mouthY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Язык для разговора
            if (this.player.isTalking) {
                this.ctx.fillStyle = '#FF6B6B';
                this.ctx.beginPath();
                this.ctx.ellipse(0, mouthY + mouthHeight / 3, 5, 4, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // Изогнутый рот
            this.ctx.beginPath();

            if (mouthCurve > 0) {
                // Улыбка
                this.ctx.ellipse(0, mouthY + mouthHeight / 3, mouthWidth / 2, mouthHeight / 2,
                    0, Math.PI * 0.1, Math.PI * 0.9);
            } else {
                // Грусть (перевернутая улыбка)
                this.ctx.ellipse(0, mouthY - mouthHeight / 3, mouthWidth / 2, mouthHeight / 2,
                    0, Math.PI * 1.1, Math.PI * 1.9);
            }

            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Язык для широкой улыбки
            if (mouthCurve > 1 && this.player.mouthOpenness > 0.7) {
                this.ctx.fillStyle = '#FF6B6B';
                this.ctx.beginPath();
                this.ctx.ellipse(0, mouthY + mouthHeight / 1.5, 6, 5, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Добавляем блик на рот
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.beginPath();
        if (isRound) {
            this.ctx.ellipse(-mouthWidth / 4, mouthY - mouthHeight / 4, 3, 2, 0, 0, Math.PI * 2);
        } else if (mouthCurve > 0) {
            this.ctx.ellipse(-mouthWidth / 3, mouthY + mouthHeight / 4, 4, 2, 0, 0, Math.PI * 2);
        }
        this.ctx.fill();
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

    updateScore() {
        if (this.scoreElement) {
            this.scoreElement.textContent = `⭐ Очки: ${this.score}`;
        }

        if (this.score > this.highScore) {
            this.highScore = this.score;
            if (this.highScoreElement) {
                this.highScoreElement.textContent = `🏆 Рекорд: ${this.highScore}`;
            }
            localStorage.setItem('geometryDashHighScore', this.highScore);
        }
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

    restartGame() {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.classList.add('playing');
        }

        const menu = document.getElementById('menu');
        if (menu) {
            menu.classList.add('hidden');
        }

        this.currentTheme = (this.currentTheme + 1) % this.colorThemes.length;
        this.initGame();
        this.startGame();
    }

    shareScore() {
        const shareText = `🎮 Я набрал ${this.score} очков в Geometry Dash Ultimate!`;
        if (navigator.share) {
            navigator.share({
                title: 'Geometry Dash Ultimate',
                text: shareText
            });
        } else {
            alert(shareText);
        }
    }

    sendScoreToBot() {
        try {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.sendData(JSON.stringify({
                    action: 'game_score',
                    score: this.score,
                    highScore: this.highScore
                }));
            }
        } catch (e) {
            console.log('Cannot send data to bot:', e);
        }
    }

    gameLoop() {
        this.update();
        this.draw();

        if (this.gameState === 'playing') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Добавляем поддержку roundRect для CanvasRenderingContext2D (если не поддерживается)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;

        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();

        return this;
    }
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