class SpaceRunnerGame {
  constructor() {
    // Настройки текстур
    this.TEXTURES = {
      background: "./img/bg.jpg",
      ship: "./img/starship.png",
      asteroid: "./img/meteor.png",
      engine: "./img/engine.png",
      triangle: "./img/triangle.png",
      rectangle: "./img/rectangle.png",
      diamond: "./img/diamond.png",
      ring: "./img/ring.png",
    };

    // Игровые переменные
    this.score = 0;
    this.isRunning = false;
    this.gameOver = false;
    this.currentPhase = 0; // 0 - астероиды, 1 - фигуры, 2 - туннели
    this.phaseTimer = 0;
    this.stats = this.loadStats();
    this.gameStats = {
      runtime: 0,
      missionID: Math.floor(Math.random() * 9999),
      shapesCollected: { diamond: 0, triangle: 0, rectangle: 0 },
      tunnelsPassed: { blue: 0, green: 0, red: 0 },
      meteorsAvoided: 0,
      diagnosis: "All systems normal",
      startTime: null,
    };
    // Three.js объекты
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ship = null;

    // Массивы игровых объектов
    this.asteroids = [];
    this.shapes = [];
    this.tunnels = [];
    this.stars = [];
    this.particles = [];

    // Управление
    this.keys = {};
    this.targetX = 0;
    this.moveSpeed = 0.15;
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    this.init();
  }

  init() {
    this.setupThreeJS();
    this.setupLighting();
    this.createStarfield();
    this.createShip();
    this.setupControls();
    this.hideLoading();

    // Показать мобильные контролы если нужно
    if (this.isMobile) {
      document.getElementById("mobileControls").classList.add("active");
    }

    this.animate();
  }

