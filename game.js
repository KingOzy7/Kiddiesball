/**
 * 3D-Style Top-Down Football Game
 * Complete Vanilla JS Game Architecture
 */
const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

if (!isMobile) {
  alert("Sorry, this game can only be played on a phone or tablet.");
}
let landscapemode;
const loadingScreen = document.querySelector('#loading-screen');
const gameContainer = document.querySelector('#game-container');

// Global Constants & Pitch Config
// 1. Listen for the orientation change event
screen.orientation.addEventListener("change", () => {
  console.log(`Orientation changed to: ${screen.orientation.type}`);
  
  if (screen.orientation.type.startsWith("landscape")) {
    landscapemode = true;
    loadingScreen.style.display = "none";
    gameContainer.style.display = "block";
  } else if (screen.orientation.type.startsWith("portrait")) {
    landscapemode = false;
    loadingScreen.style.display = "block";
    gameContainer.style.display = "none";
  }
});


    const PITCH_WIDTH = 1200;
    const PITCH_HEIGHT = 800;
    const GOAL_HEIGHT = 160;
    const PADDING = 100;
    const PLAYER_RADIUS = 16;
    const BALL_RADIUS = 8;
    const MATCH_DURATION = 180; // 3 Minutes

    // Asset Generator (Procedural Sprites)
    class AssetGenerator {
        static createPlayerSprite(color, outlineColor) {
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');

            // Body
            ctx.beginPath();
            ctx.arc(20, 20, 15, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = outlineColor;
            ctx.stroke();

            // Head/Shoulders 3D Perspective Indicator
            ctx.beginPath();
            ctx.arc(20, 16, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffdbac'; // Skin tone
            ctx.fill();

            // Direction Indicator (Facing Vector)
            ctx.beginPath();
            ctx.moveTo(20, 20);
            ctx.lineTo(35, 20);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            return canvas;
        }

        static createBallSprite() {
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            const ctx = canvas.getContext('2d');

            // Ball Shadow Base
            ctx.beginPath();
            ctx.arc(10, 10, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000000';
            ctx.stroke();

            // Pentagon details
            ctx.beginPath();
            ctx.arc(10, 10, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            return canvas;
        }
    }

    // Input Manager
    class InputHandler {
        constructor() {
            this.keys = {};
            this.joystickVector = { x: 0, y: 0 };
            this.isSprinting = false;
            this.passPressed = false;
            this.shootPressed = false;
            this.switchPressed = false;

            this.setupKeyboard();
            this.setupTouchControls();
        }

        setupKeyboard() {
            window.addEventListener('keydown', (e) => {
                this.keys[e.code] = true;
                if (e.code === 'KeyE') this.passPressed = true;
                if (e.code === 'Space') this.shootPressed = true;
                if (e.code === 'KeyQ') this.switchPressed = true;
            });

            window.addEventListener('keyup', (e) => {
                this.keys[e.code] = false;
            });
        }

        setupTouchControls() {
            const base = document.getElementById('joystick-base');
            const stick = document.getElementById('joystick-stick');
            let touchId = null;

            if (!base) return;

            base.addEventListener('touchstart', (e) => {
                const touch = e.changedTouches[0];
                touchId = touch.identifier;
                this.updateJoystick(touch, base, stick);
            });

            window.addEventListener('touchmove', (e) => {
                if (touchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === touchId) {
                        this.updateJoystick(e.changedTouches[i], base, stick);
                    }
                }
            });

            const resetJoystick = (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === touchId) {
                        touchId = null;
                        stick.style.transform = `translate(0px, 0px)`;
                        this.joystickVector = { x: 0, y: 0 };
                    }
                }
            };

            window.addEventListener('touchend', resetJoystick);
            window.addEventListener('touchcancel', resetJoystick);

            // Buttons
            const bindBtn = (id, action) => {
                const btn = document.getElementById(id);
                if (!btn) return;
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    action(true);
                });
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    action(false);
                });
            };

            bindBtn('m-btn-pass', (val) => { if (val) this.passPressed = true; });
            bindBtn('m-btn-shoot', (val) => { if (val) this.shootPressed = true; });
            bindBtn('m-btn-switch', (val) => { if (val) this.switchPressed = true; });
            bindBtn('m-btn-sprint', (val) => { this.isSprinting = val; });
        }

        updateJoystick(touch, base, stick) {
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const maxRadius = rect.width / 2;

            const distance = Math.hypot(dx, dy);
            if (distance > maxRadius) {
                dx = (dx / distance) * maxRadius;
                dy = (dy / distance) * maxRadius;
            }

            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            this.joystickVector = { x: dx / maxRadius, y: dy / maxRadius };
        }

        getVector() {
            let vx = 0;
            let vy = 0;

            if (this.keys['KeyW'] || this.keys['ArrowUp']) vy -= 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) vy += 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) vx -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) vx += 1;

            if (vx !== 0 || vy !== 0) {
                const len = Math.hypot(vx, vy);
                return { x: vx / len, y: vy / len };
            }

            return this.joystickVector;
        }
    }

    // Player Entity
    class Player {
        constructor(x, y, team, isUserControlled = false, role = 'field') {
            this.x = x;
            this.y = y;
            this.homeX = x;
            this.homeY = y;
            this.vx = 0;
            this.vy = 0;
            this.team = team; // 'red' or 'blue'
            this.isUserControlled = isUserControlled;
            this.role = role; // 'gk' or 'field'
            this.angle = team === 'red' ? 0 : Math.PI;
            
            this.baseSpeed = 3.2;
            this.sprintSpeed = 5.2;
            this.radius = PLAYER_RADIUS;
            this.stamina = 100;
            
            this.sprite = team === 'red' 
                ? AssetGenerator.createPlayerSprite('#ef4444', '#b91c1c')
                : AssetGenerator.createPlayerSprite('#3b82f6', '#1d4ed8');
        }

        update(input, ball, game) {
            let targetVx = 0;
            let targetVy = 0;
            let speed = this.baseSpeed;

            if (this.isUserControlled) {
                const dir = input.getVector();
                const wantsSprint = input.keys['ShiftLeft'] || input.isSprinting;

                if (wantsSprint && this.stamina > 5 && (dir.x !== 0 || dir.y !== 0)) {
                    speed = this.sprintSpeed;
                    this.stamina = Math.max(0, this.stamina - 0.4);
                } else {
                    this.stamina = Math.min(100, this.stamina + 0.2);
                }

                targetVx = dir.x * speed;
                targetVy = dir.y * speed;
            } else {
                // AI Logic
                this.stamina = Math.min(100, this.stamina + 0.1);
                const aiDir = this.getAIDirection(ball, game);
                targetVx = aiDir.x * this.baseSpeed;
                targetVy = aiDir.y * this.baseSpeed;
            }

            // Acceleration physics
            this.vx += (targetVx - this.vx) * 0.2;
            this.vy += (targetVy - this.vy) * 0.2;

            this.x += this.vx;
            this.y += this.vy;

            // Angle Facing Dynamic
            if (Math.hypot(this.vx, this.vy) > 0.5) {
                this.angle = Math.atan2(this.vy, this.vx);
            }

            // Keep inside Pitch Bounds
            this.x = Math.max(PADDING, Math.min(PITCH_WIDTH + PADDING, this.x));
            this.y = Math.max(PADDING, Math.min(PITCH_HEIGHT + PADDING, this.y));
        }

        getAIDirection(ball, game) {
            const distToBall = Math.hypot(ball.x - this.x, ball.y - this.y);

            if (this.role === 'gk') {
                const goalX = this.team === 'red' ? PADDING : PADDING + PITCH_WIDTH;
                const targetY = Math.max(PADDING + PITCH_HEIGHT/2 - 60, Math.min(PADDING + PITCH_HEIGHT/2 + 60, ball.y));
                return {
                    x: Math.sign((goalX + (this.team === 'red' ? 20 : -20)) - this.x) * 0.5,
                    y: Math.sign(targetY - this.y) * 0.8
                };
            }

            // Nearest player chases ball
            const nearestTeammate = game.getNearestPlayerToBall(this.team);
            if (nearestTeammate === this) {
                const dx = ball.x - this.x;
                const dy = ball.y - this.y;
                const len = Math.hypot(dx, dy) || 1;
                return { x: dx / len, y: dy / len };
            }

            // Tactical positioning back home
            const dx = this.homeX - this.x;
            const dy = this.homeY - this.y;
            const len = Math.hypot(dx, dy) || 1;
            return len > 20 ? { x: (dx / len) * 0.6, y: (dy / len) * 0.6 } : { x: 0, y: 0 };
        }
    }

    // Ball Physics Entity
    class Ball {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.z = 0; // Height vertical elevation for 3D trajectory
            this.vx = 0;
            this.vy = 0;
            this.vz = 0;
            this.radius = BALL_RADIUS;
            this.friction = 0.98;
            this.gravity = 0.4;
            this.sprite = AssetGenerator.createBallSprite();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.z += this.vz;

            if (this.z > 0) {
                this.vz -= this.gravity;
            } else {
                this.z = 0;
                this.vz = -this.vz * 0.4; // Bounce damping
                if (Math.abs(this.vz) < 1) this.vz = 0;
            }

            this.vx *= this.friction;
            this.vy *= this.friction;

            // Boundary Wall Collisions (Excluding Goal mouth)
            const inGoalY = this.y > PADDING + PITCH_HEIGHT/2 - GOAL_HEIGHT/2 && this.y < PADDING + PITCH_HEIGHT/2 + GOAL_HEIGHT/2;

            if (!inGoalY) {
                if (this.x < PADDING) { this.x = PADDING; this.vx *= -0.5; }
                if (this.x > PADDING + PITCH_WIDTH) { this.x = PADDING + PITCH_WIDTH; this.vx *= -0.5; }
            }
            if (this.y < PADDING) { this.y = PADDING; this.vy *= -0.5; }
            if (this.y > PADDING + PITCH_HEIGHT) { this.y = PADDING + PITCH_HEIGHT; this.vy *= -0.5; }
        }

        kick(angle, power, verticalPower = 0) {
            this.vx = Math.cos(angle) * power;
            this.vy = Math.sin(angle) * power;
            this.vz = verticalPower;
        }
    }

    // Particle System
    class ParticleSystem {
        constructor() {
            this.particles = [];
        }

        addKickEffect(x, y) {
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 1.0,
                    color: '#ffffff'
                });
            }
        }

        update() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                let p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        }

        render(ctx) {
            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    }

    // Main Game Controller
    class FootballGame {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.input = new InputHandler();
            this.particles = new ParticleSystem();

            this.redScore = 0;
            this.blueScore = 0;
            this.matchTimer = MATCH_DURATION;
            this.isPaused = false;
            this.isGameOver = false;
            this.kickoffTimer = 0;

            this.camera = { x: 0, y: 0 };
            
            this.initEntities();
            this.setupUI();
            this.resize();

            window.addEventListener('resize', () => this.resize());
            requestAnimationFrame((t) => this.gameLoop(t));
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        initEntities() {
            this.ball = new Ball(PADDING + PITCH_WIDTH / 2, PADDING + PITCH_HEIGHT / 2);

            // Player Initial Formation
            this.redPlayers = [
                new Player(PADDING + 50, PADDING + PITCH_HEIGHT / 2, 'red', false, 'gk'),
                new Player(PADDING + 300, PADDING + 200, 'red', true), // Controlled Player
                new Player(PADDING + 300, PADDING + 600, 'red', false),
                new Player(PADDING + 500, PADDING + 400, 'red', false)
            ];

            this.bluePlayers = [
                new Player(PADDING + PITCH_WIDTH - 50, PADDING + PITCH_HEIGHT / 2, 'blue', false, 'gk'),
                new Player(PADDING + PITCH_WIDTH - 300, PADDING + 200, 'blue', false),
                new Player(PADDING + PITCH_WIDTH - 300, PADDING + 600, 'blue', false),
                new Player(PADDING + PITCH_WIDTH - 500, PADDING + 400, 'blue', false)
            ];

            this.controlledPlayer = this.redPlayers[1];
        }

        resetPositions() {
            this.ball.x = PADDING + PITCH_WIDTH / 2;
            this.ball.y = PADDING + PITCH_HEIGHT / 2;
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.z = 0;

            const setHome = (p) => { p.x = p.homeX; p.y = p.homeY; p.vx = 0; p.vy = 0; };
            this.redPlayers.forEach(setHome);
            this.bluePlayers.forEach(setHome);
        }

        getNearestPlayerToBall(team) {
            const list = team === 'red' ? this.redPlayers : this.bluePlayers;
            let minD = Infinity;
            let nearest = list[0];
            list.forEach(p => {
                const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
                if (d < minD) {
                    minD = d;
                    nearest = p;
                }
            });
            return nearest;
        }

        switchPlayer() {
            let bestCandidate = null;
            let minD = Infinity;
            this.redPlayers.forEach(p => {
                if (p.role !== 'gk' && !p.isUserControlled) {
                    const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
                    if (d < minD) {
                        minD = d;
                        bestCandidate = p;
                    }
                }
            });

            if (bestCandidate) {
                this.controlledPlayer.isUserControlled = false;
                bestCandidate.isUserControlled = true;
                this.controlledPlayer = bestCandidate;
            }
        }

        update(dt) {
            if (this.isPaused || this.isGameOver) return;

            // Timer Update
            if (this.kickoffTimer > 0) {
                this.kickoffTimer -= dt;
                if (this.kickoffTimer <= 0) {
                    document.getElementById('kickoff-banner').classList.add('hidden');
                }
            } else {
                this.matchTimer = Math.max(0, this.matchTimer - dt);
                if (this.matchTimer === 0) this.endGame();
            }

            // Switch key trigger
            if (this.input.switchPressed) {
                this.switchPlayer();
                this.input.switchPressed = false;
            }

            // Entity Updates
            const allPlayers = [...this.redPlayers, ...this.bluePlayers];
            allPlayers.forEach(p => p.update(this.input, this.ball, this));
            this.ball.update();
            this.particles.update();

            // Handle Player-Ball Interactions
            this.handleBallInteractions();
            this.handleGoalDetection();

            // Smooth Elevated Camera Target Locking
            const targetCamX = this.controlledPlayer.x - this.canvas.width / 2;
            const targetCamY = this.controlledPlayer.y - this.canvas.height / 2;
            this.camera.x += (targetCamX - this.camera.x) * 0.1;
            this.camera.y += (targetCamY - this.camera.y) * 0.1;

            // UI Updates
            document.getElementById('stamina-fill').style.width = `${this.controlledPlayer.stamina}%`;
            this.updateTimerUI();
        }

        handleBallInteractions() {
            const p = this.controlledPlayer;
            const distToBall = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);

            // Pass Action
            if (this.input.passPressed) {
                this.input.passPressed = false;
                if (distToBall < 35) {
                    this.ball.kick(p.angle, 9);
                    this.particles.addKickEffect(this.ball.x, this.ball.y);
                }
            }

            // Shoot Action
            if (this.input.shootPressed) {
                this.input.shootPressed = false;
                if (distToBall < 35) {
                    this.ball.kick(p.angle, 15, 6); // Includes air trajectory lift
                    this.particles.addKickEffect(this.ball.x, this.ball.y);
                }
            }

            // Dribble Collision / Soft push
            const allPlayers = [...this.redPlayers, ...this.bluePlayers];
            allPlayers.forEach(player => {
                const d = Math.hypot(player.x - this.ball.x, player.y - this.ball.y);
                if (d < player.radius + this.ball.radius) {
                    const overlap = (player.radius + this.ball.radius) - d;
                    const angle = Math.atan2(this.ball.y - player.y, this.ball.x - player.x);
                    this.ball.x += Math.cos(angle) * overlap;
                    this.ball.y += Math.sin(angle) * overlap;
                    this.ball.vx += Math.cos(angle) * 1.5;
                    this.ball.vy += Math.sin(angle) * 1.5;
                }
            });
        }

        handleGoalDetection() {
            const goalTop = PADDING + PITCH_HEIGHT / 2 - GOAL_HEIGHT / 2;
            const goalBottom = PADDING + PITCH_HEIGHT / 2 + GOAL_HEIGHT / 2;

            if (this.ball.y > goalTop && this.ball.y < goalBottom) {
                // Red Goal (Left) -> Point for Blue
                if (this.ball.x < PADDING - 10) {
                    this.scoreGoal('blue');
                }
                // Blue Goal (Right) -> Point for Red
                if (this.ball.x > PADDING + PITCH_WIDTH + 10) {
                    this.scoreGoal('red');
                }
            }
        }

        scoreGoal(team) {
            if (team === 'red') this.redScore++;
            else this.blueScore++;

            document.getElementById('score-red').innerText = this.redScore;
            document.getElementById('score-blue').innerText = this.blueScore;

            const banner = document.getElementById('kickoff-banner');
            banner.innerText = `GOAL FOR ${team.toUpperCase()}!`;
            banner.classList.remove('hidden');

            this.kickoffTimer = 2.0;
            this.resetPositions();
        }

        updateTimerUI() {
            const mins = Math.floor(this.matchTimer / 60);
            const secs = Math.floor(this.matchTimer % 60);
            document.getElementById('match-timer').innerText = 
                `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        render() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            // Camera Viewport Transformation
            this.ctx.translate(-this.camera.x, -this.camera.y);

            // Render Pitch, Markings, Entities
            this.renderPitch();
            this.particles.render(this.ctx);
            this.renderEntities();

            this.ctx.restore();
        }

        renderPitch() {
            // Pitch Grass Background
            this.ctx.fillStyle = '#15803d';
            this.ctx.fillRect(PADDING, PADDING, PITCH_WIDTH, PITCH_HEIGHT);

            // Lawn Stripes Visual Styling
            this.ctx.fillStyle = '#16a34a';
            const stripeWidth = PITCH_WIDTH / 10;
            for (let i = 0; i < 10; i += 2) {
                this.ctx.fillRect(PADDING + i * stripeWidth, PADDING, stripeWidth, PITCH_HEIGHT);
            }

            // Field Markings
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 4;

            // Boundaries
        this.ctx.strokeRect(PADDING, PADDING, PITCH_WIDTH, PITCH_HEIGHT);

            // Halfway Line
            this.ctx.beginPath();
            this.ctx.moveTo(PADDING + PITCH_WIDTH / 2, PADDING);
            this.ctx.lineTo(PADDING + PITCH_WIDTH / 2, PADDING + PITCH_HEIGHT);
            this.ctx.stroke();

            // Center Circle
            this.ctx.beginPath();
            this.ctx.arc(PADDING + PITCH_WIDTH / 2, PADDING + PITCH_HEIGHT / 2, 70, 0, Math.PI * 2);
            this.ctx.stroke();

            // Penalty Areas
            const boxHeight = 320;
            const boxWidth = 140;
            this.ctx.strokeRect(PADDING, PADDING + (PITCH_HEIGHT - boxHeight) / 2, boxWidth, boxHeight);
            this.ctx.strokeRect(PADDING + PITCH_WIDTH - boxWidth, PADDING + (PITCH_HEIGHT - boxHeight) / 2, boxWidth, boxHeight);

            // Goals Visualization
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            // Left Goal
            this.ctx.fillRect(PADDING - 30, PADDING + (PITCH_HEIGHT - GOAL_HEIGHT) / 2, 30, GOAL_HEIGHT);
            this.ctx.strokeRect(PADDING - 30, PADDING + (PITCH_HEIGHT - GOAL_HEIGHT) / 2, 30, GOAL_HEIGHT);
            // Right Goal
            this.ctx.fillRect(PADDING + PITCH_WIDTH, PADDING + (PITCH_HEIGHT - GOAL_HEIGHT) / 2, 30, GOAL_HEIGHT);
            this.ctx.strokeRect(PADDING + PITCH_WIDTH, PADDING + (PITCH_HEIGHT - GOAL_HEIGHT) / 2, 30, GOAL_HEIGHT);
        }

        renderEntities() {
            const allPlayers = [...this.redPlayers, ...this.bluePlayers];

            // 1. Shadows Projection
            allPlayers.forEach(p => {
                this.ctx.beginPath();
                this.ctx.ellipse(p.x, p.y + 12, 14, 6, 0, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                this.ctx.fill();
            });

            // Ball Shadow
            this.ctx.beginPath();
            this.ctx.ellipse(this.ball.x, this.ball.y + 8, 8, 4, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fill();

            // 2. Render Players
            allPlayers.forEach(p => {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle);
                this.ctx.drawImage(p.sprite, -20, -20);
                this.ctx.restore();

                // Active Player Highlight Indicator Marker
                if (p.isUserControlled) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y - 26);
                    this.ctx.lineTo(p.x - 6, p.y - 36);
                    this.ctx.lineTo(p.x + 6, p.y - 36);
                    this.ctx.closePath();
                    this.ctx.fillStyle = '#facc15';
                    this.ctx.fill();
                }
            });

            // 3. Render Ball (3D Elevated Offset Height rendering)
            this.ctx.drawImage(
                this.ball.sprite, 
                this.ball.x - 10, 
                this.ball.y - 10 - this.ball.z
            );
        }
        setupUI() {
            document.getElementById('btn-play').onclick = () => {
                document.getElementById('start-screen').classList.add('hidden');
                document.getElementById('hud').classList.remove('hidden');
                this.lastTime = performance.now();
            };

            document.getElementById('btn-how').onclick = () => {
                document.getElementById('how-screen').classList.remove('hidden');
            };

            document.getElementById('btn-back').onclick = () => {
                document.getElementById('how-screen').classList.add('hidden');
            };

            document.getElementById('btn-pause').onclick = () => {
                this.isPaused = !this.isPaused;
                document.getElementById('btn-pause').innerText = this.isPaused ? '▶' : '⏸';
            };

            document.getElementById('btn-restart').onclick = () => this.restartGame();
            document.getElementById('btn-restart-final').onclick = () => {
                document.getElementById('end-screen').classList.add('hidden');
                this.restartGame();
            };
        }

        restartGame() {
            this.redScore = 0;
            this.blueScore = 0;
            this.matchTimer = MATCH_DURATION;
            this.isGameOver = false;
            document.getElementById('score-red').innerText = '0';
            document.getElementById('score-blue').innerText = '0';
            this.resetPositions();
        }

        endGame() {
            this.isGameOver = true;
            document.getElementById('final-red').innerText = this.redScore;
            document.getElementById('final-blue').innerText = this.blueScore;

            const resText = document.getElementById('end-result-text');
            if (this.redScore > this.blueScore) resText.innerText = "VICTORY! RED TEAM WINS!";
            else if (this.blueScore > this.redScore) resText.innerText = "DEFEAT! BLUE TEAM WINS!";
            else resText.innerText = "IT'S A DRAW!";

            document.getElementById('end-screen').classList.remove('hidden');
        }

        gameLoop(now) {
            const dt = (now - (this.lastTime || now)) / 1000;
            this.lastTime = now;

            this.update(Math.min(dt, 0.1));
            this.render();

            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    // Instantiate Game on DOM Load
    window.addEventListener('DOMContentLoaded', () => {
        new FootballGame();
    });

