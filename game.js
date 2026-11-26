// Настройка Phaser
var config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1170,
    height: 880,
    transparent: true,

    dom: { createContainer: true },

    scene: {
        preload: preload,
        create: create,
        update: update,
    },

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 200 },
            debug: false
        }
    },
}

// Создание экземпляра игры
var game = new Phaser.Game(config);

/**
 * @this {Phaser.Scene}
 */
// Загрузка ресурсов игры
function preload() {
    this.load.image('bg', 'assets/background.png');
    this.load.image('bg_balloons', 'assets/balloons_bg.png');
    this.load.image('case', 'assets/case.png');

    this.load.image('claw_default', 'assets/claw_default.png');
    this.load.image('claw_default_hide', 'assets/claw_default_hide.png');
    this.load.image('claw_active', 'assets/claw_active.png');
    this.load.image('claw_active_small', 'assets/claw_active_small.png');
    this.load.image('claw_disabled', 'assets/claw_disabled.png');

    this.load.image('lever_up', 'assets/lever_up.png');
    this.load.image('lever_down', 'assets/lever_down.png');
    
    this.load.image('ball1', 'assets/ball_dug.png');
    this.load.image('ball2', 'assets/ball_microphone.png');
    this.load.image('ball3', 'assets/ball_dog.png');
    this.load.image('ball4', 'assets/ball_addy.png');
    this.load.image('ball5', 'assets/ball_piggy.png');

    this.load.image('active_ball1', 'assets/active_ball_dug.png');
    this.load.image('active_ball2', 'assets/active_ball_microphone.png');
    this.load.image('active_ball3', 'assets/active_ball_dog.png');
    this.load.image('active_ball4', 'assets/active_ball_addy.png');
    this.load.image('active_ball5', 'assets/active_ball_piggy.png');
}


const ballsList = ['ball1', 'ball2', 'ball3', 'ball4', 'ball5'];
const sizesSmallBalls = [98, 110, 120, 117];

/**
 * @this {Phaser.Scene}
 */
// Инициализация параметров и создание игровых объектов
function create() {
    this.isStartGame = false;
    this.isPointerInZone = false;
    this.isInputEnabled = false;

    this.score = loadAttempts();
    this.clawState = 'default';
    this.clawContact = false;
    this.clawCandidate = null;
    this.caughtBall = null;
    this.dropAnimationUntil = 0;

    createBackground(this);
    createInterface(this);
    createModals(this);

    const walls = createWalls(this);
    this.balls = createBalls(this, walls);
    this.smallBalls = createSmallBalls(this, walls);
    this.claw = createClaw(this);
    this.clawTargetX = this.claw.x;

    setupCollisions(this);
    setupKeyboard(this);
    setupMouse(this);
    setupButtons(this);
} 

// Загрузка и проверка количества доступных попыток
function loadAttempts() {
    let row = localStorage.getItem('addy_attempts');
    let data;

    if (!row) {
        data = {
            attempts: 3,
            lastAttemptDate: Date.now()
        };
    } 
    else {
        data = JSON.parse(row);

        if (Date.now() - data.lastAttemptDate >= 60 * 1000) {
            data.attempts = 3;
            data.lastAttemptDate = Date.now();
        }
    }

    localStorage.setItem('addy_attempts', JSON.stringify(data));

    return data.attempts;
}

// Списание попытки и сохранение изменений
function spendAttempt() {
    let row = localStorage.getItem('addy_attempts');
    if (!row) return;

    let data = JSON.parse(row);

    if (data.attempts > 0) {
        if (data.attempts === 3) 
            data.lastAttemptDate = Date.now();

        data.attempts--;
        localStorage.setItem('addy_attempts', JSON.stringify(data));
    }

    return data.attempts;
}

// Создание шаблона игрового автомата
function createBackground(scene) {
    scene.add.image(585, 350, 'bg').setDisplaySize(1075, 610).setDepth(0);
    scene.add.image(0, 0, 'case').setOrigin(0, 0).setDisplaySize(1170, 850).setDepth(3);
    scene.add.image(585, 510, 'bg_balloons').setDepth(1);

    scene.interactiveZone = scene.add.zone(585, 300, 1097, 620).setInteractive().setDepth(3);

    scene.add.dom(850, 610).createFromHTML(`<img src="assets/lever_up.png" id="lever">`).setDepth(3);
    scene.leverImage = document.getElementById('lever');
}