  setupThreeJS() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000011, 10, 50);

    // Устанавливаем фоновое изображение
    const loader = new THREE.TextureLoader();
    loader.load(this.TEXTURES.background, (texture) => {
      this.scene.background = texture;
    });

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 0, -5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011);
    document.getElementById("gameCanvas").appendChild(this.renderer.domElement);

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    this.scene.add(directionalLight);
  }

  createStarfield() {
    const textureLoader = new THREE.TextureLoader();
    const starGeometry = new THREE.SphereGeometry(0.02, 6, 6);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < 500; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 30,
        -Math.random() * 200
      );
      this.stars.push(star);
      this.scene.add(star);
    }
  }

  createShip() {
    const textureLoader = new THREE.TextureLoader();
    const shipTexture = textureLoader.load(this.TEXTURES.ship);

    const shipGeometry = new THREE.PlaneGeometry(12, 7); // <-- добавлено
    const shipMaterial = new THREE.MeshBasicMaterial({
      map: shipTexture,
      transparent: true,
    });

    this.ship = new THREE.Mesh(shipGeometry, shipMaterial); // <-- исправлено
    this.ship.position.set(0, 0.2, 0);
    this.scene.add(this.ship);
  }

  setupControls() {
    // Клавиатура
    document.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Мобильные контролы
    if (this.isMobile) {
      const leftBtn = document.getElementById("leftBtn");
      const rightBtn = document.getElementById("rightBtn");

      leftBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.keys["arrowleft"] = true;
      });

      leftBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.keys["arrowleft"] = false;
      });

      rightBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.keys["arrowright"] = true;
      });

      rightBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.keys["arrowright"] = false;
      });
    }
  }

  startGame() {
    // Скрыть меню
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("gameHUD").style.display = "block";
    // Сброс статистики
    this.gameStats = {
      runtime: 0,
      missionID: Math.floor(Math.random() * 9999),
      shapesCollected: { diamond: 0, triangle: 0, rectangle: 0 },
      tunnelsPassed: { blue: 0, green: 0, red: 0 },
      meteorsAvoided: 0,
      diagnosis: "All systems normal",
      startTime: Date.now(),
    };
    // Сброс игровых переменных
    this.score = 0;
    this.isRunning = true;
    this.gameOver = false;
    this.currentPhase = 0;
    this.phaseTimer = 0;
    this.targetX = 0;
    this.ship.position.x = 0;

    // Очистка объектов
    this.clearGameObjects();

    // Запуск спавна объектов
    this.startSpawning();
  }

  clearGameObjects() {
    // Удаление астероидов
    this.asteroids.forEach((ast) => this.scene.remove(ast));
    this.asteroids = [];

    // Удаление фигур
    this.shapes.forEach((shape) => this.scene.remove(shape));
    this.shapes = [];

    // Удаление туннелей
    this.tunnels.forEach((tunnel) => this.scene.remove(tunnel));
    this.tunnels = [];
  }

  startSpawning() {
    // Спавн астероидов
    this.asteroidInterval = setInterval(() => {
      if (this.isRunning && this.currentPhase === 0) {
        this.spawnAsteroids();
      }
    }, 2000);

    // Спавн фигур
    this.shapeInterval = setInterval(() => {
      if (this.isRunning && this.currentPhase === 1) {
        this.spawnShapes();
      }
    }, 1000);
  }

  spawnAsteroids() {
    // Размер гарантированного прохода
    const passageWidth = 4.5;
    const passageHeight = 4.5;
    
    // Случайная позиция прохода
    const passageX = (Math.random() - 0.5) * 6; // от -3 до 3
    const passageY = (Math.random() - 0.5) * 2; // от -1 до 1
    
    // Количество астероидов вокруг прохода
    const asteroidCount = 9 + Math.floor(Math.random() * 4);
    
    // Базовая глубина для всей группы
    const baseZ = -30 - Math.random() * 10;
    
    for (let i = 0; i < asteroidCount; i++) {
        let x, y;
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            // Генерируем случайную позицию
            x = (Math.random() - 0.5) * 12;
            y = (Math.random() - 0.5) * 6;
            
            // Проверяем, что астероид не в зоне прохода
            const inPassageX = Math.abs(x - passageX) < passageWidth / 2;
            const inPassageY = Math.abs(y - passageY) < passageHeight / 2;
            
            if (!(inPassageX && inPassageY)) {
                validPosition = true;
            }
            
            attempts++;
        }
        
        if (validPosition) {
            // Небольшой разброс по глубине для естественности
            const z = baseZ + (Math.random() - 0.5) * 3;
            this.spawnSingleAsteroid(x, y, z);
        }
    }
    
    // Опционально: добавляем визуальную подсказку о проходе (частицы по краям)
    this.createPassageHint(passageX, passageY, baseZ);
}

