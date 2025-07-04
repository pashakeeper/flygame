class SpaceRunnerGame {
  constructor() {
    // Настройки текстур
    this.TEXTURES = {
      background: "./img/bg.jpg",
      ship: "./img/starship.png",
      asteroid: "./img/meteors.png",
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
      document.getElementById("mobileControls").style.display = "block";
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
    transparent: true 
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
    }, 3000);
  }

  spawnAsteroids() {
  const gapSize = 4; // ширина пролета
  const totalWidth = 10; // общая ширина экрана (по X)
  const sideWidth = (totalWidth - gapSize) / 2;

  const yRange = 4;
  const depth = -30 - Math.random() * 10;

  // Левая часть
  for (let i = 0; i < 5; i++) {
    const x = (Math.random() * sideWidth) - totalWidth / 2;
    this.spawnSingleAsteroid(x, (Math.random() - 0.5) * yRange, depth);
  }

  // Правая часть
  for (let i = 0; i < 5; i++) {
    const x = (Math.random() * sideWidth) + gapSize / 2;
    this.spawnSingleAsteroid(x, (Math.random() - 0.5) * yRange, depth);
  }
}

// Вспомогательная функция
spawnSingleAsteroid(x, y, z) {
  const geometry = new THREE.DodecahedronGeometry(
    0.3 + Math.random() * 0.5,
    0
  );
  const material = new THREE.MeshPhongMaterial({
    color: 0x666666,
    emissive: 0x111111,
  });
  const asteroid = new THREE.Mesh(geometry, material);

  asteroid.position.set(x, y, z);

  asteroid.userData.rotationSpeed = {
    x: (Math.random() - 0.5) * 0.05,
    y: (Math.random() - 0.5) * 0.05,
    z: (Math.random() - 0.5) * 0.05,
  };

  this.scene.add(asteroid);
  this.asteroids.push(asteroid);
}


  spawnShapes() {
    const types = ["triangle", "rectangle", "diamond"];
    const positions = [-3, 0, 3];
    positions.sort(() => Math.random() - 0.5);

    types.forEach((type, index) => {
      let geometry;
      const size = 2;

      if (type === "triangle") {
        geometry = new THREE.ConeGeometry(size, size, 3);
      } else if (type === "rectangle") {
        geometry = new THREE.BoxGeometry(size * 1.5, size, 0.1);
      } else if (type === "diamond") {
        geometry = new THREE.OctahedronGeometry(size);
      }

      const colors = {
        triangle: 0x00ff00,
        rectangle: 0x0088ff,
        diamond: 0xff00ff,
      };

      const material = new THREE.MeshBasicMaterial({
        color: colors[type],
        wireframe: true,
      });

      const shape = new THREE.Mesh(geometry, material);
      shape.userData.type = type;
      shape.position.set(positions[index], 0, -40);

      this.scene.add(shape);
      this.shapes.push(shape);
    });
  }

  spawnTunnels() {
    document.getElementById("tunnelWarning").style.display = "block";

    const colors = [0xff0000, 0x00ff00, 0x0000ff];
    const positions = [-4, 0, 4];
    const correctIndex = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
      const tunnel = new THREE.Group();
      tunnel.userData.isCorrect = i === correctIndex;

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

    // Смена фаз каждые 20 секунд
    if (this.phaseTimer > 1200) {
      this.phaseTimer = 0;
      this.currentPhase = (this.currentPhase + 1) % 3;

      // Обновление текста фазы
      const phaseNames = ["Астероиды", "Сбор фигур", "Выбор туннеля"];
      document.getElementById("phase").textContent = `Фаза: ${
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
      asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
      asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
      asteroid.rotation.z += asteroid.userData.rotationSpeed.z;

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

      if (distance < 2 && zDistance < 2) {
        this.score += 100;
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
    let tunnelPassed = false;

    for (let i = this.tunnels.length - 1; i >= 0; i--) {
      const tunnel = this.tunnels[i];
      tunnel.position.z += 0.4;

      // Вращение колец
      tunnel.children.forEach((ring) => {
        ring.rotation.z += 0.05;
      });

      const distance = Math.abs(this.ship.position.x - tunnel.position.x);
      const zDistance = Math.abs(this.ship.position.z - tunnel.position.z);

      if (zDistance < 5 && zDistance > -10) {
        if (distance < 1.5) {
          if (tunnel.userData.isCorrect) {
            this.score += 500;
            tunnelPassed = true;
          } else {
            this.endGame();
            return;
          }

          // Удаление всех туннелей
          this.tunnels.forEach((t) => this.scene.remove(t));
          this.tunnels = [];
          document.getElementById("tunnelWarning").style.display = "none";
          break;
        }
      }

      if (tunnel.position.z > 20) {
        this.scene.remove(tunnel);
        this.tunnels.splice(i, 1);
        if (this.tunnels.length === 0) {
          document.getElementById("tunnelWarning").style.display = "none";
        }
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
    document.getElementById("score").textContent = `Счёт: ${this.score}`;
  }

  endGame() {
    this.isRunning = false;
    this.gameOver = true;

    // Остановка интервалов
    clearInterval(this.asteroidInterval);
    clearInterval(this.shapeInterval);

    // Сохранение результата
    this.saveScore();

    // Показ экрана конца игры
    document.getElementById("finalScore").textContent = `Счёт: ${this.score}`;
    document.getElementById("gameOverScreen").style.display = "block";
    document.getElementById("gameHUD").style.display = "none";
    document.getElementById("tunnelWarning").style.display = "none";
  }

  saveScore() {
    const date = new Date();
    const scoreEntry = {
      score: this.score,
      date:
        date.toLocaleDateString("ru-RU") +
        " " +
        date.toLocaleTimeString("ru-RU"),
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
    // localStorage.setItem('spaceRunnerStats', JSON.stringify(this.stats));
  }

  loadStats() {
    // В среде Claude.ai localStorage не работает
    // В реальном проекте раскомментируйте:
    // const saved = localStorage.getItem('spaceRunnerStats');
    // return saved ? JSON.parse(saved) : [];
    return [];
  }

  showStats() {
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("statsScreen").style.display = "block";

    const tbody = document.getElementById("statsBody");
    tbody.innerHTML = "";

    if (this.stats.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align: center; color: #888;">Нет результатов</td></tr>';
    } else {
      this.stats.forEach((stat, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
                            <td class="rank">#${index + 1}</td>
                            <td class="score">${stat.score}</td>
                            <td class="date">${stat.date}</td>
                        `;
      });
    }
  }

  hideStats() {
    document.getElementById("statsScreen").style.display = "none";
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