// Создание элементов интерфейса
function createInterface(scene) {
    scene.scoreText = scene.add.dom(750, 735).createFromHTML(`<span id="score">0${scene.score}/03</span>`).setDepth(4);
    scene.btn = scene.add.dom(350, 730).createFromHTML(`<button id="grab-btn" class="grab-btn">Начать игру</button>`).setDepth(4);

    if (scene.score === 0) document.getElementById('grab-btn').classList.add('disabled');
}

// Создание модальных окон
function createModals(scene) {
     scene.victoryModal = scene.add.dom(580, 295).setVisible(false).setDepth(2).createFromHTML(`
        <div id="overlay-victory" class="modal-overlay">
            <div id="window-victory" class="modal-window">
                <div class="modal-img">
                    <img src="assets/modal_victory.png" alt="Victory">
                </div>

                <h2>Победа!</h2>
                <h3>Поздравляем! Ваш бонус - промокод на специальный подарок от ADDY</h3>

                <button id="victory-close-btn" class="modal-btn">Забрать промокод</button>
            </div>
        </div>
    `);

    scene.defeatModal = scene.add.dom(580, 295).setDepth(2).setVisible(false).createFromHTML(`
        <div id="overlay-defeat" class="modal-overlay">
            <div id="window-defeat" class="modal-window">
                <div class="modal-img">
                    <img src="assets/modal_defeat.png" alt="Defeat">
                </div>

                <h2>Не повезло!</h2>
                <h3>На этот раз клешня вернулась пустой. У вас ещё есть шанс - попробуйте снова!</h3>

                <button id="defeat-close-btn" class="modal-btn">Продолжить</button>
            </div>
        </div>    
    `);

    scene.overModal = scene.add.dom(580, 295).setVisible(false).setDepth(2).createFromHTML(`     
        <div id="overlay-over" class="modal-overlay">
            <div id="window-over" class="modal-window">
                <div class="modal-img">
                    <img src="assets/modal_over.png" alt="Lives are over">
                </div>

                <h2>Попытки закончились</h2>
                <h3>Спасибо за игру! Загляните в наш блог - впереди ещё много сюрпризов)</h3>

                <button id="over-close-btn" class="modal-btn">Перейти в блог</button>
            </div>
        </div>    
    `);


    document.getElementById('victory-close-btn').addEventListener('click', () => { closeModal(scene.victoryModal, scene); });
    document.getElementById('defeat-close-btn').addEventListener('click', () => { closeModal(scene.defeatModal, scene); });
    document.getElementById('over-close-btn').addEventListener('click', () => { closeModal(scene.overModal, scene); });
}

// Открытие модального окна
function openModal(modal, scene) {
    if (scene) {
        modal.setVisible(true);
        scene.isStartGame = false;
        scene.physics.world.pause();
    }
}

// Закрытие модального окна
function closeModal(modal, scene) {
    if (scene) {
        modal.setVisible(false);
        
        if (scene.showOverModal) {
            scene.showOverModal = false;
            openModal(scene.overModal, scene);
            return;
        }

        scene.physics.world.resume();
        scene.isPointerInZone = false;
        scene.isStartGame = false;
    }
}

// Создание границ игровой области
function createWalls(scene) {
    const walls = scene.physics.add.staticGroup();
    const floor = scene.add.rectangle(585, 705, 1060, 190, 0x000000, 0);
    const right = scene.add.rectangle(1130, 300, 20, 600, 0x000000, 0);
    const left = scene.add.rectangle(30, 300, 20, 600, 0x000000, 0);
    walls.add(floor).add(right).add(left);
    walls.refresh();

    return walls;
}