// Создание визуальной подсказки прохода (опционально)
createPassageHint(x, y, z) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5
    });
    
    // Частицы по углам прохода
    const corners = [
        // { x: x - 1.75, y: y - 1.5 },
        // { x: x + 1.75, y: y - 1.5 },
        // { x: x - 1.75, y: y + 1.5 },
        // { x: x + 1.75, y: y + 1.5 }
    ];
    
    corners.forEach(corner => {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(corner.x, corner.y, z);
        
        // Добавляем необходимые свойства velocity
        particle.userData.velocity = new THREE.Vector3(0, 0, 0.4); // Движение только вперед
        particle.userData.life = 100;
        particle.userData.isHint = true;
        
        this.scene.add(particle);
        this.particles.push(particle);
    });
}

  // Вспомогательная функция
  spawnSingleAsteroid(x, y, z) {
    const loader = new THREE.TextureLoader();
    const asteroidTexture = loader.load(this.TEXTURES.asteroid); // путь к текстуре из настроек

    const geometry = new THREE.PlaneGeometry(2, 2); // размер изображения
    const material = new THREE.MeshBasicMaterial({
      map: asteroidTexture,
      transparent: true, // если PNG с альфа-каналом
      alphaTest: 0.5, // чтобы не было чёрного фона
      side: THREE.DoubleSide, // видно с обеих сторон
    });

    const asteroid = new THREE.Mesh(geometry, material);
    asteroid.position.set(x, y, z);
    asteroid.userData.velocity = {
      x: (Math.random() - 0.5) * 0.05, // Хаотичное движение по X
      y: (Math.random() - 0.5) * 0.05, // Хаотичное движение по Y
      z: 0.4,
    };
    // чтобы изображение всегда смотрело на камеру
    asteroid.lookAt(this.camera.position);

    this.scene.add(asteroid);
    this.asteroids.push(asteroid);
  }

  spawnShapes() {
    const types = ["triangle", "rectangle", "diamond"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Создаем группу для 3D рамки
    const shapeGroup = new THREE.Group();
    const size = 3;
    const thickness = 0.3;
    const loader = new THREE.TextureLoader();
    
    // Загружаем текстуру для типа фигуры
    const textureMap = {
        triangle: this.TEXTURES.triangle,
        rectangle: this.TEXTURES.rectangle,
        diamond: this.TEXTURES.diamond
    };
    
    const colors = {
        triangle: 0x00ff00,
        rectangle: 0x0088ff,
        diamond: 0xff00ff,
    };
    
    // Создаем материал с текстурой или цветом
    const createMaterial = (color) => {
        const mat = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3
        });
        
        // Пытаемся загрузить текстуру
        loader.load(textureMap[type], (texture) => {
            mat.map = texture;
            mat.needsUpdate = true;
        });
        
        return mat;
    };
    
    const material = createMaterial(colors[type]);
    
    if (type === "triangle") {
        // Треугольная рамка из 3 боксов
        const edgeLength = size * 1.2;
        const edgeGeometry = new THREE.BoxGeometry(edgeLength, thickness, thickness);
        
        // Нижняя грань
        const bottom = new THREE.Mesh(edgeGeometry, material);
        bottom.position.y = -size/2;
        shapeGroup.add(bottom);
        
        // Левая грань
        const left = new THREE.Mesh(edgeGeometry, material);
        left.rotation.z = Math.PI / 3;
        left.position.set(-size/2, 0, 0);
        shapeGroup.add(left);
        
        // Правая грань
        const right = new THREE.Mesh(edgeGeometry, material);
        right.rotation.z = -Math.PI / 3;
        right.position.set(size/2, 0, 0);
        shapeGroup.add(right);
        
    } else if (type === "rectangle") {
        // Прямоугольная рамка
        const horizGeometry = new THREE.BoxGeometry(size * 1.5, thickness, thickness);
        const vertGeometry = new THREE.BoxGeometry(thickness, size, thickness);
        
        // Верх и низ
        const top = new THREE.Mesh(horizGeometry, material);
        top.position.y = size/2;
        shapeGroup.add(top);
        
        const bottom = new THREE.Mesh(horizGeometry, material);
        bottom.position.y = -size/2;
        shapeGroup.add(bottom);
        
        // Левая и правая
        const left = new THREE.Mesh(vertGeometry, material);
        left.position.x = -size * 0.75;
        shapeGroup.add(left);
        
        const right = new THREE.Mesh(vertGeometry, material);
        right.position.x = size * 0.75;
        shapeGroup.add(right);
        
    } else if (type === "diamond") {
        // Ромбовидная рамка
        const edgeLength = size;
        const edgeGeometry = new THREE.BoxGeometry(edgeLength, thickness, thickness);
        
        // 4 грани ромба
        const top = new THREE.Mesh(edgeGeometry, material);
        top.rotation.z = Math.PI/4;
        top.position.set(-size/2, size/2, 0);
        shapeGroup.add(top);
        
        const right = new THREE.Mesh(edgeGeometry, material);
        right.rotation.z = -Math.PI/4;
        right.position.set(size/2, size/2, 0);
        shapeGroup.add(right);
        
        const bottom = new THREE.Mesh(edgeGeometry, material);
        bottom.rotation.z = Math.PI/4;
        bottom.position.set(size/2, -size/2, 0);
        shapeGroup.add(bottom);
        
        const left = new THREE.Mesh(edgeGeometry, material);
        left.rotation.z = -Math.PI/4;
        left.position.set(-size/2, -size/2, 0);
        shapeGroup.add(left);
    }
    
    // Добавляем свечение
    const light = new THREE.PointLight(colors[type], 1, 10);
    shapeGroup.add(light);
    
    // Находим последнюю фигуру для определения позиции
    let lastShapeZ = -40;
    if (this.shapes.length > 0) {
        const lastShape = this.shapes[this.shapes.length - 1];
        lastShapeZ = lastShape.position.z - 5; // Расстояние 5 единиц
    }
    
    // Кривая траектория (синусоида)
    const curveOffset = Math.sin(lastShapeZ * 0.1) * 3;
    
    shapeGroup.userData.type = type;
    shapeGroup.userData.collected = false;
    shapeGroup.position.set(curveOffset, 0, lastShapeZ);
    
    // Вращение для динамики
    shapeGroup.userData.rotationSpeed = 0.02;
    
    this.scene.add(shapeGroup);
    this.shapes.push(shapeGroup);
}

  spawnTunnels() {
    document.getElementById("tunnelWarning").style.display = "block";

    const colors = [0xff0000, 0x00ff00, 0x0000ff];
    const colorNames = ['red', 'green', 'blue'];
    const positions = [-4, 0, 4];
    const correctIndex = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
        const tunnel = new THREE.Group();
        tunnel.userData.isCorrect = i === correctIndex;
        tunnel.userData.color = colorNames[i]; // Сохраняем название цвета
        tunnel.userData.passed = false;

        // Создание спиральных колец
        for (let j = 0; j < 20; j++) {
            const ringGeometry = new THREE.TorusGeometry(2.5, 0.15, 8, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: colors[i],
                transparent: true,
                opacity: 0.8 - j * 0.03,
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.z = -j * 2;
            ring.rotation.z = j * 0.2;
            tunnel.add(ring);
        }

        tunnel.position.set(positions[i], 0, -40);
        this.scene.add(tunnel);
        this.tunnels.push(tunnel);
    }
}

  updateMovement() {
    if (!this.isRunning || this.gameOver) return;

    let moveDirection = 0;
    if (this.keys["arrowleft"] || this.keys["a"]) moveDirection -= 1;
    if (this.keys["arrowright"] || this.keys["d"]) moveDirection += 1;

    this.targetX += moveDirection * 0.3;
    this.targetX = Math.max(-5, Math.min(5, this.targetX));

    const dx = this.targetX - this.ship.position.x;
    this.ship.position.x += dx * this.moveSpeed;

    // Наклон корабля
    this.ship.rotation.z = -dx * 0.3;
  }

  updateGame() {
    if (!this.isRunning || this.gameOver) return;

    this.updateMovement();
    this.updatePhase();
    this.updateStars();
    this.updateAsteroids();
    this.updateShapes();
    this.updateTunnels();
    this.updateHUD();
  }

  updatePhase() {
    this.phaseTimer++;

    // Смена фаз каждые 10 секунд (600 кадров при 60 FPS)
    if (this.phaseTimer > 900) {
      this.phaseTimer = 0;
      this.currentPhase = (this.currentPhase + 1) % 3;

      // Обновление текста фазы
      const phaseNames = ["Asteroids", "Choose shape", "Choose tunnel"];
      document.getElementById("phase").textContent = `Phase: ${
        phaseNames[this.currentPhase]
      }`;

      // Спавн туннелей при переходе к фазе 2
      if (this.currentPhase === 2) {
        this.spawnTunnels();
      }
    }
  }

  updateStars() {
    this.stars.forEach((star) => {
      star.position.z += 0.5;
      if (star.position.z > 10) {
        star.position.z = -200;
        star.position.x = (Math.random() - 0.5) * 40;
        star.position.y = (Math.random() - 0.5) * 30;
      }
    });
  }

  updateAsteroids() {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.position.z += 0.4;
      if (asteroid.rotation) {
        if (asteroid.rotation.x !== undefined)
          asteroid.rotation.x += asteroid.userData.rotationSpeed?.x || 0;
        if (asteroid.rotation.y !== undefined)
          asteroid.rotation.y += asteroid.userData.rotationSpeed?.y || 0;
        asteroid.rotation.z += asteroid.userData.rotationSpeed?.z || 0;
      }

      // Проверка столкновения
      const distance = this.ship.position.distanceTo(asteroid.position);
      if (distance < 1.5) {
        this.endGame();
        return;
      }

      // Удаление за экраном
      if (asteroid.position.z > 10) {
        this.scene.remove(asteroid);
        this.asteroids.splice(i, 1);
        this.score += 10;
        this.gameStats.meteorsAvoided++;
      }
    }
  }

  updateShapes() {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      shape.position.z += 0.4;
      shape.rotation.y += 0.02;
      shape.rotation.x += 0.01;

      const distance = Math.abs(this.ship.position.x - shape.position.x);
      const zDistance = Math.abs(this.ship.position.z - shape.position.z);

      if (distance < 1.5 && zDistance < 1.5) {
        this.score += 100;
        this.gameStats.shapesCollected[shape.userData.type]++;
        this.scene.remove(shape);
        this.shapes.splice(i, 1);
        this.createParticles(shape.position);
      }

      if (shape.position.z > 10) {
        this.scene.remove(shape);
        this.shapes.splice(i, 1);
      }
    }
  }

  updateTunnels() {
    for (let i = this.tunnels.length - 1; i >= 0; i--) {
        const tunnel = this.tunnels[i];
        tunnel.position.z += 0.4;

        // Вращение колец
        tunnel.children.forEach((ring) => {
            ring.rotation.z += 0.05;
        });

        const distance = Math.abs(this.ship.position.x - tunnel.position.x);
        const zDistance = Math.abs(this.ship.position.z - tunnel.position.z);

        // Если игрок вошёл в туннель
        if (!tunnel.userData.passed && zDistance < 2 && distance < 2) {
            tunnel.userData.passed = true;

            // Добавляем очки за пролет через туннель
            this.score += 500;
            
            // Увеличиваем счетчик для соответствующего цвета туннеля
            const tunnelColor = tunnel.userData.color || 'blue';
            this.gameStats.tunnelsPassed[tunnelColor]++;
            this.gameStats.diagnosis = "Tunnel passed! Mission complete";
            
            // Завершаем игру после пролета через любой туннель
            this.endGame();
            return;
        }

        // Удаляем туннель, если он улетел далеко
        if (tunnel.position.z > 60) {
            this.scene.remove(tunnel);
            this.tunnels.splice(i, 1);
        }
    }

    // Если все туннели прошли мимо
    if (this.tunnels.length === 0) {
        document.getElementById("tunnelWarning").style.display = "none";
        // Продолжаем игру, если игрок не выбрал ни один туннель
        if (this.currentPhase === 2) {
            this.gameStats.diagnosis = "Tunnel phase missed";
        }
    }
}

  createParticles(position) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 10; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      particle.userData.life = 30;
      this.particles.push(particle);
      this.scene.add(particle);
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.position.add(particle.userData.velocity);
      particle.userData.life--;
      particle.material.opacity = particle.userData.life / 30;

      if (particle.userData.life <= 0) {
        this.scene.remove(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    document.getElementById("score").textContent = `Score: ${this.score}`;
    // Обновление runtime в статистике если она открыта
    if (document.getElementById("statsScreen").classList.contains("active")) {
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `[${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}]`;
      };
      document.getElementById("statRuntime").textContent = formatTime(
        this.gameStats.runtime
      );
    }
  }

  endGame() {
    this.isRunning = false;
    this.gameOver = true;

    // Остановка интервалов
    clearInterval(this.asteroidInterval);
    clearInterval(this.shapeInterval);

    // Финальное обновление runtime
    if (this.gameStats.startTime) {
      this.gameStats.runtime = Math.floor(
        (Date.now() - this.gameStats.startTime) / 1000
      );
    }

    // Сохранение результата
    this.saveScore();

    // Показ экрана конца игры с задержкой
    setTimeout(() => {
      document.getElementById(
        "finalScore"
      ).textContent = `Score: ${this.score}`;
      document.getElementById("finalDiagnosis").textContent =
        this.gameStats.diagnosis;
      document.getElementById("gameOverScreen").style.display = "block";
      document.getElementById("gameHUD").style.display = "none";
      document.getElementById("tunnelWarning").style.display = "none";

      // Автоматический показ статистики через 2 секунды
      setTimeout(() => {
        document.getElementById("gameOverScreen").style.display = "none";
        this.showStats();
      }, 2000);
    }, 500);
  }

  saveScore() {
    const date = new Date();
    const scoreEntry = {
      score: this.score,
      date:
        date.toLocaleDateString("en-EN") +
        " " +
        date.toLocaleTimeString("en-EN"),
    };

    this.stats.push(scoreEntry);
    this.stats.sort((a, b) => b.score - a.score);
    this.stats = this.stats.slice(0, 10);

    // Сохранение в памяти (в реальном проекте используйте localStorage)
    this.saveStats();
  }

  saveStats() {
    // В среде Claude.ai localStorage не работает
    // В реальном проекте раскомментируйте:
    localStorage.setItem("spaceRunnerStats", JSON.stringify(this.stats));
  }

  loadStats() {
    // В среде Claude.ai localStorage не работает
    // В реальном проекте раскомментируйте:
    const saved = localStorage.getItem("spaceRunnerStats");
    return saved ? JSON.parse(saved) : [];
    // return [];
  }

  showStats() {
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("statsScreen").classList.add("active");

    // Обновление текущей статистики игры
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `[${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}]`;
    };

    document.getElementById("statRuntime").textContent = formatTime(
      this.gameStats.runtime
    );
    document.getElementById(
      "statMissionID"
    ).textContent = `[#${this.gameStats.missionID
      .toString()
      .padStart(4, "0")}]`;

    // Обновление счетчиков фигур
    const shapeCounters = document.querySelectorAll(".shapeCount");
    shapeCounters[0].innerHTML = `[${this.gameStats.shapesCollected.diamond}] <img src="img/litle-diamond.png" alt="">`;
    shapeCounters[1].innerHTML = `[${this.gameStats.shapesCollected.triangle}] <img src="img/litle-triangle.png" alt="">`;
    shapeCounters[2].innerHTML = `[${this.gameStats.shapesCollected.rectangle}] <img src="img/litle-rectangle.png" alt="">`;

    // Обновление счетчиков туннелей
    const tunnelCounters = document.querySelectorAll(".tunnelCount");
    tunnelCounters[0].innerHTML = `[${this.gameStats.tunnelsPassed.blue}] <img src="img/little-cirle-blue.png" alt="">`;
    tunnelCounters[1].innerHTML = `[${this.gameStats.tunnelsPassed.green}] <img src="img/little-cirle-green.png" alt="">`;
    tunnelCounters[2].innerHTML = `[${this.gameStats.tunnelsPassed.red}] <img src="img/little-cirle-red.png" alt="">`;

    document.getElementById(
      "statMeteors"
    ).textContent = `[${this.gameStats.meteorsAvoided}]`;
    document.getElementById(
      "statDiagnosis"
    ).textContent = `[${this.gameStats.diagnosis}]`;
  }

  hideStats() {
    document.getElementById("statsScreen").classList.remove("active");
    document.getElementById("mainMenu").style.display = "block";
  }

  backToMenu() {
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
    this.clearGameObjects();
  }

  hideLoading() {
    setTimeout(() => {
      document.getElementById("loadingScreen").style.display = "none";
    }, 1000);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isRunning) {
      this.updateGame();
      this.updateParticles();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Создание игры после загрузки страницы
let game;
window.addEventListener("load", () => {
  game = new SpaceRunnerGame();
});
