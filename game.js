// Настройка Phaser
var config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1170,
    height: 770,
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
            debug: true
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
    this.load.image('claw_default', 'assets/claw_default.png');
    this.load.image('claw_active', 'assets/claw_active.png');
    this.load.image('claw_disabled', 'assets/claw_disabled.png');
    this.load.image('case', 'assets/case.png');
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

/**
 * @this {Phaser.Scene}
 */
// Инициализация параметров и создание игровых объектов
function create() {
    this.isStartGame = false;
    this.isPointerInZone = false;
    this.isInputEnabled = false;

    this.score = loadAttempts();
    this.lastPointerX = 0;
    this.clawState = 'default';
    this.caughtBall = null;

    createBackground(this);
    createInterface(this);
    createModals(this);

    const walls = createWalls(this);
    this.balls = createBalls(this, walls);
    this.claw = createClaw(this);

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
    scene.add.image(585, 300, 'bg').setDisplaySize(1075, 505).setDepth(0);
    scene.add.image(0, 0, 'case').setOrigin(0, 0).setDisplaySize(1170, 740).setDepth(3);
    scene.add.image(585, 420, 'bg_balloons').setDepth(1);

    scene.interactiveZone = scene.add.zone(585, 300, 1097, 510).setInteractive().setDepth(3);

    scene.add.dom(850, 510).createFromHTML(`<img src="assets/lever_up.png" id="lever">`).setDepth(3);
    scene.leverImage = document.getElementById('lever');
}

// Создание элементов интерфейса
function createInterface(scene) {
    scene.scoreText = scene.add.dom(750, 640).createFromHTML(`<div><span id="score">0${scene.score}/03</span></div>`).setDepth(4);
    scene.btn = scene.add.dom(350, 640).createFromHTML(`<button id="grab-btn" class="grab-btn">Начать игру</button>`).setDepth(4);

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
    document.getElementById('window-victory').addEventListener('click', (e) => { e.stopPropagation(); });
    document.getElementById('window-defeat').addEventListener('click', (e) => { e.stopPropagation(); });
    document.getElementById('window-over').addEventListener('click', (e) => { e.stopPropagation(); });
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
    const floor = scene.add.rectangle(585, 620, 1060, 200, 0x000000, 0);
    const right = scene.add.rectangle(1130, 300, 20, 500, 0x000000, 0);
    const left = scene.add.rectangle(30, 300, 20, 500, 0x000000, 0);
    walls.add(floor).add(right).add(left);

    return walls;
}

// Создание группы осязаемых шаров и настройка столкновений
function createBalls(scene, walls) {
    const balls = scene.physics.add.group();

    for (let i = 0; i < 7; i++) {
        spawnBall(scene, balls);
    }

    scene.physics.add.collider(balls, walls);
    scene.physics.add.collider(balls, balls);

    return balls;
}

// Создание отдельного случайного шара
function spawnBall(scene, ballsGroup) {
    const ballsList = ['ball1', 'ball2', 'ball3', 'ball4', 'ball5'];

    const x = Phaser.Math.Between(200, 950);
    const y = Phaser.Math.Between(100, 150);
    const rndBall = Phaser.Utils.Array.GetRandom(ballsList);

    const ball = ballsGroup.create(x, y, rndBall);
    
    ball.originalTexture = rndBall;
    ball.setCollideWorldBounds(true);
    ball.setDepth(2);
    ball.setBounce(1);
    ball.setDrag(70);
    ball.body.setCircle(70, 20, 20);

    return ball
}

// Создание клешни и настройка её тела
function createClaw(scene) {
    const claw = scene.add.sprite(585, 100, 'claw_default').setOrigin(0.5, 0.7).setDepth(2);
    scene.physics.add.existing(claw);
    claw.body.setAllowGravity(false);
    return claw;
}