// Создание группы осязаемых шаров и настройка столкновений
function createBalls(scene, walls) {
    const balls = scene.physics.add.group();

    for (let i = 0; i < 1; i++) {
        spawnBall(scene, balls);
    }

    scene.physics.add.collider(balls, walls);
    scene.physics.add.collider(balls, balls);

    return balls;
}

// Создание второго ряда маленьких шаров
function createSmallBalls(scene, walls) {
    const smallBalls = scene.physics.add.group();

    for (let i = 0; i < 3; i++) {
        spawnBall(scene, smallBalls, true);
    }

    scene.physics.add.collider(smallBalls, walls);
    scene.physics.add.collider(smallBalls, smallBalls);

    return smallBalls;
}

// Создание отдельного случайного шара
function spawnBall(scene, ballsGroup, isSmall = false) {
    const x = Phaser.Math.Between(200, 950);
    const y = Phaser.Math.Between(350, 400);
    const texture = Phaser.Utils.Array.GetRandom(ballsList);

    const ball = ballsGroup.create(x, y, texture);
    
    ball.originalTexture = texture;
    ball.setCollideWorldBounds(true);
    ball.setDepth(isSmall ? 1.5 : 1);
    ball.setBounce(1);
    ball.setDrag(70);

    if (isSmall) {
        const size = Phaser.Utils.Array.GetRandom(sizesSmallBalls);
        ball.setScale(size / 170);
        ball.body.setCircle(70, 20, 20);
    }
    else 
        ball.body.setCircle(75, 15, 15);

    return ball;
}

// Создание клешни и настройка её тела
function createClaw(scene) {
    const claw = scene.add.sprite(585, 75, 'claw_default').setOrigin(0.5, 0.7).setDepth(2);
    scene.physics.add.existing(claw);
    claw.body.setCircle(60, 25, 420);
    claw.body.setAllowGravity(false);
    claw.body.setImmovable(true);

    return claw;
}

// Настройка управления клавиатурой
function setupKeyboard(scene) {
    if (!scene.input.keyboard) return;
    
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.keys = scene.input.keyboard.addKeys('A,D,SPACE,ESC');

   /* scene.input.keyboard.on('keydown-ESC', () => {
        if (!scene.isInputEnabled) return;

        if (scene.victoryModal.visible) closeModal(scene.victoryModal, scene);
        else if (scene.defeatModal.visible) closeModal(scene.defeatModal, scene);
        else if (scene.overModal.visible) closeModal(scene.overModal, scene);
    }); */
}

// Настройка взаимодействия с помощью мыши
function setupMouse(scene) {
    scene.interactiveZone.on('pointerover', () => {
        if (scene.isStartGame) {
            scene.isPointerInZone = true;
            scene.game.canvas.focus();
            scene.input.setDefaultCursor('none');
        }
    });

    scene.interactiveZone.on('pointerout', () => {
        scene.input.setDefaultCursor('default');
        scene.isPointerInZone = false;
    });

    document.addEventListener('pointermove', (event) => {
        const rect = document.getElementById('game-container').getBoundingClientRect();
        const isOverGame = (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);

        scene.isInputEnabled = isOverGame;
    });    
}

// Настройка обработчика нажатия кнопки управления игрой
function setupButtons(scene) {
    document.getElementById('grab-btn').addEventListener('click', () => {
        const el = document.getElementById('grab-btn');

        scene.isPointerInZone = false;

        if (scene.victoryModal.visible || scene.defeatModal. visible || scene.overModal.visible)
            return;

        if (!scene.isStartGame && scene.score > 0) {
            scene.isStartGame = true;
            el.innerText = "Пуск";
            el.classList.add('start');
            scene.game.canvas.focus();
            return;
        }

        if (scene.isStartGame && el.classList.contains('start') && scene.clawState === 'default' && scene.score > 0)
            startDescending(scene);     
        
        if (el.classList.contains('disabled'))
            openModal(scene.overModal, scene);
    });
}

// Пересечение клешни с шарами
function setupCollisions(scene) {
    scene.physics.add.collider(scene.claw, scene.balls, handleClawContact, null, scene);
    scene.physics.add.collider(scene.claw, scene.smallBalls, handleClawContact, null, scene);

}

