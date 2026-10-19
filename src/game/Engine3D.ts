import * as THREE from 'three';
import {
  buildMinecraftCharacter,
  buildGhostPoliceman,
  buildGhostDog,
  buildMineshaftArch,
  buildStalactite,
  buildOreBlock,
  buildSeaLanternBlock,
  buildMinecart,
  buildRockObstacle,
  buildGhostObstacle,
  buildAerialPhantom,
  buildDiamond,
  buildGoldNugget,
  buildGoldenApple,
  buildRedstoneCompass,
  buildPotionOfSwiftness,
  buildMagnet,
  buildPickaxe,
  buildVoxelCloud,
  createBlockMaterial,
  GhostDogLimbs,
} from './models.ts';
import {
  Lane,
  LANE_COORDS,
  ObstacleInstance,
  ItemInstance,
  PlayerState,
  RunnerSkin,
  GameTheme,
} from './types.ts';
import { GAME_THEMES } from './themes.ts';
import { sound } from '../sound/audio.ts';

// Deterministic PRNG for shared multiplayer tracks
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Engine3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private isDestroyed: boolean = false;

  // Track & Environment
  public currentTheme: GameTheme = 'day_walk';
  private trackGroup: THREE.Group;
  private trackTiles: THREE.Group[] = [];
  private readonly tileLength = 40;
  private readonly numTiles = 9;
  private ambientLight!: THREE.AmbientLight;
  private sunLight!: THREE.DirectionalLight;
  private skyLight!: THREE.HemisphereLight;
  private cloudsGroup!: THREE.Group;
  private sporeParticles?: THREE.Points;
  private lastStateUpdateTime = 0;

  // Player & Chasers
  public playerState: PlayerState;
  private playerGroup: THREE.Group;
  private playerLimbs: ReturnType<typeof buildMinecraftCharacter>;
  private chaserGroup: THREE.Group;
  private chaserParts: ReturnType<typeof buildGhostPoliceman>;
  private ghostDog: GhostDogLimbs;

  // Multiplayer Opponent Avatar
  private opponentGroup: THREE.Group;
  private opponentLimbs: ReturnType<typeof buildMinecraftCharacter>;
  public hasOpponent: boolean = false;
  public opponentTargetDistance: number = 0;
  public opponentTargetLane: number = 0;
  public opponentIsDead: boolean = false;

  // Obstacles & Items
  private obstacles: ObstacleInstance[] = [];
  private items: ItemInstance[] = [];
  private nextObstacleId = 1;
  private nextItemId = 1;
  private prng: () => number;
  private lastSpawnZ = -30;

  // Intro Minecraft Cave Mining Sequence
  public isPlayingGame: boolean = false;
  public isIntro: boolean = false;
  private introTimer = 0;
  private introPhase: 'mining' | 'diamond_popped' | 'ghost_appear' | 'done' = 'mining';
  private introOre: THREE.Group | null = null;
  private introDiamond: THREE.Group | null = null;
  private pickaxeMesh: THREE.Group | null = null;
  private lastMineStrike = 0;
  private onIntroStateCallback?: (phase: string, text: string) => void;

  // Item & Trolley spacing
  private lastGoldenAppleZ = -999;
  private lastTrolleySoundZ = 0;

  // Animation clocks
  private clock = new THREE.Clock();
  private runAnimTime = 0;
  private sessionRunTime = 0;
  private playedStartAudio = false;
  private chaserFlickerTimer = 0;
  private chaserWarningTimer = 0;
  private onGameOverCallback?: (state: PlayerState) => void;
  private onStateUpdateCallback?: (state: PlayerState) => void;
  private onNearMissCallback?: (streak: number) => void;

  // Mobile / Controls state
  private targetX = 0;
  private baseSpeed = 22; // m/s
  private speed = 22;
  private baseFov = 64;
  private baseCamZOffset = 6.8;
  private baseCamYOffset = 4.8;
  private baseLookAtY = 2.0;

  // Pre-allocated collision hitboxes to prevent GC thrashing and lag
  private playerBox = new THREE.Box3();
  private obsBox = new THREE.Box3();

  private resizeObserver: ResizeObserver | null = null;
  private lastWidth: number = 0;
  private lastHeight: number = 0;

  constructor(container: HTMLElement, seed: number = 1337) {
    this.container = container;
    this.prng = createPRNG(seed);

    // Initial state: chaser distance starts at 3.6m (right behind in full view like Subway Surfers!)
    this.playerState = {
      lane: 0,
      x: 0,
      y: 0,
      z: 0,
      isJumping: false,
      isSliding: false,
      isDiving: false,
      jumpVelocity: 0,
      distance: 0,
      score: 0,
      coins: 0,
      multiplier: 1,
      invincibleTimer: 0,
      magnetTimer: 0,
      isDead: false,
      causeOfDeath: '',
      chaserDistance: 3.6,
      nearMissCount: 0,
      comboStreak: 0,
      currentZone: 'Abandoned Mineshaft',
      skin: 'steve',
    };

    // 1. Three.js Scene & Theme Atmosphere
    const initialTheme = GAME_THEMES[this.currentTheme];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initialTheme.skyColor);
    this.scene.fog = new THREE.Fog(initialTheme.fogColor, initialTheme.fogNear, initialTheme.fogFar);

    // 2. Camera (Cinematic third-person chase camera with dynamic responsive aspect ratio)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(64, width / Math.max(1, height), 0.1, 280);
    this.camera.position.set(0, 4.8, 6.8);
    this.camera.lookAt(0, 1.8, -10);
    this.updateCameraProjection(width, height);

    // 3. Renderer with high performance and retina support
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Setup ResizeObserver for responsive screen changes
    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize();
      });
      this.resizeObserver.observe(this.container);
    } catch {
      // Fallback to window resize
    }

    // 4. Lighting based on Theme
    this.ambientLight = new THREE.AmbientLight(initialTheme.ambientColor, initialTheme.ambientIntensity);
    this.scene.add(this.ambientLight);

    // Primary Directional Light
    this.sunLight = new THREE.DirectionalLight(initialTheme.sunColor, initialTheme.sunIntensity);
    this.sunLight.position.set(25, 45, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 512;
    this.sunLight.shadow.mapSize.height = 512;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 25;
    this.sunLight.shadow.camera.bottom = -25;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Hemisphere sky bounce
    this.skyLight = new THREE.HemisphereLight(initialTheme.skyColor, 0x332211, 0.6);
    this.scene.add(this.skyLight);

    // 5. Floating Voxel Clouds
    this.cloudsGroup = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const cloud = buildVoxelCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 65,
        26 + (i % 3) * 3,
        -i * 35 - 10
      );
      this.cloudsGroup.add(cloud);
    }
    this.cloudsGroup.visible = initialTheme.hasClouds;
    this.scene.add(this.cloudsGroup);

    // 6. Build Track
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.initTrack();

    // 7. Floating Sunbeam Dust / Pollen
    this.createCaveParticles();

    // 7. Build Player Character (Steve)
    this.playerLimbs = buildMinecraftCharacter();
    this.playerGroup = this.playerLimbs.group;
    this.playerGroup.position.set(0, 0, 0);
    this.scene.add(this.playerGroup);

    // 8. Build Ghost Policeman (Subway Surfers Inspector)
    this.chaserParts = buildGhostPoliceman();
    this.chaserGroup = this.chaserParts.group;
    this.chaserGroup.position.set(0, 0.6, 3.6);
    this.scene.add(this.chaserGroup);

    // 9. Build Ghost Dog / Phantom Hound (Inspector's Dog)
    this.ghostDog = buildGhostDog();
    this.ghostDog.group.position.set(1.25, 0, 3.4);
    this.scene.add(this.ghostDog.group);

    // 10. Build Opponent (for Multiplayer)
    this.opponentLimbs = buildMinecraftCharacter();
    this.opponentGroup = this.opponentLimbs.group;
    this.opponentGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.transparent = true);
        } else {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.85;
        }
      }
    });
    this.opponentGroup.visible = false;
    this.scene.add(this.opponentGroup);

    // Handle Window Resize
    window.addEventListener('resize', this.onResize);

    // Pre-seed track with obstacles
    this.populateInitialObstacles();

    // Scene starts idle in menu
    this.isPlayingGame = false;
    this.isIntro = false;

    // Start loop
    this.animate();
  }

  public setOnGameOver(cb: (state: PlayerState) => void) {
    this.onGameOverCallback = cb;
  }

  public setOnStateUpdate(cb: (state: PlayerState) => void) {
    this.onStateUpdateCallback = cb;
  }

  public setOnIntroChange(cb: (phase: string, text: string) => void) {
    this.onIntroStateCallback = cb;
  }

  /**
   * Initializes the opening Minecraft scene: Steve mines a Diamond Ore in the cave,
   * discovers a sparkling Diamond, but the Ghost Policeman appears and Steve starts running!
   */
  public setupIntro() {
    this.isIntro = true;
    this.introTimer = 0;
    this.introPhase = 'mining';
    this.lastMineStrike = 0;

    // Clean up any existing intro meshes
    if (this.introOre) {
      this.scene.remove(this.introOre);
      this.introOre = null;
    }
    if (this.introDiamond) {
      this.scene.remove(this.introDiamond);
      this.introDiamond = null;
    }
    if (this.pickaxeMesh) {
      this.playerLimbs.rightArm.remove(this.pickaxeMesh);
      this.pickaxeMesh = null;
    }

    // 1. Spawn Diamond Ore Block directly in front of Steve
    this.introOre = buildOreBlock('diamond');
    this.introOre.position.set(0, 0.6, -1.8);
    this.scene.add(this.introOre);

    // 2. Attach Iron Pickaxe to Steve's right arm
    this.pickaxeMesh = buildPickaxe('iron');
    this.pickaxeMesh.position.set(0, -0.85, 0.2);
    this.pickaxeMesh.rotation.set(-Math.PI / 6, 0, -Math.PI / 4);
    this.playerLimbs.rightArm.add(this.pickaxeMesh);

    // 3. Steve faces the block
    this.playerGroup.position.set(0, 0, 0);
    this.playerGroup.rotation.set(0, 0, 0);
    this.playerLimbs.head.rotation.set(0, 0, 0);
    this.playerLimbs.leftArm.rotation.set(0.3, 0, 0.2);
    this.playerLimbs.rightArm.rotation.set(-Math.PI / 4, 0, -0.2);
    this.playerLimbs.leftLeg.rotation.set(0, 0, 0);
    this.playerLimbs.rightLeg.rotation.set(0, 0, 0);

    // 4. Ghost Policeman & Hound hidden in the cave shadows
    this.chaserGroup.visible = false;
    this.ghostDog.group.visible = false;
    this.chaserGroup.position.set(0, 0.8, 5.0);
    this.ghostDog.group.position.set(1.25, 0.1, 4.8);

    // 5. Cinematic Mining Camera Angle (isometric front-side view)
    this.camera.position.set(2.8, 2.2, 0.2);
    this.camera.lookAt(0, 1.3, -1.8);

    if (this.onIntroStateCallback) {
      this.onIntroStateCallback('mining', 'Mining in the Cave...');
    }
  }

  public updateIntro(delta: number) {
    this.introTimer += delta;

    if (this.introTimer < 2.0) {
      // PHASE 1: MINING (Steve repeatedly swings pickaxe at the Diamond Ore)
      const swing = Math.sin(this.introTimer * 14);
      this.playerLimbs.rightArm.rotation.x = -Math.PI / 3 + swing * 0.7;

      // Mine strike sound at periodic intervals
      if (this.introTimer - this.lastMineStrike > 0.45) {
        this.lastMineStrike = this.introTimer;
        sound.playPickaxeMine();
        if (this.introOre) {
          this.introOre.position.x = (Math.random() - 0.5) * 0.05;
        }
      }

      this.camera.position.set(2.8, 2.2 + Math.sin(this.introTimer * 2) * 0.05, 0.2);
      this.camera.lookAt(0, 1.3, -1.8);

    } else if (this.introTimer < 3.0) {
      // PHASE 2: DIAMOND POPPED!
      if (this.introPhase === 'mining') {
        this.introPhase = 'diamond_popped';
        sound.playOreBurst();

        // Ore block shatters/disappears
        if (this.introOre) {
          this.scene.remove(this.introOre);
          this.introOre = null;
        }

        // Floating Diamond appears and pops out!
        this.introDiamond = buildDiamond();
        this.introDiamond.position.set(0, 1.0, -1.6);
        this.scene.add(this.introDiamond);

        // Steve drops pickaxe down and raises hands in triumph
        if (this.pickaxeMesh) {
          this.pickaxeMesh.visible = false;
        }

        if (this.onIntroStateCallback) {
          this.onIntroStateCallback('diamond_popped', '💎 Got a Diamond!');
        }
      }

      // Diamond floats up with glowing rotation
      if (this.introDiamond) {
        this.introDiamond.position.y = 1.0 + (this.introTimer - 2.0) * 1.0;
        this.introDiamond.rotation.y += delta * 5.0;
      }

      // Steve arms raised high in celebration
      this.playerLimbs.leftArm.rotation.x = -Math.PI * 0.7;
      this.playerLimbs.rightArm.rotation.x = -Math.PI * 0.7;

    } else if (this.introTimer < 4.2) {
      // PHASE 3: GHOST APPEARS!
      if (this.introPhase === 'diamond_popped') {
        this.introPhase = 'ghost_appear';
        sound.playGhostWail();
        sound.playPoliceSiren();
        sound.playDogBark();

        // Ghost policeman bursts out
        this.chaserGroup.visible = true;
        this.ghostDog.group.visible = true;
        this.chaserGroup.position.set(0, 0.8, 4.5);
        this.ghostDog.group.position.set(1.25, 0.1, 4.2);

        if (this.onIntroStateCallback) {
          this.onIntroStateCallback('ghost_appear', '⚠️ GHOST POLICEMAN! RUN!');
        }
      }

      // Ghost rushes forward
      this.chaserGroup.position.z -= delta * 0.6;
      this.ghostDog.group.position.z -= delta * 0.6;

      // Steve looks back in terror! (head turns 180 degrees)
      this.playerLimbs.head.rotation.y = Math.PI;
      this.playerLimbs.leftArm.rotation.x = 0;
      this.playerLimbs.rightArm.rotation.x = 0;

      // Camera smoothly sweeps back to third-person runner view
      this.camera.position.lerp(new THREE.Vector3(0, 4.8, 6.8), delta * 4.0);
      this.camera.lookAt(0, 2.0, -10);

    } else {
      // PHASE 4: START RUNNING!
      this.finishIntro();
    }
  }

  public skipIntro() {
    if (this.isIntro) {
      this.finishIntro();
    }
  }

  public finishIntro() {
    this.isIntro = false;
    this.introPhase = 'done';

    if (this.introOre) {
      this.scene.remove(this.introOre);
      this.introOre = null;
    }
    if (this.introDiamond) {
      this.scene.remove(this.introDiamond);
      this.introDiamond = null;
    }
    if (this.pickaxeMesh) {
      this.playerLimbs.rightArm.remove(this.pickaxeMesh);
      this.pickaxeMesh = null;
    }

    // Reset Steve's posture to running
    this.playerLimbs.head.rotation.set(0, 0, 0);
    this.playerLimbs.leftArm.rotation.set(0, 0, 0);
    this.playerLimbs.rightArm.rotation.set(0, 0, 0);

    // Chasers are active right behind player
    this.chaserGroup.visible = true;
    this.ghostDog.group.visible = true;
    this.chaserGroup.position.set(0, 0.6, 3.6);
    this.ghostDog.group.position.set(1.25, 0, 3.4);
    this.playerState.chaserDistance = 3.6;

    this.camera.position.set(0, 4.8, 6.8);
    this.camera.lookAt(0, 2.0, -10);

    if (this.onIntroStateCallback) {
      this.onIntroStateCallback('done', '');
    }
  }

  private createCaveParticles() {
    if (this.sporeParticles) {
      this.scene.remove(this.sporeParticles);
      this.sporeParticles.geometry.dispose();
      (this.sporeParticles.material as THREE.Material).dispose();
      this.sporeParticles = undefined;
    }

    const count = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 8.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    let particleColor = 0xfef08a; // Day sun dust
    let particleSize = 0.16;
    let particleOpacity = 0.5;

    if (this.currentTheme === 'night_walk') {
      particleColor = 0x86efac; // Glowing green/cyan fireflies
      particleSize = 0.22;
      particleOpacity = 0.8;
    } else if (this.currentTheme === 'closed_cave') {
      particleColor = 0xf97316; // Fiery cave spore embers
      particleSize = 0.15;
      particleOpacity = 0.65;
    } else if (this.currentTheme === 'water_walk') {
      particleColor = 0x67e8f9; // Floating underwater bubbles
      particleSize = 0.25;
      particleOpacity = 0.75;
    }

    const material = new THREE.PointsMaterial({
      color: particleColor,
      size: particleSize,
      transparent: true,
      opacity: particleOpacity,
    });

    this.sporeParticles = new THREE.Points(geometry, material);
    this.scene.add(this.sporeParticles);
  }

  private initTrack() {
    this.trackTiles.forEach((t) => this.trackGroup.remove(t));
    this.trackTiles = [];
    for (let i = 0; i < this.numTiles; i++) {
      const tile = this.createTrackTile();
      tile.position.z = -i * this.tileLength;
      this.trackTiles.push(tile);
      this.trackGroup.add(tile);
    }
  }

  /**
   * Sets game environment theme dynamically (day_walk, night_walk, closed_cave, water_walk)
   */
  public setTheme(theme: GameTheme) {
    this.currentTheme = theme;
    const cfg = GAME_THEMES[theme] || GAME_THEMES.day_walk;

    if (this.scene) {
      this.scene.background = new THREE.Color(cfg.skyColor);
      this.scene.fog = new THREE.Fog(cfg.fogColor, cfg.fogNear, cfg.fogFar);
    }

    if (this.sunLight) {
      this.sunLight.color.set(cfg.sunColor);
      this.sunLight.intensity = cfg.sunIntensity;
    }

    if (this.ambientLight) {
      this.ambientLight.color.set(cfg.ambientColor);
      this.ambientLight.intensity = cfg.ambientIntensity;
    }

    if (this.skyLight) {
      this.skyLight.color.set(cfg.skyColor);
    }

    if (this.cloudsGroup) {
      this.cloudsGroup.visible = cfg.hasClouds;
    }

    this.createCaveParticles();

    // Rebuild track tiles keeping relative player z alignment smoothly
    const currentZPositions = this.trackTiles.map((t) => t.position.z);
    this.trackTiles.forEach((t) => {
      this.trackGroup.remove(t);
      t.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    });
    this.trackTiles = [];

    for (let i = 0; i < this.numTiles; i++) {
      const tile = this.createTrackTile();
      tile.position.z = currentZPositions[i] !== undefined ? currentZPositions[i] : -i * this.tileLength;
      this.trackTiles.push(tile);
      this.trackGroup.add(tile);
    }
  }

  public getTheme(): GameTheme {
    return this.currentTheme;
  }

  /**
   * Builds theme-customized Track Tile (Day Walk, Night Walk, Closed Cave, Water Walk)
   */
  private createTrackTile(): THREE.Group {
    const tile = new THREE.Group();
    const cfg = GAME_THEMES[this.currentTheme] || GAME_THEMES.day_walk;

    const roadMat = createBlockMaterial(cfg.roadColor);
    const curbMat = createBlockMaterial(0x27272a);
    const wallMat = createBlockMaterial(cfg.wallColor);
    const railMat = createBlockMaterial(0x94a3b8);
    const tieMat = createBlockMaterial(0x451a03);

    // 1. Roadbed
    const groundGeo = new THREE.BoxGeometry(22.0, 1.0, this.tileLength);
    const ground = new THREE.Mesh(groundGeo, roadMat);
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    tile.add(ground);

    // Track Boundary Curbs (Left & Right)
    const curbGeo = new THREE.BoxGeometry(0.8, 0.4, this.tileLength);
    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-5.6, 0.2, 0);
    leftCurb.receiveShadow = true;
    tile.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(5.6, 0.2, 0);
    rightCurb.receiveShadow = true;
    tile.add(rightCurb);

    // 2. Canyon / Cave Walls (Left & Right)
    const wallHeight = cfg.hasRoof ? 12.0 : 14.0;
    const wallGeo = new THREE.BoxGeometry(3.8, wallHeight, this.tileLength);
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-9.8, wallHeight / 2 - 1, 0);
    leftWall.receiveShadow = true;
    tile.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(9.8, wallHeight / 2 - 1, 0);
    rightWall.receiveShadow = true;
    tile.add(rightWall);

    // 3. Theme-Specific Top / Roof Elements
    if (this.currentTheme === 'day_walk') {
      // Lush green grass rims on canyon tops
      const dirtUnderMat = createBlockMaterial(0x713f12);
      const grassRimMat = createBlockMaterial(0x22c55e);
      const dirtGeo = new THREE.BoxGeometry(4.0, 0.6, this.tileLength);
      const grassGeo = new THREE.BoxGeometry(4.2, 0.6, this.tileLength);

      const leftDirt = new THREE.Mesh(dirtGeo, dirtUnderMat);
      leftDirt.position.set(-9.8, 13.0, 0);
      tile.add(leftDirt);

      const leftGrass = new THREE.Mesh(grassGeo, grassRimMat);
      leftGrass.position.set(-9.8, 13.6, 0);
      tile.add(leftGrass);

      const rightDirt = new THREE.Mesh(dirtGeo, dirtUnderMat);
      rightDirt.position.set(9.8, 13.0, 0);
      tile.add(rightDirt);

      const rightGrass = new THREE.Mesh(grassGeo, grassRimMat);
      rightGrass.position.set(9.8, 13.6, 0);
      tile.add(rightGrass);
    } else if (this.currentTheme === 'closed_cave') {
      // Enclosed subterranean cavern ceiling
      const caveRoofMat = createBlockMaterial(0x09090b);
      const roofGeo = new THREE.BoxGeometry(22.0, 1.8, this.tileLength);
      const roof = new THREE.Mesh(roofGeo, caveRoofMat);
      roof.position.set(0, 11.5, 0);
      tile.add(roof);

      // Hanging stalactites
      const stalactite1 = buildStalactite();
      stalactite1.position.set(-6.2, 10.5, -12);
      stalactite1.scale.set(1.2, 1.3, 1.2);
      tile.add(stalactite1);

      const stalactite2 = buildStalactite();
      stalactite2.position.set(6.2, 10.5, 8);
      stalactite2.scale.set(1.2, 1.3, 1.2);
      tile.add(stalactite2);
    } else if (this.currentTheme === 'water_walk') {
      // Translucent reflective water layer across track bed
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.5,
      });
      const waterGeo = new THREE.BoxGeometry(10.5, 0.12, this.tileLength);
      const waterPlane = new THREE.Mesh(waterGeo, waterMat);
      waterPlane.position.set(0, 0.12, 0);
      tile.add(waterPlane);

      // Glowing Sea Lanterns embedded along the walls
      const lantern1 = buildSeaLanternBlock();
      lantern1.position.set(-7.5, 1.8, -10);
      tile.add(lantern1);

      const lantern2 = buildSeaLanternBlock();
      lantern2.position.set(7.5, 1.8, 10);
      tile.add(lantern2);
    }

    // 4. Railway Tracks: 3 Lanes
    const lanes: Lane[] = [-1, 0, 1];
    lanes.forEach((lane) => {
      const x = LANE_COORDS[lane];
      // 2 Steel Rails
      const railGeo = new THREE.BoxGeometry(0.12, 0.12, this.tileLength);
      const leftRail = new THREE.Mesh(railGeo, railMat);
      leftRail.position.set(x - 0.7, 0.08, 0);
      tile.add(leftRail);

      const rightRail = new THREE.Mesh(railGeo, railMat);
      rightRail.position.set(x + 0.7, 0.08, 0);
      tile.add(rightRail);

      // Wooden Railroad Ties spaced every 2.0 meters
      const tieGeo = new THREE.BoxGeometry(1.8, 0.08, 0.35);
      for (let z = -this.tileLength / 2 + 1; z < this.tileLength / 2; z += 2.0) {
        const tie = new THREE.Mesh(tieGeo, tieMat);
        tie.position.set(x, 0.04, z);
        tie.receiveShadow = true;
        tile.add(tie);
      }
    });

    // 5. Embedded Glowing Ore Deposits in Walls
    const diamondOre = buildOreBlock('diamond');
    diamondOre.position.set(-7.8, 3.2, -14);
    diamondOre.scale.set(1.2, 1.2, 1.2);
    tile.add(diamondOre);

    const goldOre = buildOreBlock('gold');
    goldOre.position.set(7.8, 4.0, -4);
    goldOre.scale.set(1.2, 1.2, 1.2);
    tile.add(goldOre);

    const redstoneOre = buildOreBlock('redstone');
    redstoneOre.position.set(-7.8, 4.5, 10);
    redstoneOre.scale.set(1.2, 1.2, 1.2);
    tile.add(redstoneOre);

    const emeraldOre = buildOreBlock('emerald');
    emeraldOre.position.set(7.8, 3.0, 14);
    emeraldOre.scale.set(1.2, 1.2, 1.2);
    tile.add(emeraldOre);

    // 6. Rustic Timber Canyon Arch spanning across (torchlit)
    const arch = buildMineshaftArch(16.0, 7.8);
    arch.group.position.set(0, 0, 0);
    tile.add(arch.group);

    return tile;
  }

  private populateInitialObstacles() {
    for (let z = -40; z > -180; z -= 25) {
      this.spawnPatternAt(z);
    }
    this.lastSpawnZ = -180;
  }

  private spawnPatternAt(z: number) {
    const r = this.prng();
    const lanes: Lane[] = [-1, 0, 1];

    // Pick 1 or 2 lanes for obstacles (never all 3, leaving at least 1 open escape lane!)
    const obstacleCount = r > 0.4 ? 2 : 1;
    const shuffledLanes = [...lanes].sort(() => this.prng() - 0.5);
    const chosenLanes = shuffledLanes.slice(0, obstacleCount);
    const freeLane = shuffledLanes[obstacleCount];

    chosenLanes.forEach((lane) => {
      const typeRoll = this.prng();
      let type: ObstacleInstance['type'] = 'rock';
      let height = 1.2;
      let width = 1.6;
      let depth = 1.4;
      let y = 0;
      let speed = 0;

      let mesh: THREE.Group;
      if (typeRoll < 0.32) {
        // Minecart Trolley (speeding oncoming trolley rushing down the track towards player!)
        type = 'minecart';
        mesh = buildMinecart();
        height = 1.2;
        width = 1.5;
        depth = 2.0;
        speed = this.prng() > 0.35 ? (12 + this.prng() * 6) : 0; // Speeding oncoming trolley!
      } else if (typeRoll < 0.58) {
        // Rock obstacle to jump over
        type = 'rock';
        mesh = buildRockObstacle();
        height = 1.1;
        width = 1.6;
        depth = 1.4;
      } else if (typeRoll < 0.78) {
        // Spooky ghost hurdle obstacle (floating barrier: slide underneath or switch lanes!)
        type = 'ghost';
        mesh = buildGhostObstacle();
        height = 2.2;
        width = 1.6;
        depth = 1.4;
        y = 0; // Ground level pivot with floating torso at Y=1.55
      } else {
        // Airborne Phantom (Air obstacle hovering in the sky/air: slide/dive underneath or switch lanes!)
        type = 'phantom';
        mesh = buildAerialPhantom();
        height = 1.6;
        width = 2.2;
        depth = 1.8;
        y = 1.85; // Flying high in the air!
      }

      mesh.position.set(LANE_COORDS[lane], y, z);
      this.scene.add(mesh);

      this.obstacles.push({
        id: this.nextObstacleId++,
        lane,
        type,
        mesh,
        z,
        y,
        speed,
        width,
        height,
        depth,
      });
    });

    // Spawn Minecraft Diamonds and Power-ups on the free lane or across lanes
    const itemRoll = this.prng();
    if (itemRoll < 0.86) {
      const diamondLane = freeLane !== undefined ? freeLane : 0;
      const diamondZ = z - 2;

      // Spawn trail of 4 Minecraft Diamonds
      for (let c = 0; c < 4; c++) {
        const diamondMesh = buildDiamond();
        diamondMesh.position.set(LANE_COORDS[diamondLane], 0.7, diamondZ - c * 2.5);
        this.scene.add(diamondMesh);

        this.items.push({
          id: this.nextItemId++,
          type: 'diamond',
          mesh: diamondMesh,
          lane: diamondLane,
          z: diamondZ - c * 2.5,
          y: 0.7,
        });
      }
    } else {
      const powerupLane = freeLane !== undefined ? freeLane : 0;
      const canSpawnGoldenApple = Math.abs(z - this.lastGoldenAppleZ) > 130;

      // Strict gap between Enchanted Golden Apples: only spawn after at least 130m
      if (canSpawnGoldenApple && this.prng() < 0.35) {
        this.lastGoldenAppleZ = z;
        const appleMesh = buildGoldenApple();
        appleMesh.position.set(LANE_COORDS[powerupLane], 0.8, z - 3);
        this.scene.add(appleMesh);

        this.items.push({
          id: this.nextItemId++,
          type: 'golden_apple',
          mesh: appleMesh,
          lane: powerupLane,
          z: z - 3,
          y: 0.8,
        });
      } else if (this.prng() < 0.5) {
        // Authentic Minecraft Redstone Compass / Magnet
        const magnetMesh = buildRedstoneCompass();
        magnetMesh.position.set(LANE_COORDS[powerupLane], 0.8, z - 3);
        this.scene.add(magnetMesh);

        this.items.push({
          id: this.nextItemId++,
          type: 'magnet',
          mesh: magnetMesh,
          lane: powerupLane,
          z: z - 3,
          y: 0.8,
        });
      } else {
        // Authentic Minecraft Potion of Swiftness
        const potionMesh = buildPotionOfSwiftness();
        potionMesh.position.set(LANE_COORDS[powerupLane], 0.8, z - 3);
        this.scene.add(potionMesh);

        this.items.push({
          id: this.nextItemId++,
          type: 'potion',
          mesh: potionMesh,
          lane: powerupLane,
          z: z - 3,
          y: 0.8,
        });
      }
    }
  }

  public moveLeft() {
    if (this.isIntro) {
      this.skipIntro();
      return;
    }
    if (this.playerState.isDead) return;
    if (this.playerState.lane > -1) {
      this.playerState.lane = (this.playerState.lane - 1) as Lane;
      this.targetX = LANE_COORDS[this.playerState.lane];
      sound.playSlide();
    }
  }

  public moveRight() {
    if (this.isIntro) {
      this.skipIntro();
      return;
    }
    if (this.playerState.isDead) return;
    if (this.playerState.lane < 1) {
      this.playerState.lane = (this.playerState.lane + 1) as Lane;
      this.targetX = LANE_COORDS[this.playerState.lane];
      sound.playSlide();
    }
  }

  public jump() {
    if (this.isIntro) {
      this.skipIntro();
      return;
    }
    if (this.playerState.isDead) return;
    if (!this.playerState.isJumping && !this.playerState.isSliding) {
      this.playerState.isJumping = true;
      this.playerState.jumpVelocity = 18;
      sound.playJump();
    }
  }

  public slide() {
    if (this.isIntro) {
      this.skipIntro();
      return;
    }
    if (this.playerState.isDead) return;

    // Check if player is airborne (jumping or in the air)
    if (this.playerState.isJumping || this.playerState.y > 0.15) {
      // In mid-air! Initiate high-velocity dive / ground plunge down
      if (!this.playerState.isDiving) {
        this.playerState.isDiving = true;
        this.playerState.jumpVelocity = -36; // Strong downward momentum
        sound.playDive();
      }
      return;
    }

    // On the ground: initiate slide
    if (!this.playerState.isSliding) {
      this.triggerGroundSlide();
    }
  }

  private triggerGroundSlide() {
    if (this.playerState.isSliding || this.playerState.isDead) return;
    this.playerState.isSliding = true;
    sound.playSlide();

    // If chaser is nearby at start, slight pressure
    if (this.playerState.chaserDistance < 6) {
      this.playerState.chaserDistance = Math.max(1.8, this.playerState.chaserDistance - 0.4);
    }

    setTimeout(() => {
      if (!this.isDestroyed) {
        this.playerState.isSliding = false;
      }
    }, 720);
  }

  private spawnLandingDust(x: number, z: number) {
    if (!this.scene) return;
    const dustCount = 8;
    const dustMat = createBlockMaterial(0xd1d5db, 0x9ca3af, 0.75, 0.5);
    const dustGroup = new THREE.Group();
    dustGroup.position.set(x, 0.08, z);

    for (let i = 0; i < dustCount; i++) {
      const angle = (i / dustCount) * Math.PI * 2;
      const size = 0.12 + Math.random() * 0.1;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mesh = new THREE.Mesh(geo, dustMat);
      mesh.position.set(Math.cos(angle) * 0.4, 0.06, Math.sin(angle) * 0.4);
      dustGroup.add(mesh);
    }
    this.scene.add(dustGroup);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.05;
      dustGroup.scale.multiplyScalar(1.15);
      dustGroup.position.y += 0.02;
      if (elapsed >= 0.3) {
        clearInterval(interval);
        this.scene.remove(dustGroup);
        dustGroup.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
          }
        });
      }
    }, 50);
  }

  public updateOpponent(targetDistance: number, targetLane: number, isDead: boolean) {
    this.hasOpponent = true;
    this.opponentTargetDistance = targetDistance;
    this.opponentTargetLane = targetLane;
    this.opponentIsDead = isDead;
    this.opponentGroup.visible = !isDead;
  }

  /**
   * Pauses gameplay and holds scene in peaceful idle mode on the home menu
   */
  public pauseToMenu() {
    this.isPlayingGame = false;
    this.isIntro = false;

    // Reset player to upright starting pose
    this.playerGroup.position.set(0, 0, 0);
    this.playerGroup.rotation.set(0, 0, 0);
    this.playerLimbs.head.rotation.set(0, 0, 0);
    this.playerLimbs.leftArm.rotation.set(0, 0, 0);
    this.playerLimbs.rightArm.rotation.set(0, 0, 0);
    this.playerLimbs.leftLeg.rotation.set(0, 0, 0);
    this.playerLimbs.rightLeg.rotation.set(0, 0, 0);

    // Hide intro items if any
    if (this.introOre) {
      this.scene.remove(this.introOre);
      this.introOre = null;
    }
    if (this.introDiamond) {
      this.scene.remove(this.introDiamond);
      this.introDiamond = null;
    }
    if (this.pickaxeMesh) {
      this.playerLimbs.rightArm.remove(this.pickaxeMesh);
      this.pickaxeMesh = null;
    }

    // Hide chasers in menu
    this.chaserGroup.visible = false;
    this.ghostDog.group.visible = false;

    // Center camera on track overview with responsive framing
    const width = this.container?.clientWidth || window.innerWidth;
    const height = this.container?.clientHeight || window.innerHeight;
    this.updateCameraProjection(width, height);
    this.camera.lookAt(0, 2.0, -10);
  }

  private animate = () => {
    if (this.isDestroyed) return;

    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number) {
    if (!this.isPlayingGame) {
      // Scene is idle in menu - only gently drift sky clouds
      if (this.cloudsGroup) {
        this.cloudsGroup.children.forEach((c) => {
          c.position.z += 1.2 * delta;
          if (c.position.z > 35) {
            c.position.z = -220;
            c.position.x = (Math.random() - 0.5) * 65;
          }
        });
      }
      return;
    }

    if (this.isIntro) {
      this.updateIntro(delta);
      if (this.onStateUpdateCallback) {
        this.onStateUpdateCallback({ ...this.playerState });
      }
      return;
    }

    if (this.playerState.isDead) {
      // Death camera & chaser apprehension animation: Ghost Policeman & Dog surge forward to catch Steve!
      this.chaserGroup.visible = true;
      this.ghostDog.group.visible = true;
      this.chaserGroup.position.z += (this.playerState.z - 0.2 - this.chaserGroup.position.z) * (7 * delta);
      this.ghostDog.group.position.z += (this.playerState.z - 0.2 - this.ghostDog.group.position.z) * (7 * delta);
      this.chaserGroup.position.x += (this.playerGroup.position.x - this.chaserGroup.position.x) * (7 * delta);
      this.ghostDog.group.position.x += (this.playerGroup.position.x + 1.1 - this.ghostDog.group.position.x) * (7 * delta);
      return;
    }

    // Gradual speed ramping
    this.speed = Math.min(38, this.baseSpeed + (this.playerState.distance / 120));

    // Dynamic Tempo Sync with Cyber Synthwave Soundtrack
    sound.setSpeedBpmMultiplier(this.speed / this.baseSpeed);

    // Dynamic Camera FOV (Maintains responsive base FOV for different screen aspects)
    const targetFov = this.baseFov + Math.min(6, (this.speed - this.baseSpeed) * 0.25);
    if (Math.abs(targetFov - this.camera.fov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * (2 * delta);
      this.camera.updateProjectionMatrix();
    }

    // Player forward movement
    const forwardStep = this.speed * delta;
    this.playerState.z -= forwardStep;
    this.playerState.distance += forwardStep;
    this.playerState.score += Math.floor(forwardStep * this.playerState.multiplier);

    // Power-up countdowns
    if (this.playerState.invincibleTimer > 0) {
      this.playerState.invincibleTimer -= delta;
      if (this.playerState.invincibleTimer <= 0) {
        this.playerState.multiplier = 1;
      }
    }
    if (this.playerState.magnetTimer > 0) {
      this.playerState.magnetTimer -= delta;
    }

    this.sessionRunTime += delta;

    // Subway Surfers Opening Mechanic:
    // Only at the beginning of the run (first ~4.5 seconds), the Ghost Policeman & Dog
    // are visible right behind Steve so the player immediately gets the feel of being pursued.
    // Afterwards, Steve outpaces them and they smoothly drop back into the darkness.
    if (this.sessionRunTime < 4.5) {
      this.playerState.chaserDistance = 3.6 + Math.sin(this.runAnimTime * 0.8) * 0.2;
      this.chaserGroup.visible = true;
      this.ghostDog.group.visible = true;

      // Play intro siren and bark once right after starting
      if (!this.playedStartAudio && this.sessionRunTime > 0.5) {
        this.playedStartAudio = true;
        sound.playPoliceSiren();
        setTimeout(() => sound.playDogBark(), 300);
      }
    } else {
      // Steve outpaces the ghost chasers; they fall back into the darkness
      if (this.playerState.chaserDistance < 24) {
        this.playerState.chaserDistance += 4.5 * delta;
      }

      // Beyond 11m (behind camera view), hide them so they aren't always shown
      const isVisible = this.playerState.chaserDistance <= 11;
      this.chaserGroup.visible = isVisible;
      this.ghostDog.group.visible = isVisible;
    }

    // Lane interpolation: Frame-rate independent exponential smoothing with precise snapping
    const laneDist = this.targetX - this.playerGroup.position.x;
    if (Math.abs(laneDist) < 0.005) {
      this.playerGroup.position.x = this.targetX;
    } else {
      const moveFactor = 1 - Math.exp(-22 * delta);
      this.playerGroup.position.x += laneDist * moveFactor;
    }
    this.playerState.x = this.playerGroup.position.x;
    this.playerGroup.position.z = this.playerState.z;

    // Subtle, clean body roll banking into the turn (smoothly returns to 0 when settled)
    const shiftVel = this.targetX - this.playerGroup.position.x;
    const targetRoll = Math.abs(shiftVel) > 0.04 ? THREE.MathUtils.clamp(-shiftVel * 0.05, -0.1, 0.1) : 0;
    this.playerGroup.rotation.z += (targetRoll - this.playerGroup.rotation.z) * (1 - Math.exp(-18 * delta));
    if (Math.abs(this.playerGroup.rotation.z) < 0.001) {
      this.playerGroup.rotation.z = 0;
    }

    // Jump / Gravity / Dive Physics
    if (this.playerState.isJumping) {
      const gravity = this.playerState.isDiving ? 70 : 42;
      this.playerState.y += this.playerState.jumpVelocity * delta;
      this.playerState.jumpVelocity -= gravity * delta;

      if (this.playerState.y <= 0) {
        this.playerState.y = 0;
        this.playerState.isJumping = false;
        this.playerState.jumpVelocity = 0;
        const wasDiving = this.playerState.isDiving;
        this.playerState.isDiving = false;

        // If player was diving from mid-air, trigger landing dust and chain into slide!
        if (wasDiving) {
          this.triggerGroundSlide();
          this.spawnLandingDust(this.playerGroup.position.x, this.playerGroup.position.z);
        }
      }
    }

    if (this.playerState.isSliding && !this.playerState.isJumping) {
      this.playerGroup.position.y = 0.38;
    } else {
      this.playerGroup.position.y = this.playerState.y;
    }

    // Steve Running Limbs Animation
    this.runAnimTime += delta * (this.speed * 0.75);
    const swingAngle = Math.sin(this.runAnimTime) * 0.8;

    if (this.playerState.isDiving) {
      // MID-AIR FAST DIVE POSTURE:
      // Body tilts forward-down in aerodynamic dive, arms swept back, legs trailing
      this.playerGroup.rotation.x = Math.PI / 4.2;
      this.playerLimbs.head.rotation.x = -Math.PI / 6;
      this.playerLimbs.leftArm.rotation.x = Math.PI / 1.35;
      this.playerLimbs.rightArm.rotation.x = Math.PI / 1.35;
      this.playerLimbs.leftLeg.rotation.x = -0.4;
      this.playerLimbs.rightLeg.rotation.x = -0.4;
    } else if (this.playerState.isSliding) {
      // Ground slide posture: tilt body horizontal, lower height
      this.playerGroup.rotation.x = -Math.PI / 3;
      this.playerLimbs.head.rotation.x = Math.PI / 6;
      this.playerLimbs.leftArm.rotation.x = -Math.PI / 4;
      this.playerLimbs.rightArm.rotation.x = -Math.PI / 4;
      this.playerLimbs.leftLeg.rotation.x = 0;
      this.playerLimbs.rightLeg.rotation.x = 0;
    } else if (this.playerState.isJumping) {
      // Jump posture: arms up, legs slightly bent
      this.playerGroup.rotation.x = 0;
      this.playerLimbs.head.rotation.x = 0;
      this.playerLimbs.leftArm.rotation.x = -Math.PI / 1.5;
      this.playerLimbs.rightArm.rotation.x = -Math.PI / 1.5;
      this.playerLimbs.leftLeg.rotation.x = 0.5;
      this.playerLimbs.rightLeg.rotation.x = 0.5;
    } else {
      // Standard running gait
      this.playerGroup.rotation.x = 0;
      this.playerLimbs.head.rotation.x = 0;
      this.playerLimbs.leftArm.rotation.x = swingAngle;
      this.playerLimbs.rightArm.rotation.x = -swingAngle;
      this.playerLimbs.leftLeg.rotation.x = -swingAngle;
      this.playerLimbs.rightLeg.rotation.x = swingAngle;
    }

    // Ghost Policeman Update (Actively lunges and reaches forward!)
    this.chaserGroup.position.x += (this.playerGroup.position.x - this.chaserGroup.position.x) * (8 * delta);
    this.chaserGroup.position.z = this.playerState.z + this.playerState.chaserDistance;
    // Eerie floating bobbing motion
    this.chaserGroup.position.y = 0.8 + Math.sin(this.runAnimTime * 0.5) * 0.35;
    // Claws reach and grasp forward
    this.chaserParts.leftArm.rotation.x = Math.PI / 2 + Math.sin(this.runAnimTime * 1.5) * 0.3;
    this.chaserParts.rightArm.rotation.x = Math.PI / 2 - Math.sin(this.runAnimTime * 1.5) * 0.3;

    // Siren light flicker (alternating bright red / blue)
    this.chaserFlickerTimer += delta * 10;
    if (Math.sin(this.chaserFlickerTimer) > 0) {
      this.chaserParts.policeLight.color.setHex(0xff0033);
      this.chaserParts.policeLight.intensity = 3.0;
    } else {
      this.chaserParts.policeLight.color.setHex(0x0088ff);
      this.chaserParts.policeLight.intensity = 3.0;
    }

    // Ghost Dog Update (Runs directly alongside the Ghost Policeman!)
    this.ghostDog.group.position.x = this.chaserGroup.position.x + 1.25;
    this.ghostDog.group.position.z = this.chaserGroup.position.z - 0.2;
    this.ghostDog.group.position.y = 0.05 + Math.abs(Math.sin(this.runAnimTime * 2.5)) * 0.15;

    // Dog limb gallop animation
    const dogGallop = Math.sin(this.runAnimTime * 2.5) * 0.9;
    this.ghostDog.frontLeftLeg.rotation.x = dogGallop;
    this.ghostDog.frontRightLeg.rotation.x = -dogGallop;
    this.ghostDog.backLeftLeg.rotation.x = -dogGallop;
    this.ghostDog.backRightLeg.rotation.x = dogGallop;
    this.ghostDog.tail.rotation.y = Math.sin(this.runAnimTime * 4.0) * 0.45;
    this.ghostDog.jaw.rotation.x = Math.max(0, Math.sin(this.runAnimTime * 2.0) * 0.35);

    // Audio warning when chaser is within 2.5 meters and visible
    if (this.playerState.chaserDistance < 2.5 && this.chaserGroup.visible) {
      this.chaserWarningTimer += delta;
      if (this.chaserWarningTimer > 2.0) {
        this.chaserWarningTimer = 0;
        if (Math.random() > 0.5) {
          sound.playPoliceSiren();
        } else {
          sound.playDogBark();
        }
      }
    }

    // Ghost Policeman Catch / Apprehend Condition!
    if (this.playerState.chaserDistance <= 0.85) {
      this.handlePlayerDeath('ghost');
      this.playerState.causeOfDeath = 'Player was apprehended by the Ghost Policeman';
      return;
    }

    // Sunlight follows player smoothly for crisp, non-jittering real-time shadows
    if (this.sunLight) {
      this.sunLight.position.x = this.playerGroup.position.x + 25;
      this.sunLight.position.z = this.playerState.z + 18;
      this.sunLight.target.position.x = this.playerGroup.position.x;
      this.sunLight.target.position.z = this.playerState.z - 6;
      this.sunLight.target.updateMatrixWorld();
    }

    // Animate floating dust spore particles
    const nowTime = this.clock.getElapsedTime();
    if (this.sporeParticles) {
      const positions = this.sporeParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(nowTime + i) * 0.005;
        // Wrap z around player
        if (positions[i + 2] > this.playerState.z + 10) {
          positions[i + 2] = this.playerState.z - 100;
        }
      }
      this.sporeParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate floating voxel clouds in open daylight sky
    if (this.cloudsGroup) {
      this.cloudsGroup.children.forEach((c) => {
        c.position.z += (this.speed * 0.12 + 1.2) * delta;
        if (c.position.z > this.playerState.z + 40) {
          c.position.z = this.playerState.z - 240;
          c.position.x = (Math.random() - 0.5) * 65;
        }
      });
    }

    // Update Current Canyon Biome Zone based on distance run
    if (this.playerState.distance < 350) {
      this.playerState.currentZone = 'Overworld Ravine';
    } else if (this.playerState.distance < 750) {
      this.playerState.currentZone = 'Crystal Canyon';
    } else {
      this.playerState.currentZone = 'Nether Magma Trench';
    }

    // Track recycling (unbroken infinite cavern conveyor)
    this.trackTiles.forEach((tile) => {
      if (tile.position.z > this.playerState.z + this.tileLength) {
        let minZ = this.playerState.z;
        for (let t = 0; t < this.trackTiles.length; t++) {
          if (this.trackTiles[t].position.z < minZ) {
            minZ = this.trackTiles[t].position.z;
          }
        }
        tile.position.z = minZ - this.tileLength;
      }
    });

    // Spawn new obstacles ahead
    if (this.playerState.z - 120 < this.lastSpawnZ) {
      this.lastSpawnZ -= 25;
      this.spawnPatternAt(this.lastSpawnZ);
    }

    // Update & Collision check for Obstacles
    this.updateObstacles(delta);

    // Update & Pickup check for Items
    this.updateItems(delta);

    // Update Opponent Ghost in Multiplayer
    if (this.hasOpponent && this.opponentGroup.visible) {
      const oppRelZ = -(this.opponentTargetDistance);
      this.opponentGroup.position.z = oppRelZ;
      const targetOppX = LANE_COORDS[this.opponentTargetLane as Lane] ?? 0;
      this.opponentGroup.position.x += (targetOppX - this.opponentGroup.position.x) * (15 * delta);
      // Opponent running animation
      this.opponentLimbs.leftLeg.rotation.x = -swingAngle;
      this.opponentLimbs.rightLeg.rotation.x = swingAngle;
    }

    // Camera follow: Smooth, rock-solid tracking (ZERO SCREEN SHAKE ON TURNS!)
    const targetCamX = this.targetX * 0.52;
    const camDist = targetCamX - this.camera.position.x;
    if (Math.abs(camDist) < 0.004) {
      this.camera.position.x = targetCamX;
    } else {
      const camFactor = 1 - Math.exp(-14 * delta);
      this.camera.position.x += camDist * camFactor;
    }
    this.camera.position.z = this.playerState.z + this.baseCamZOffset;
    this.camera.position.y = this.baseCamYOffset + (this.playerState.y * 0.12);

    // Look directly forward down the rails with camera's own X coordinate
    // Eliminates all yaw angle oscillation, diagonal view tilting, and camera shake after shifting
    this.camera.lookAt(
      this.camera.position.x,
      this.baseLookAtY + (this.playerState.y * 0.12),
      this.playerState.z - 15
    );

    // Throttle React layer HUD state updates to ~20 FPS (every 50ms) to stop React re-render lag
    const now = performance.now();
    if (this.onStateUpdateCallback && now - this.lastStateUpdateTime > 50) {
      this.lastStateUpdateTime = now;
      this.onStateUpdateCallback({ ...this.playerState });
    }
  }

  private updateObstacles(delta: number) {
    const px = this.playerGroup.position.x;
    const py = this.playerGroup.position.y;
    const pz = this.playerGroup.position.z;

    if (this.playerState.isSliding) {
      // Low profile hitbox when sliding
      this.playerBox.min.set(px - 0.35, 0, pz - 0.7);
      this.playerBox.max.set(px + 0.35, 0.7, pz + 0.7);
    } else {
      // Standing / Jumping hitbox
      this.playerBox.min.set(px - 0.35, py, pz - 0.35);
      this.playerBox.max.set(px + 0.35, py + 1.8, pz + 0.35);
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // Moving Minecarts (Trolleys) rush along track towards player!
      if (obs.type === 'minecart' && obs.mesh) {
        if (obs.speed > 0) {
          obs.z += obs.speed * delta;
          obs.mesh.position.z = obs.z;

          // Play warning rumble when oncoming trolley approaches
          if (Math.abs(obs.z - pz) < 24 && Math.abs(this.playerState.z - this.lastTrolleySoundZ) > 28) {
            this.lastTrolleySoundZ = this.playerState.z;
            sound.playTrolleyRumble();
          }
        }
      }

      // Airborne Phantom wing flap & hovering animation
      if (obs.type === 'phantom' && obs.mesh) {
        obs.mesh.position.y = obs.y + Math.sin(this.runAnimTime * 3.5 + obs.id) * 0.18;
        if (obs.mesh.userData?.leftWing && obs.mesh.userData?.rightWing) {
          const flap = Math.sin(this.runAnimTime * 6.0 + obs.id) * 0.32;
          obs.mesh.userData.leftWing.rotation.z = flap;
          obs.mesh.userData.rightWing.rotation.z = -flap;
        }
      }

      // Check collision if obstacle is near player
      if (Math.abs(obs.z - pz) < 4.0 && obs.mesh) {
        const ox = obs.mesh.position.x;
        const oy = obs.mesh.position.y;
        const oz = obs.mesh.position.z;

        if (obs.type === 'phantom') {
          // Aerial Phantom: flies in the air (Y = 1.15 to 2.8m).
          // Sliding keeps player low (Y=0 to 0.7m), allowing clean sliding underneath!
          // But standing (Y=0 to 1.8m) or jumping into it is FATAL!
          this.obsBox.min.set(ox - obs.width / 2, oy - 0.45, oz - obs.depth / 2);
          this.obsBox.max.set(ox + obs.width / 2, oy + obs.height, oz + obs.depth / 2);
        } else if (obs.type === 'ghost') {
          // Floating Ghost Hurdle:
          // Clearance underneath from Y=0 to 0.85m allows sliding cleanly underneath!
          // BUT standing (Y=0 to 1.8) or jumping (Y=0.5 to 2.4) into it is FATAL!
          this.obsBox.min.set(ox - obs.width / 2, oy + 0.85, oz - obs.depth / 2);
          this.obsBox.max.set(ox + obs.width / 2, oy + 2.35, oz + obs.depth / 2);
        } else {
          // Minecart Trolley or Rock: on the ground. Steve can jump over rocks!
          this.obsBox.min.set(ox - obs.width / 2, oy, oz - obs.depth / 2);
          this.obsBox.max.set(ox + obs.width / 2, oy + obs.height, oz + obs.depth / 2);
        }

        // Intersects?
        if (this.playerBox.intersectsBox(this.obsBox)) {
          if (this.playerState.invincibleTimer > 0) {
            // Enchanted Golden Apple blasts through!
            this.scene.remove(obs.mesh);
            this.obstacles.splice(i, 1);
            sound.playHit();
            continue;
          }

          // Player Hit! Fatal obstacle!
          this.handlePlayerDeath(obs.type);
          return;
        }
      }

      // Near-Miss detection: safely dodged or jumped close to an obstacle!
      if (
        !obs.nearMissAwarded &&
        !this.playerState.isDead &&
        obs.z > pz &&
        obs.z < pz + 2.8 &&
        obs.mesh
      ) {
        obs.nearMissAwarded = true;
        const dx = Math.abs(obs.mesh.position.x - px);
        // If close laterally (e.g. adjacent lane) or ducked/jumped right over it
        if (dx <= 3.2) {
          this.playerState.nearMissCount = (this.playerState.nearMissCount || 0) + 1;
          this.playerState.comboStreak = (this.playerState.comboStreak || 0) + 1;
          this.playerState.score += 150 * this.playerState.multiplier;
          sound.playNearMiss();
          if (this.onNearMissCallback) {
            this.onNearMissCallback(this.playerState.comboStreak);
          }
        }
      }

      // Cleanup obstacles that are far behind player
      if (obs.z > pz + 20) {
        if (obs.mesh) this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateItems(delta: number) {
    const px = this.playerGroup.position.x;
    const py = this.playerGroup.position.y;
    const pz = this.playerGroup.position.z;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (!item.mesh) continue;

      // Rotation animation
      item.mesh.rotation.y += 3.5 * delta;

      // Redstone Compass Magnet pull logic: if magnet active, diamonds fly towards player
      if (this.playerState.magnetTimer > 0 && (item.type === 'coin' || item.type === 'diamond')) {
        const dist = Math.hypot(item.mesh.position.x - px, item.mesh.position.z - pz);
        if (dist < 20) {
          item.mesh.position.x += (px - item.mesh.position.x) * (15 * delta);
          item.mesh.position.z += (pz - item.mesh.position.z) * (15 * delta);
          item.mesh.position.y += (py + 0.8 - item.mesh.position.y) * (15 * delta);
        }
      }

      // Collection collision check
      const dx = Math.abs(item.mesh.position.x - px);
      const dy = Math.abs(item.mesh.position.y - (py + 0.8));
      const dz = Math.abs(item.mesh.position.z - pz);

      if (dx < 1.25 && dz < 1.25 && dy < 1.6) {
        // Collect!
        if (item.type === 'coin' || item.type === 'diamond') {
          this.playerState.coins += 1; // Diamonds count!
          this.playerState.score += 60 * this.playerState.multiplier;
          sound.playDiamondPickup();
        } else if (item.type === 'golden_apple') {
          this.playerState.invincibleTimer = 8.0; // 8s invincibility
          this.playerState.multiplier = 3;
          sound.playPowerUp();
        } else if (item.type === 'magnet') {
          this.playerState.magnetTimer = 10.0; // 10s Redstone Compass Magnet
          sound.playPowerUp();
        } else if (item.type === 'potion') {
          this.playerState.invincibleTimer = 5.0; // Potion of Swiftness
          this.playerState.multiplier = 2;
          sound.playPowerUp();
        }

        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
        continue;
      }

      // Cleanup items behind player
      if (item.mesh.position.z > pz + 15) {
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  private handlePlayerDeath(obstacleType: ObstacleInstance['type']) {
    if (this.playerState.isDead) return;

    this.playerState.isDead = true;
    let cause = 'Player died in the Cave';
    if (obstacleType === 'minecart') {
      cause = 'Player was smashed by an oncoming Minecart Trolley';
    } else if (obstacleType === 'rock') {
      cause = 'Player pulverized into solid rock';
    } else if (obstacleType === 'ghost') {
      cause = 'Player was haunted & slain by the Cave Ghost';
    } else if (obstacleType === 'phantom') {
      cause = 'Player was struck down by an Airborne Phantom';
    } else {
      cause = 'Player was apprehended by the Ghost Policeman';
    }
    this.playerState.causeOfDeath = cause;

    // Immediately bring Ghost Policeman & Dog into view to apprehend Steve
    this.chaserGroup.visible = true;
    this.ghostDog.group.visible = true;
    this.playerState.chaserDistance = 3.6;
    this.chaserGroup.position.set(
      this.playerGroup.position.x,
      0.8,
      this.playerState.z + 4.2
    );
    this.ghostDog.group.position.set(
      this.playerGroup.position.x + 1.25,
      0.1,
      this.playerState.z + 3.9
    );

    sound.playMinecraftOof();
    sound.playGhostWail();
    sound.playPoliceSiren();
    sound.playDogBark();

    if (this.onGameOverCallback) {
      this.onGameOverCallback({ ...this.playerState });
    }
  }

  private updateCameraProjection(width: number, height: number) {
    if (!this.camera || height <= 0 || width <= 0) return;
    const aspect = width / height;
    this.camera.aspect = aspect;

    if (aspect < 0.6) {
      // Tall narrow portrait phone (e.g. 9:19.5, 9:20, 9:21, modern Galaxy & iPhone)
      this.baseFov = 78;
      this.baseCamZOffset = 8.4;
      this.baseCamYOffset = 5.6;
      this.baseLookAtY = 2.4;
    } else if (aspect < 0.85) {
      // Standard mobile portrait (9:16)
      this.baseFov = 74;
      this.baseCamZOffset = 7.8;
      this.baseCamYOffset = 5.2;
      this.baseLookAtY = 2.2;
    } else if (aspect < 1.25) {
      // Tablet portrait / iPad / Square
      this.baseFov = 68;
      this.baseCamZOffset = 7.2;
      this.baseCamYOffset = 5.0;
      this.baseLookAtY = 2.1;
    } else if (aspect > 2.0) {
      // Ultrawide displays
      this.baseFov = 60;
      this.baseCamZOffset = 6.4;
      this.baseCamYOffset = 4.6;
      this.baseLookAtY = 1.9;
    } else {
      // Standard landscape desktop / laptop (16:9, 16:10)
      this.baseFov = 64;
      this.baseCamZOffset = 6.8;
      this.baseCamYOffset = 4.8;
      this.baseLookAtY = 2.0;
    }
    this.camera.fov = this.baseFov;
    if (!this.isPlayingGame && !this.isIntro) {
      this.camera.position.set(0, this.baseCamYOffset, this.baseCamZOffset);
    }
    this.camera.updateProjectionMatrix();
  }

  private onResize = () => {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (width === this.lastWidth && height === this.lastHeight) return;
    this.lastWidth = width;
    this.lastHeight = height;

    this.updateCameraProjection(width, height);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  };

  public reset(seed: number = Date.now()) {
    this.prng = createPRNG(seed);
    this.isPlayingGame = true;

    // Clear obstacles and items
    this.obstacles.forEach(o => { if (o.mesh) this.scene.remove(o.mesh); });
    this.items.forEach(it => { if (it.mesh) this.scene.remove(it.mesh); });
    this.obstacles = [];
    this.items = [];

    this.sessionRunTime = 0;
    this.playedStartAudio = false;
    this.lastGoldenAppleZ = -999;
    this.lastTrolleySoundZ = 0;

    // Reset player state (preserving active skin)
    const currentSkin = this.playerState.skin || 'steve';
    this.playerState = {
      lane: 0,
      x: 0,
      y: 0,
      z: 0,
      isJumping: false,
      isSliding: false,
      isDiving: false,
      jumpVelocity: 0,
      distance: 0,
      score: 0,
      coins: 0,
      multiplier: 1,
      invincibleTimer: 0,
      magnetTimer: 0,
      isDead: false,
      causeOfDeath: '',
      chaserDistance: 3.6,
      nearMissCount: 0,
      comboStreak: 0,
      currentZone: 'Overworld Ravine',
      skin: currentSkin,
    };

    // CRITICAL: Reset track tiles back to origin so the canyon is always fully present on each run/turn!
    this.trackTiles.forEach((tile, i) => {
      tile.position.z = -i * this.tileLength;
    });

    if (this.cloudsGroup) {
      this.cloudsGroup.children.forEach((c, i) => {
        c.position.set(
          (Math.random() - 0.5) * 65,
          26 + (i % 3) * 3,
          -i * 35 - 10
        );
      });
    }

    if (this.sunLight) {
      this.sunLight.position.set(25, 45, 20);
      this.sunLight.target.position.set(0, 0, -6);
      this.sunLight.target.updateMatrixWorld();
    }

    this.targetX = 0;
    this.speed = this.baseSpeed;
    this.lastSpawnZ = -30;

    this.populateInitialObstacles();

    // Replay opening cave mining cutscene
    this.setupIntro();
  }

  public setOnNearMiss(cb: (streak: number) => void) {
    this.onNearMissCallback = cb;
  }

  public setSkin(skin: RunnerSkin) {
    this.playerState.skin = skin;
    const oldPos = this.playerGroup.position.clone();
    const oldRot = this.playerGroup.rotation.clone();
    this.scene.remove(this.playerGroup);
    this.playerLimbs = buildMinecraftCharacter(skin);
    this.playerGroup = this.playerLimbs.group;
    this.playerGroup.position.copy(oldPos);
    this.playerGroup.rotation.copy(oldRot);
    this.scene.add(this.playerGroup);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