// Настройка управления клавиатурой
function setupKeyboard(scene) {
    if (!scene.input.keyboard) return;
    
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.keys = scene.input.keyboard.addKeys('A,D,SPACE,ESC');

    scene.input.keyboard.on('keydown-ESC', () => {
        if (!scene.isInputEnabled) return;

        if (scene.victoryModal.visible) closeModal(scene.victoryModal, scene);
        else if (scene.defeatModal.visible) closeModal(scene.defeatModal, scene);
        else if (scene.overModal.visible) closeModal(scene.overModal, scene);
    });

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

    scene.input.on('gameover', () => {
        scene.isInputEnabled = true;
    });

    scene.input.on('gameout', () => {
        scene.isInputEnabled = false;
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

// Пересечение клешни с шарами и обработка захвата
function setupCollisions(scene) {
    scene.physics.add.overlap(scene.claw, scene.balls, (claw, ball) => {
        if (scene.caughtBall) return;
        if (scene.clawState !== 'descending') return;       

        const accuracy = Math.abs(claw.x - ball.x);
        if (accuracy > 10) {
            claw.setTexture('claw_disabled');
            return;
        }

        scene.isDrop = Math.random() < 0.55; 

        scene.originalTextureBall = ball.originalTexture;
        scene.caughtBall = ball;
        ball.body.setAllowGravity(false);
        ball.setVelocity(0, 0).setDepth(2);

        claw.setTexture('claw_active');
        const activeTexture = 'active_' + ball.originalTexture;
        ball.setTexture(activeTexture);
  
        scene.clawState = 'closing';
        scene.closingStart = scene.time.now;       
    }, null, scene);
}

/**
 * @this {Phaser.Scene}
 */
// Обновление состояний и обработка логики клешни
function update() {
    if (this.clawState === 'default')
    {
        if (this.isStartGame && this.isInputEnabled) {
            if (this.claw.x <= 140) this.claw.x = 140;
            if (this.claw.x >= 1030) this.claw.x = 1030;  

            if (this.cursors.left.isDown || this.keys.A.isDown) this.claw.x -= 5;       
            if (this.cursors.right.isDown || this.keys.D.isDown) this.claw.x += 5;
            if (this.input.activePointer.x !== this.lastPointerX &&  this.isPointerInZone) {
                this.claw.x = Phaser.Math.Clamp(this.input.activePointer.x, 140, 1030);
                this.lastPointerX = this.input.activePointer.x;
            }

            if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) startDescending(this);
            if (this.isPointerInZone && this.input.activePointer.leftButtonDown()) startDescending(this);
        }
    }

    if (this.clawState === 'descending') {
        this.claw.y += 3;

        if (this.claw.y >= 360) {
            this.claw.y = 360;
            this.clawState = 'closing';
            this.closingStart = this.time.now;
        }
    }

    if (this.clawState === 'closing') {
        if (this.time.now - this.closingStart >= 200) {
            this.clawState = 'lifting';
        }
    }

    if (this.clawState === 'lifting') {
        this.claw.y -= 3;

        this.leverImage.src = 'assets/lever_up.png';
        this.leverImage.style.transform = 'translateY(0px)';

        if (this.caughtBall && this.isDrop && this.claw.y <= 200) {
            this.caughtBall.setTexture(this.originalTextureBall);
            this.caughtBall.body.setAllowGravity(true);
            this.claw.setTexture('claw_disabled');
            this.caughtBall = null;
            this.isDrop = false;
        }

        if (this.claw.y <= 105) {
            this.claw.y = 105;
            this.clawState = 'returning';
        }
    }

    if (this.clawState === 'returning') {
        this.showOverModal = this.score === 0;

        this.clawState = 'default';
        this.claw.setTexture('claw_default');


        if (this.caughtBall != null) {
            openModal(this.victoryModal, this);

            this.caughtBall.destroy();
            this.caughtBall = null;
            spawnBall(this, this.balls);
        }
        else {
            openModal(this.defeatModal, this);
        }
                

        const btn = document.getElementById('grab-btn');
        btn.innerText = "Начать игру";
        btn.classList.remove('active');
        btn.classList.remove('start');
        this.isStartGame = false;

        if (this.score === 0) this.claw.setTexture('claw_disabled');
    }


    if (this.caughtBall) {
        this.caughtBall.x = this.claw.x;
        this.caughtBall.y = this.claw.y + 110;
    }
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

        if (scene.score === 0) {
            const btn = document.getElementById('grab-btn');
            btn.innerText = "Начать игру";
            btn.classList.add('disabled');         
            btn.classList.remove('start');
        }

        scene.leverImage.src = 'assets/lever_down.png';
        scene.leverImage.style.transform = 'translateY(90px)';

        scene.clawState = 'descending';
}