function handleClawContact(claw, ball) {
    if (this.clawState !== 'descending' || this.clawContact) return;

    const distanceX = Math.abs(ball.body.center.x - claw.body.center.x);
    const distanceY = Math.abs(ball.body.top - claw.body.bottom);

    const isSmall = this.smallBalls.contains(ball);

    const toleranceX = isSmall ? 20 : 10;
    const toleranceY = isSmall ? 25 : 14;

    if (distanceX <= toleranceX && distanceY <= toleranceY) {
        this.clawCandidate = ball;
    }

    this.clawContact = true;
}

/**
 * @this {Phaser.Scene}
 */
// Обновление состояний и обработка логики клешни
function update() {

   this.smallBalls.getChildren().forEach(ball => {
        if (ball.body.touching.down && Math.abs(ball.body.velocity.y) < 20) {
            ball.body.setVelocity(0, 0);
            ball.body.setAllowGravity(false);
        }
    });

    // Начальное состояние клешни 
    if (this.clawState === 'default')
    {
        if (this.score === 0) {
            this.claw.body.setCircle(55, 15, 420);
            this.claw.setTexture('claw_disabled');
        }
        
        if (this.isStartGame && this.isInputEnabled) {  
            if (!this.isPointerInZone) {
                if (this.cursors.left.isDown || this.keys.A.isDown) this.clawTargetX -= 5;
                if (this.cursors.right.isDown || this.keys.D.isDown) this.clawTargetX += 5;

                this.clawTargetX = Phaser.Math.Clamp(this.clawTargetX, 140, 1030);
            }
            else this.clawTargetX = Phaser.Math.Clamp(this.input.activePointer.x, 140, 1030);

            this.claw.x = Phaser.Math.Linear(this.claw.x, this.clawTargetX, 0.015);

            if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.cursors.down))
                startDescending(this);
            if (this.isPointerInZone && this.input.activePointer.leftButtonDown())
                startDescending(this);
        }
    }

    // Состояние клешни при опускании
    if (this.clawState === 'descending')
    {
        const balls = [...this.balls.getChildren(), ...this.smallBalls.getChildren()];

        // Поиск шара находящегося прямо под клешнёй
        const ballAhead = balls.filter(ball => {
            const distanceX = Math.abs(ball.body.center.x - this.claw.body.center.x);
            const gap = ball.body.top - this.claw.body.bottom;

            return distanceX <= 20 && gap >= 0 && gap <= 100;
        }).sort((a, b) => a.body.top - b.body.top)[0];

        // При успешном поиске шара смена текстуры клешни (скрыта средняя лапа)
        if (ballAhead) {
            const isSmall = this.smallBalls.contains(ballAhead);
            const gap = ballAhead.body.top - this.claw.body.bottom;

            const hideDistance = isSmall ? 45 : 70;

            if (gap <= hideDistance && this.claw.texture.key !== 'claw_default_hide') this.claw.setTexture('claw_default_hide');
        }

        // Момент когда клешня прекращает опускаться
        if (this.clawContact || this.claw.y >= 430) {
            if (this.clawCandidate) {
                const ball = this.clawCandidate;
                this.caughtBall = ball;
                this.originalTextureBall = ball.originalTexture;

                const isSmall = this.smallBalls.contains(ball);

                // Смещение шара относительно клешни при поднятии
                this.caughtOffsetX = ball.x - this.claw.x;
                this.caughtOffsetY = ball.y - this.claw.y - (isSmall ? 10 : 0);
                
                ball.body.enable = false;

                this.isDrop = Math.random() < 0.50;
                if (this.isDrop) this.dropHeight = Phaser.Math.Between(200, 280);
            }
            else this.caughtBall = null;

            this.clawState = 'closing';
            this.closingStart = this.time.now;

            this.clawContact = false;
            this.clawCandidate = null;
        } else {
            this.claw.y += 2;
        }
    }

    // Состояние клешни, когда она сомкнулась | Обработка захвата
    if (this.clawState === 'closing') {
        if (this.time.now - this.closingStart >= 250) {
            if (this.caughtBall) {
                this.caughtBall.setVelocity(0, 0);
                this.caughtBall.setTexture('active_' + this.caughtBall.originalTexture);

                const isSmall = this.smallBalls.contains(this.caughtBall);

                this.claw.setTexture(isSmall ? 'claw_active_small' : 'claw_active');
                isSmall ? this.claw.body.setCircle(55, 15, 420) : this.claw.body.setCircle(60, 25, 420);
                this.caughtBall.setDepth(isSmall ? 2 : 1);
            }
            else {
                this.claw.body.setCircle(55, 15, 420);
                this.claw.setTexture('claw_disabled'); 
            } 

            this.clawState = 'lifting';
        }
    }

    // Состояние подъёма клешни
    if (this.clawState === 'lifting') {
        this.claw.y -= 2;

        this.claw.body.checkCollision.down = false;
        this.leverImage.src = 'assets/lever_up.png';
        this.leverImage.style.transform = 'translateY(0px)';

        if (this.caughtBall && this.isDrop && this.claw.y <= this.dropHeight) {
            const ball = this.caughtBall;

            ball.body.enable = true;
            ball.setTexture(this.originalTextureBall);

            ball.body.setAllowGravity(true);
            if (this.smallBalls.contains(ball)) ball.setBounce(0.3);
            ball.setDrag(30);
            ball.setVelocity(Phaser.Math.Between(-40, 40), 150);

            this.claw.body.setCircle(60, 25, 420);
            this.claw.setTexture('claw_default');
            this.dropAnimationUntil = this.time.now + 180;

            this.caughtBall = null;
            this.isDrop = false;
            this.dropHeight = null;
        }

        if (this.dropAnimationUntil > 0 && this.time.now >= this.dropAnimationUntil) {
            this.claw.body.setCircle(55, 15, 420);
            this.claw.setTexture('claw_disabled');
            this.dropAnimationUntil = 0;
        }

        if (this.claw.y <= 75) {
            this.claw.y = 75;
            this.clawState = 'returning';
        }
    }

    // Возвращение клешни в начальное состояние
    if (this.clawState === 'returning') {
        if (this.score === 0) {
            const btn = document.getElementById('grab-btn');
            btn.innerText = "Начать игру";
            btn.classList.add('disabled');         
            btn.classList.remove('start');
            
            this.showOverModal = true;
        }

        this.clawState = 'default';
        this.claw.body.setCircle(60, 25, 420);
        this.claw.setTexture('claw_default');
        this.claw.body.checkCollision.down = true;


        if (this.caughtBall != null) {
            openModal(this.victoryModal, this);

            this.caughtBall.destroy();
            this.caughtBall = null;
            this.clawContact = false;
            this.clawCandidate = null;

            /* spawnBall(this, this.balls); */
        }
        else {
            openModal(this.defeatModal, this);
        }
                

        const btn = document.getElementById('grab-btn');
        btn.innerText = "Начать игру";
        btn.classList.remove('active');
        btn.classList.remove('start');
        this.isStartGame = false;
    }


    if (this.caughtBall) caughtBallPosition(this);
}

// Перемещение шара вместе с клешнёй
function caughtBallPosition(scene) {
    if (!scene.caughtBall) return;

    const ball = scene.caughtBall;

    const targetX = scene.claw.x + scene.caughtOffsetX;
    const targetY = scene.claw.y + scene.caughtOffsetY;

    ball.x = Phaser.Math.Linear(ball.x, targetX, 0.18);
    ball.y = Phaser.Math.Linear(ball.y, targetY, 0.18);
}

// Запуск захвата клешни
function startDescending(scene) {
    if (scene.score <= 0) {
        openModal(scene.overModal, scene);
        return;
    }
    
    document.getElementById('grab-btn').classList.add('active');

    scene.score = spendAttempt();
    document.getElementById('score').textContent = `0${scene.score}/03`;

    scene.leverImage.src = 'assets/lever_down.png';
    scene.leverImage.style.transform = 'translateY(90px)';

    scene.clawState = 'descending';
}