import * as THREE from 'three';
import { RunnerSkin } from './types.ts';

// Procedural texture helper for clean, vibrant voxel materials
export function createBlockMaterial(
  color: number,
  emissive: number = 0,
  opacity: number = 1,
  emissiveIntensity: number = 1
): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    emissive,
    emissiveIntensity,
    transparent: opacity < 1,
    opacity,
    flatShading: true,
  });
}

/**
 * Builds Adventurer Character with selectable skins:
 * - 'steve': Iconic cyan shirt & blue jeans
 * - 'diamond': Enchanted diamond armor with cyan gleam
 * - 'nether': Obsidian netherite combat suit with fiery magma trim
 * - 'gold': 24K Gold armor with glowing gold accents
 */
export function buildMinecraftCharacter(skin: RunnerSkin = 'steve'): {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  body: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Vibrant adventurer materials according to selected skin
  let skinMat = createBlockMaterial(0xd29d72);
  let hairMat = createBlockMaterial(0x4a2e12);
  let shirtMat = createBlockMaterial(0x00a8a8); // Iconic Minecraft Teal/Cyan
  let collarMat = createBlockMaterial(0xd29d72);
  let pantsMat = createBlockMaterial(0x1e3a8a); // Rich Dark Blue Jeans
  let bootMat = createBlockMaterial(0x3e2723); // Leather boots
  let eyeWhiteMat = createBlockMaterial(0xffffff);
  let eyeBlueMat = createBlockMaterial(0x2563eb);
  let beltMat = createBlockMaterial(0x2d1810);
  let buckleMat = createBlockMaterial(0xfbbf24);

  if (skin === 'diamond') {
    shirtMat = createBlockMaterial(0x38bdf8, 0x0284c7, 1.0, 0.4);
    pantsMat = createBlockMaterial(0x0284c7);
    bootMat = createBlockMaterial(0x0369a1);
    hairMat = createBlockMaterial(0x0284c7);
    collarMat = createBlockMaterial(0x38bdf8);
    buckleMat = createBlockMaterial(0xbae6fd, 0x38bdf8, 1.0, 0.6);
  } else if (skin === 'nether') {
    shirtMat = createBlockMaterial(0x1e293b, 0xe11d48, 1.0, 0.25);
    pantsMat = createBlockMaterial(0x0f172a);
    bootMat = createBlockMaterial(0x991b1b);
    hairMat = createBlockMaterial(0x18181b);
    collarMat = createBlockMaterial(0xf97316);
    buckleMat = createBlockMaterial(0xf97316, 0xe11d48, 1.0, 1.0);
    eyeBlueMat = createBlockMaterial(0xf97316);
  } else if (skin === 'gold') {
    shirtMat = createBlockMaterial(0xfbbf24, 0xb45309, 1.0, 0.35);
    pantsMat = createBlockMaterial(0xd97706);
    bootMat = createBlockMaterial(0x78350f);
    hairMat = createBlockMaterial(0xf59e0b);
    collarMat = createBlockMaterial(0xfde047);
    buckleMat = createBlockMaterial(0xffffff, 0xfde047, 1.0, 0.8);
  }

  // 1. Torso: Steve's Teal Shirt with collar & adventurer belt
  const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.44);
  const body = new THREE.Mesh(bodyGeo, shirtMat);
  body.position.y = 1.4;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Skin collar cut-out on chest
  const collarGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 1.88, 0.22);
  group.add(collar);

  // Belt
  const beltGeo = new THREE.BoxGeometry(0.82, 0.14, 0.46);
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.set(0, 0.88, 0);
  group.add(belt);

  // Belt Buckle
  const buckleGeo = new THREE.BoxGeometry(0.2, 0.16, 0.48);
  const buckle = new THREE.Mesh(buckleGeo, buckleMat);
  buckle.position.set(0, 0.88, 0);
  group.add(buckle);

  // 2. Head
  const headGroup = new THREE.Group();
  headGroup.position.y = 2.0;

  const headGeo = new THREE.BoxGeometry(0.76, 0.76, 0.76);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.38;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Steve's Hair (Top, Back, Sides)
  const hairGeo = new THREE.BoxGeometry(0.8, 0.24, 0.8);
  const hairTop = new THREE.Mesh(hairGeo, hairMat);
  hairTop.position.y = 0.68;
  headGroup.add(hairTop);

  const hairBackGeo = new THREE.BoxGeometry(0.8, 0.5, 0.2);
  const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
  hairBack.position.set(0, 0.45, -0.32);
  headGroup.add(hairBack);

  // Eyes (Left & Right)
  const eyeWhiteGeo = new THREE.BoxGeometry(0.12, 0.08, 0.02);
  const eyeBlueGeo = new THREE.BoxGeometry(0.06, 0.08, 0.03);

  // Left Eye
  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  leftEyeWhite.position.set(-0.2, 0.38, 0.39);
  headGroup.add(leftEyeWhite);
  const leftEyeBlue = new THREE.Mesh(eyeBlueGeo, eyeBlueMat);
  leftEyeBlue.position.set(-0.17, 0.38, 0.40);
  headGroup.add(leftEyeBlue);

  // Right Eye
  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  rightEyeWhite.position.set(0.2, 0.38, 0.39);
  headGroup.add(rightEyeWhite);
  const rightEyeBlue = new THREE.Mesh(eyeBlueGeo, eyeBlueMat);
  rightEyeBlue.position.set(0.17, 0.38, 0.40);
  headGroup.add(rightEyeBlue);

  // Nose / Mouth
  const noseGeo = new THREE.BoxGeometry(0.14, 0.08, 0.02);
  const nose = new THREE.Mesh(noseGeo, hairMat);
  nose.position.set(0, 0.26, 0.39);
  headGroup.add(nose);

  group.add(headGroup);

  // 3. Left Arm
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.6, 1.9, 0);

  const leftSleeveGeo = new THREE.BoxGeometry(0.38, 0.4, 0.38);
  const leftSleeve = new THREE.Mesh(leftSleeveGeo, shirtMat);
  leftSleeve.position.y = -0.2;
  leftArm.add(leftSleeve);

  const leftSkinGeo = new THREE.BoxGeometry(0.36, 0.7, 0.36);
  const leftArmSkin = new THREE.Mesh(leftSkinGeo, skinMat);
  leftArmSkin.position.y = -0.7;
  leftArmSkin.castShadow = true;
  leftArm.add(leftArmSkin);
  group.add(leftArm);

  // 4. Right Arm
  const rightArm = new THREE.Group();
  rightArm.position.set(0.6, 1.9, 0);

  const rightSleeve = new THREE.Mesh(leftSleeveGeo, shirtMat);
  rightSleeve.position.y = -0.2;
  rightArm.add(rightSleeve);

  const rightArmSkin = new THREE.Mesh(leftSkinGeo, skinMat);
  rightArmSkin.position.y = -0.7;
  rightArmSkin.castShadow = true;
  rightArm.add(rightArmSkin);
  group.add(rightArm);

  // 5. Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.22, 0.8, 0);

  const leftPantsGeo = new THREE.BoxGeometry(0.38, 0.6, 0.38);
  const leftPants = new THREE.Mesh(leftPantsGeo, pantsMat);
  leftPants.position.y = -0.3;
  leftPants.castShadow = true;
  leftLeg.add(leftPants);

  const leftBootGeo = new THREE.BoxGeometry(0.4, 0.26, 0.42);
  const leftBoot = new THREE.Mesh(leftBootGeo, bootMat);
  leftBoot.position.set(0, -0.68, 0.02);
  leftLeg.add(leftBoot);
  group.add(leftLeg);

  // 6. Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.22, 0.8, 0);

  const rightPants = new THREE.Mesh(leftPantsGeo, pantsMat);
  rightPants.position.y = -0.3;
  rightPants.castShadow = true;
  rightLeg.add(rightPants);

  const rightBoot = new THREE.Mesh(leftBootGeo, bootMat);
  rightBoot.position.set(0, -0.68, 0.02);
  rightLeg.add(rightBoot);
  group.add(rightLeg);

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    head: headGroup,
    body,
  };
}

/**
 * Builds Subway Surfers Style Ghost Policeman (Inspector Chaser)
 * Minecraft-style railway police guard with navy uniform, golden badge,
 * peaked officer cap, and a single flashing beacon.
 */
export function buildGhostPoliceman(): {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  policeLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  const suitMat = createBlockMaterial(0x1e293b); // Navy police coat
  const goldMat = createBlockMaterial(0xfbbf24);
  const ghostSkinMat = createBlockMaterial(0x94a3b8, 0x1e293b, 0.95);
  const capMat = createBlockMaterial(0x0f172a);
  const whiteMat = createBlockMaterial(0xf8fafc);

  // Torso
  const bodyGeo = new THREE.BoxGeometry(1.0, 1.35, 0.55);
  const body = new THREE.Mesh(bodyGeo, suitMat);
  body.position.y = 1.35;
  group.add(body);

  // Gold Badge on left chest
  const badgeGeo = new THREE.BoxGeometry(0.18, 0.22, 0.05);
  const badge = new THREE.Mesh(badgeGeo, goldMat);
  badge.position.set(-0.25, 1.55, 0.3);
  group.add(badge);

  // White Shirt Collar & Tie
  const collarGeo = new THREE.BoxGeometry(0.26, 0.16, 0.04);
  const collar = new THREE.Mesh(collarGeo, whiteMat);
  collar.position.set(0, 1.88, 0.29);
  group.add(collar);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.y = 2.05;

  const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const headMesh = new THREE.Mesh(headGeo, ghostSkinMat);
  headMesh.position.y = 0.4;
  headGroup.add(headMesh);

  // Officer Peaked Cap
  const capGeo = new THREE.BoxGeometry(0.9, 0.24, 0.9);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.8;
  headGroup.add(cap);

  const visorGeo = new THREE.BoxGeometry(0.85, 0.06, 0.35);
  const visor = new THREE.Mesh(visorGeo, capMat);
  visor.position.set(0, 0.72, 0.48);
  headGroup.add(visor);

  const capBadgeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.04);
  const capBadge = new THREE.Mesh(capBadgeGeo, goldMat);
  capBadge.position.set(0, 0.82, 0.48);
  headGroup.add(capBadge);

  // Glowing Eyes
  const eyeMat = createBlockMaterial(0xff3333, 0xff0000, 1.0, 1.5);
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.04);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.2, 0.4, 0.41);
  headGroup.add(eyeL);

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.2, 0.4, 0.41);
  headGroup.add(eyeR);

  // Single police beacon light on cap (low intensity, performant)
  const policeLight = new THREE.PointLight(0xff0033, 1.5, 12);
  policeLight.position.set(0, 1.0, 0.2);
  headGroup.add(policeLight);

  group.add(headGroup);

  // Left Arm (extended forward reaching)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.7, 1.85, 0);
  const armGeo = new THREE.BoxGeometry(0.42, 1.15, 0.42);
  const armL = new THREE.Mesh(armGeo, suitMat);
  armL.position.y = -0.55;
  leftArm.add(armL);
  group.add(leftArm);

  // Right Arm
  const rightArm = new THREE.Group();
  rightArm.position.set(0.7, 1.85, 0);
  const armR = new THREE.Mesh(armGeo, suitMat);
  armR.position.y = -0.55;
  rightArm.add(armR);
  group.add(rightArm);

  // Lower coat / legs
  const legGeo = new THREE.BoxGeometry(0.45, 0.75, 0.45);
  const legL = new THREE.Mesh(legGeo, suitMat);
  legL.position.set(-0.26, 0.38, 0);
  group.add(legL);

  const legR = new THREE.Mesh(legGeo, suitMat);
  legR.position.set(0.26, 0.38, 0);
  group.add(legR);

  return {
    group,
    leftArm,
    rightArm,
    head: headGroup,
    policeLight,
  };
}

export interface GhostDogLimbs {
  group: THREE.Group;
  frontLeftLeg: THREE.Group;
  frontRightLeg: THREE.Group;
  backLeftLeg: THREE.Group;
  backRightLeg: THREE.Group;
  tail: THREE.Group;
  jaw: THREE.Group;
}

/**
 * Builds Guard Hound / Police Dog (Inspector's Hound)
 */
export function buildGhostDog(): GhostDogLimbs {
  const group = new THREE.Group();

  const furMat = createBlockMaterial(0x8d6e63);
  const darkFurMat = createBlockMaterial(0x5d4037);
  const collarMat = createBlockMaterial(0xef4444); // Bright red collar
  const noseMat = createBlockMaterial(0x1e293b);

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.5, 0.5, 0.95);
  const body = new THREE.Mesh(bodyGeo, furMat);
  body.position.set(0, 0.55, 0);
  group.add(body);

  // Red Collar
  const collarGeo = new THREE.BoxGeometry(0.54, 0.54, 0.14);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 0.55, -0.42);
  group.add(collar);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.75, -0.6);

  const headGeo = new THREE.BoxGeometry(0.48, 0.45, 0.48);
  const head = new THREE.Mesh(headGeo, furMat);
  headGroup.add(head);

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.28, 0.22, 0.3);
  const snout = new THREE.Mesh(snoutGeo, darkFurMat);
  snout.position.set(0, -0.08, -0.32);
  headGroup.add(snout);

  const noseGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 0.02, -0.48);
  headGroup.add(nose);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.12, 0.2, 0.14);
  const earL = new THREE.Mesh(earGeo, darkFurMat);
  earL.position.set(-0.2, 0.3, 0);
  headGroup.add(earL);

  const earR = new THREE.Mesh(earGeo, darkFurMat);
  earR.position.set(0.2, 0.3, 0);
  headGroup.add(earR);

  // Jaw
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.18, -0.15);
  const jawMesh = new THREE.Mesh(snoutGeo, darkFurMat);
  jawMesh.position.set(0, 0, -0.15);
  jaw.add(jawMesh);
  headGroup.add(jaw);

  group.add(headGroup);

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);

  const frontLeftLeg = new THREE.Group();
  frontLeftLeg.position.set(-0.2, 0.4, -0.35);
  const fL = new THREE.Mesh(legGeo, darkFurMat);
  fL.position.y = -0.22;
  frontLeftLeg.add(fL);
  group.add(frontLeftLeg);

  const frontRightLeg = new THREE.Group();
  frontRightLeg.position.set(0.2, 0.4, -0.35);
  const fR = new THREE.Mesh(legGeo, darkFurMat);
  fR.position.y = -0.22;
  frontRightLeg.add(fR);
  group.add(frontRightLeg);

  const backLeftLeg = new THREE.Group();
  backLeftLeg.position.set(-0.2, 0.4, 0.35);
  const bL = new THREE.Mesh(legGeo, darkFurMat);
  bL.position.y = -0.22;
  backLeftLeg.add(bL);
  group.add(backLeftLeg);

  const backRightLeg = new THREE.Group();
  backRightLeg.position.set(0.2, 0.4, 0.35);
  const bR = new THREE.Mesh(legGeo, darkFurMat);
  bR.position.y = -0.22;
  backRightLeg.add(bR);
  group.add(backRightLeg);

  // Tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.7, 0.48);
  const tailGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
  const tailMesh = new THREE.Mesh(tailGeo, furMat);
  tailMesh.position.set(0, 0.15, 0.1);
  tailMesh.rotation.x = Math.PI / 4;
  tail.add(tailMesh);
  group.add(tail);

  return {
    group,
    frontLeftLeg,
    frontRightLeg,
    backLeftLeg,
    backRightLeg,
    tail,
    jaw,
  };
}

/**
 * Builds RUNAWAY MINECART OBSTACLE (Train on track)
 * Massive visual danger: Dark heavy iron chassis, high-contrast YELLOW & BLACK HAZARD CHEVRONS,
 * bright RED WARNING LANTERNS, and loaded with explosive RED TNT BLOCKS with white fuses!
 * Immediately distinguishable from miles away as a lethal threat!
 */
let minecartTemplate: THREE.Group | null = null;
export function buildMinecart(): THREE.Group {
  if (minecartTemplate) return minecartTemplate.clone(true);

  const group = new THREE.Group();

  const ironMat = createBlockMaterial(0x334155); // Dark steel / cast iron
  const wheelMat = createBlockMaterial(0x1e293b);
  const hazardYellowMat = createBlockMaterial(0xfacc15); // Caution yellow
  const hazardBlackMat = createBlockMaterial(0x0f172a); // Caution black
  const tntRedMat = createBlockMaterial(0xdc2626); // Explosive TNT Red
  const tntBandMat = createBlockMaterial(0xf8fafc); // TNT white text band
  const warningRedMat = createBlockMaterial(0xef4444, 0xff0000, 1.0, 1.8);

  // Cart Basin Base
  const baseGeo = new THREE.BoxGeometry(1.4, 0.18, 1.9);
  const base = new THREE.Mesh(baseGeo, ironMat);
  base.position.y = 0.32;
  base.castShadow = true;
  group.add(base);

  // 4 Sturdy Iron Walls
  const frontWallGeo = new THREE.BoxGeometry(1.4, 0.7, 0.12);
  const frontWall = new THREE.Mesh(frontWallGeo, ironMat);
  frontWall.position.set(0, 0.7, 0.9);
  group.add(frontWall);

  const backWall = new THREE.Mesh(frontWallGeo, ironMat);
  backWall.position.set(0, 0.7, -0.9);
  group.add(backWall);

  const sideWallGeo = new THREE.BoxGeometry(0.12, 0.7, 1.9);
  const leftWall = new THREE.Mesh(sideWallGeo, ironMat);
  leftWall.position.set(-0.65, 0.7, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, ironMat);
  rightWall.position.set(0.65, 0.7, 0);
  group.add(rightWall);

  // HIGH-CONTRAST HAZARD CHEVRON STRIPES ON THE FRONT
  const chevronGeo = new THREE.BoxGeometry(0.24, 0.55, 0.04);
  for (let c = -2; c <= 2; c++) {
    const mat = c % 2 === 0 ? hazardYellowMat : hazardBlackMat;
    const stripe = new THREE.Mesh(chevronGeo, mat);
    stripe.position.set(c * 0.25, 0.7, 0.98);
    group.add(stripe);
  }

  // 4 Cast Iron Flanged Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12);
  const wPositions = [
    [-0.72, 0.24, 0.6],
    [-0.72, 0.24, -0.6],
    [0.72, 0.24, 0.6],
    [0.72, 0.24, -0.6],
  ];
  wPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    group.add(wheel);
  });

  // Stack of DANGEROUS TNT BLOCKS inside cart!
  const tntGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const tntBandGeo = new THREE.BoxGeometry(0.57, 0.18, 0.57);

  const tntPositions = [
    [-0.28, 0.8, 0.3],
    [0.28, 0.8, 0.3],
    [0, 0.8, -0.35],
    [0, 1.25, 0], // Top center stack
  ];

  tntPositions.forEach(([tx, ty, tz]) => {
    const tnt = new THREE.Mesh(tntGeo, tntRedMat);
    tnt.position.set(tx, ty, tz);
    group.add(tnt);

    const band = new THREE.Mesh(tntBandGeo, tntBandMat);
    band.position.set(tx, ty, tz);
    group.add(band);
  });

  // Dual Glowing Red Warning Headlights on front
  const lightGeo = new THREE.BoxGeometry(0.26, 0.2, 0.1);
  const hl1 = new THREE.Mesh(lightGeo, warningRedMat);
  hl1.position.set(-0.45, 0.85, 1.02);
  group.add(hl1);

  const hl2 = new THREE.Mesh(lightGeo, warningRedMat);
  hl2.position.set(0.45, 0.85, 1.02);
  group.add(hl2);

  minecartTemplate = group;
  return group.clone(true);
}

/**
 * Builds JUMP HURDLE OBSTACLE (Low spiked barrier - JUMP OVER)
 * Rugged wooden roadblock with pointed warning spikes and bright CAUTION REFLECTOR.
 * Clear, ground-bound hazard that signals: "JUMP OVER ME!"
 */
let rockObstacleTemplate: THREE.Group | null = null;
export function buildRockObstacle(): THREE.Group {
  if (rockObstacleTemplate) return rockObstacleTemplate.clone(true);

  const group = new THREE.Group();

  const woodMat = createBlockMaterial(0x5c3d24); // Dark Oak
  const stoneMat = createBlockMaterial(0x78716c); // Heavy stone
  const cautionYellowMat = createBlockMaterial(0xfacc15); // Caution yellow
  const cautionBlackMat = createBlockMaterial(0x18181b); // Caution black
  const spikeMat = createBlockMaterial(0x713f12); // Sharp timber spikes

  // Heavy Stone Foundation Blocks (Left & Right)
  const baseGeo = new THREE.BoxGeometry(0.4, 0.45, 1.2);
  const leftBase = new THREE.Mesh(baseGeo, stoneMat);
  leftBase.position.set(-0.7, 0.22, 0);
  leftBase.castShadow = true;
  group.add(leftBase);

  const rightBase = new THREE.Mesh(baseGeo, stoneMat);
  rightBase.position.set(0.7, 0.22, 0);
  rightBase.castShadow = true;
  group.add(rightBase);

  // Main Timber Hurdle Crossbar
  const barGeo = new THREE.BoxGeometry(1.65, 0.45, 0.35);
  const bar = new THREE.Mesh(barGeo, woodMat);
  bar.position.set(0, 0.65, 0);
  bar.castShadow = true;
  group.add(bar);

  // High-Contrast Diagonal CAUTION STRIP across front
  const stripeGeo = new THREE.BoxGeometry(0.22, 0.38, 0.04);
  for (let s = -3; s <= 3; s++) {
    const mat = Math.abs(s) % 2 === 0 ? cautionYellowMat : cautionBlackMat;
    const stripe = new THREE.Mesh(stripeGeo, mat);
    stripe.position.set(s * 0.22, 0.65, 0.2);
    group.add(stripe);
  }

  // Row of 4 Sharp Wooden Spikes on top (Tells player: Do NOT touch top, jump cleanly!)
  const spikeGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
  for (let sp = -3; sp <= 3; sp += 2) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.set(sp * 0.25, 1.05, 0);
    group.add(spike);
  }

  rockObstacleTemplate = group;
  return group.clone(true);
}

/**
 * Builds SLIDE UNDER HURDLE (Overhead warning gate - MUST SLIDE / DUCK)
 * Subway Surfers style overhead rail signal / construction barricade.
 * High horizontal beam at Y=1.45 to 2.1m with BOLD RED & WHITE HAZARD CHEVRONS
 * and hanging "SLIDE ⬇" caution indicator.
 * Ground level has 1.15m clearance so ducking/sliding cleanly passes under!
 */
let ghostObstacleTemplate: THREE.Group | null = null;
export function buildGhostObstacle(): THREE.Group {
  if (ghostObstacleTemplate) return ghostObstacleTemplate.clone(true);

  const group = new THREE.Group();

  const steelMat = createBlockMaterial(0xd1d5db); // Galvanized steel
  const cautionRedMat = createBlockMaterial(0xdc2626); // High-viz Red
  const cautionWhiteMat = createBlockMaterial(0xffffff); // White
  const warningYellowMat = createBlockMaterial(0xfacc15);
  const darkMat = createBlockMaterial(0x18181b);

  // Left & Right Support Pylons (standing tall from ground up to 2.2m)
  const pylonGeo = new THREE.BoxGeometry(0.18, 2.3, 0.25);
  const pylonLeft = new THREE.Mesh(pylonGeo, steelMat);
  pylonLeft.position.set(-0.85, 1.15, 0);
  pylonLeft.castShadow = true;
  group.add(pylonLeft);

  const pylonRight = new THREE.Mesh(pylonGeo, steelMat);
  pylonRight.position.set(0.85, 1.15, 0);
  pylonRight.castShadow = true;
  group.add(pylonRight);

  // Red Warning Bands on pylons
  const bandGeo = new THREE.BoxGeometry(0.2, 0.25, 0.27);
  const bandL = new THREE.Mesh(bandGeo, cautionRedMat);
  bandL.position.set(-0.85, 0.7, 0);
  group.add(bandL);

  const bandR = new THREE.Mesh(bandGeo, cautionRedMat);
  bandR.position.set(0.85, 0.7, 0);
  group.add(bandR);

  // HIGH CROSSBEAM (Hanging at Y=1.55 to 2.15m)
  const crossbeamGeo = new THREE.BoxGeometry(1.85, 0.55, 0.28);
  const crossbeam = new THREE.Mesh(crossbeamGeo, darkMat);
  crossbeam.position.set(0, 1.85, 0);
  crossbeam.castShadow = true;
  group.add(crossbeam);

  // BOLD RED & WHITE DIAGONAL WARNING CHEVRONS across crossbeam face
  const chevronGeo = new THREE.BoxGeometry(0.25, 0.48, 0.04);
  for (let c = -3; c <= 3; c++) {
    const mat = Math.abs(c) % 2 === 0 ? cautionRedMat : cautionWhiteMat;
    const stripe = new THREE.Mesh(chevronGeo, mat);
    stripe.position.set(c * 0.25, 1.85, 0.16);
    group.add(stripe);
  }

  // Hanging "SLIDE ⬇" Warning Sign in center
  const signGeo = new THREE.BoxGeometry(0.65, 0.28, 0.06);
  const sign = new THREE.Mesh(signGeo, warningYellowMat);
  sign.position.set(0, 1.48, 0.16);
  group.add(sign);

  // Downward Black Arrow on sign
  const arrowStemGeo = new THREE.BoxGeometry(0.08, 0.12, 0.02);
  const arrowStem = new THREE.Mesh(arrowStemGeo, darkMat);
  arrowStem.position.set(0, 1.52, 0.2);
  group.add(arrowStem);

  const arrowHeadGeo = new THREE.ConeGeometry(0.12, 0.1, 3);
  const arrowHead = new THREE.Mesh(arrowHeadGeo, darkMat);
  arrowHead.rotation.z = Math.PI;
  arrowHead.position.set(0, 1.42, 0.2);
  group.add(arrowHead);

  ghostObstacleTemplate = group;
  return group.clone(true);
}

/**
 * Builds Minecraft Airborne Phantom (Air Obstacle)
 * Hovering mid-air predator with spread wings, segmented spine tail,
 * and piercing glowing green lime eyes.
 * Flying at mid-air height: players must slide/dive underneath or switch lanes!
 */
export function buildAerialPhantom(): THREE.Group {
  const group = new THREE.Group();

  const slateMat = createBlockMaterial(0x1e293b); // Dark navy indigo body
  const underMat = createBlockMaterial(0x334155); // Secondary membrane
  const eyeMat = createBlockMaterial(0x4ade80, 0x22c55e, 1.0, 2.8); // Glowing green eyes
  const talonMat = createBlockMaterial(0x94a3b8); // Sharp talons
  const spineMat = createBlockMaterial(0x475569); // Tail bones

  // 1. Central Torso Body
  const bodyGeo = new THREE.BoxGeometry(0.65, 0.35, 1.3);
  const body = new THREE.Mesh(bodyGeo, slateMat);
  body.castShadow = true;
  group.add(body);

  // Underbelly plate
  const underGeo = new THREE.BoxGeometry(0.55, 0.08, 1.1);
  const under = new THREE.Mesh(underGeo, underMat);
  under.position.set(0, -0.16, 0);
  group.add(under);

  // 2. Head
  const headGeo = new THREE.BoxGeometry(0.5, 0.3, 0.45);
  const head = new THREE.Mesh(headGeo, slateMat);
  head.position.set(0, 0.04, 0.8);
  head.castShadow = true;
  group.add(head);

  // Piercing Lime Eyes (Left & Right)
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.16, 0.06, 1.03);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.16, 0.06, 1.03);
  group.add(rightEye);

  // 3. Segmented Tail & Spines
  const tail1Geo = new THREE.BoxGeometry(0.35, 0.22, 0.5);
  const tail1 = new THREE.Mesh(tail1Geo, slateMat);
  tail1.position.set(0, 0.04, -0.85);
  group.add(tail1);

  const tail2Geo = new THREE.BoxGeometry(0.22, 0.16, 0.55);
  const tail2 = new THREE.Mesh(tail2Geo, spineMat);
  tail2.position.set(0, 0.02, -1.3);
  group.add(tail2);

  // 4. Wings (Wide wingspan with flapping pivots)
  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-0.32, 0.05, 0.1);

  const innerWingGeo = new THREE.BoxGeometry(0.75, 0.06, 0.85);
  const innerWingL = new THREE.Mesh(innerWingGeo, slateMat);
  innerWingL.position.set(-0.38, 0, 0);
  innerWingL.castShadow = true;
  leftWingGroup.add(innerWingL);

  const outerWingGeo = new THREE.BoxGeometry(0.65, 0.05, 0.65);
  const outerWingL = new THREE.Mesh(outerWingGeo, underMat);
  outerWingL.position.set(-0.95, -0.04, -0.05);
  outerWingL.castShadow = true;
  leftWingGroup.add(outerWingL);

  group.add(leftWingGroup);

  const rightWingGroup = new THREE.Group();
  rightWingGroup.position.set(0.32, 0.05, 0.1);

  const innerWingR = new THREE.Mesh(innerWingGeo, slateMat);
  innerWingR.position.set(0.38, 0, 0);
  innerWingR.castShadow = true;
  rightWingGroup.add(innerWingR);

  const outerWingR = new THREE.Mesh(outerWingGeo, underMat);
  outerWingR.position.set(0.95, -0.04, -0.05);
  outerWingR.castShadow = true;
  rightWingGroup.add(outerWingR);

  group.add(rightWingGroup);

  // 5. Claws / Talons (Hanging ready to strike mid-air runners)
  const talonGeo = new THREE.BoxGeometry(0.08, 0.32, 0.12);
  const talonL = new THREE.Mesh(talonGeo, talonMat);
  talonL.position.set(-0.2, -0.28, 0.2);
  group.add(talonL);

  const talonR = new THREE.Mesh(talonGeo, talonMat);
  talonR.position.set(0.2, -0.28, 0.2);
  group.add(talonR);

  // Store wing groups for flapping animation
  group.userData = {
    leftWing: leftWingGroup,
    rightWing: rightWingGroup,
  };

  return group;
}

/**
 * Builds Brilliant Minecraft Diamond (Collectible)
 * Brilliant, sparkling sky-blue & white faceted diamond.
 * Rotates smoothly in mid-air at 0.8m height.
 * Radically distinct from the heavy dark obstacles!
 */
let diamondTemplate: THREE.Group | null = null;
export function buildDiamond(): THREE.Group {
  if (diamondTemplate) return diamondTemplate.clone(true);

  const group = new THREE.Group();

  const diamondBlueMat = createBlockMaterial(0x38bdf8, 0x0284c7, 1.0, 1.2);
  const diamondFacetMat = createBlockMaterial(0xbae6fd, 0x38bdf8, 1.0, 1.5);
  const sparkleWhiteMat = createBlockMaterial(0xffffff, 0xffffff, 1.0, 2.0);

  // Main Faceted Diamond Octahedron
  const gemGeo = new THREE.OctahedronGeometry(0.38, 0);
  const gem = new THREE.Mesh(gemGeo, diamondBlueMat);
  gem.scale.set(1.0, 1.35, 0.85);
  gem.rotation.y = Math.PI / 4;
  group.add(gem);

  // Top Light Facet
  const topGeo = new THREE.OctahedronGeometry(0.25, 0);
  const topFacet = new THREE.Mesh(topGeo, diamondFacetMat);
  topFacet.scale.set(1.0, 1.25, 0.85);
  topFacet.position.y = 0.05;
  group.add(topFacet);

  // Center sparkling core
  const coreGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const core = new THREE.Mesh(coreGeo, sparkleWhiteMat);
  core.rotation.set(Math.PI / 4, Math.PI / 4, 0);
  group.add(core);

  diamondTemplate = group;
  return group.clone(true);
}

/**
 * Builds Golden Coin / Gold Ingot Collectible
 */
let goldNuggetTemplate: THREE.Group | null = null;
export function buildGoldNugget(): THREE.Group {
  if (goldNuggetTemplate) return goldNuggetTemplate.clone(true);

  const group = new THREE.Group();
  const goldMat = createBlockMaterial(0xfbbf24, 0xd97706, 1.0, 1.4);
  const edgeMat = createBlockMaterial(0xfef08a, 0xf59e0b, 1.0, 1.6);

  const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
  const coin = new THREE.Mesh(coinGeo, goldMat);
  coin.rotation.x = Math.PI / 2;
  group.add(coin);

  const starGeo = new THREE.BoxGeometry(0.16, 0.16, 0.1);
  const star = new THREE.Mesh(starGeo, edgeMat);
  star.rotation.z = Math.PI / 4;
  group.add(star);

  goldNuggetTemplate = group;
  return group.clone(true);
}

/**
 * Builds Enchanted Golden Apple Power-Up (Invincibility + Multiplier)
 * Gleaming 24K gold sphere with emerald leaf and shining golden halo ring.
 */
let goldenAppleTemplate: THREE.Group | null = null;
export function buildGoldenApple(): THREE.Group {
  if (goldenAppleTemplate) return goldenAppleTemplate.clone(true);

  const group = new THREE.Group();

  const goldMat = createBlockMaterial(0xfbbf24, 0xf59e0b, 1.0, 1.5);
  const leafMat = createBlockMaterial(0x22c55e);
  const stemMat = createBlockMaterial(0x78350f);
  const haloMat = createBlockMaterial(0xfef08a, 0xf59e0b, 0.85, 1.8);

  // Golden Apple Body
  const appleGeo = new THREE.SphereGeometry(0.38, 16, 16);
  const apple = new THREE.Mesh(appleGeo, goldMat);
  group.add(apple);

  // Brown Stem
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.set(0.02, 0.44, 0);
  stem.rotation.z = -0.2;
  group.add(stem);

  // Green Leaf
  const leafGeo = new THREE.BoxGeometry(0.16, 0.04, 0.12);
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0.14, 0.42, 0);
  leaf.rotation.z = 0.3;
  group.add(leaf);

  // Magical Golden Halo Ring
  const haloGeo = new THREE.TorusGeometry(0.56, 0.035, 6, 24);
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 3;
  group.add(halo);

  goldenAppleTemplate = group;
  return group.clone(true);
}

/**
 * Builds Iconic Redstone Horseshoe Magnet (Pulls Diamonds)
 * Classic bright red horseshoe body with shiny chrome tips.
 * Crystal clear visual identity!
 */
let redstoneCompassTemplate: THREE.Group | null = null;
export function buildRedstoneCompass(): THREE.Group {
  if (redstoneCompassTemplate) return redstoneCompassTemplate.clone(true);

  const group = new THREE.Group();

  const redMat = createBlockMaterial(0xdc2626, 0x991b1b, 1.0, 1.4);
  const chromeMat = createBlockMaterial(0xe2e8f0, 0x94a3b8, 1.0, 1.2);
  const sparkMat = createBlockMaterial(0x38bdf8, 0x0284c7, 1.0, 2.0);

  // Horseshoe curved base
  const archGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 12, 1, false, 0, Math.PI);
  const arch = new THREE.Mesh(archGeo, redMat);
  arch.rotation.z = Math.PI;
  arch.position.y = 0.15;
  group.add(arch);

  // Left & Right Red Prongs
  const prongGeo = new THREE.BoxGeometry(0.15, 0.35, 0.12);
  const prongL = new THREE.Mesh(prongGeo, redMat);
  prongL.position.set(-0.28, -0.05, 0);
  group.add(prongL);

  const prongR = new THREE.Mesh(prongGeo, redMat);
  prongR.position.set(0.28, -0.05, 0);
  group.add(prongR);

  // Silver Chrome Tips
  const tipGeo = new THREE.BoxGeometry(0.17, 0.12, 0.14);
  const tipL = new THREE.Mesh(tipGeo, chromeMat);
  tipL.position.set(-0.28, -0.28, 0);
  group.add(tipL);

  const tipR = new THREE.Mesh(tipGeo, chromeMat);
  tipR.position.set(0.28, -0.28, 0);
  group.add(tipR);

  // Center Magnetic Energy Spark
  const sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.set(0, -0.18, 0);
  group.add(spark);

  redstoneCompassTemplate = group;
  return group.clone(true);
}

export function buildMagnet(): THREE.Group {
  return buildRedstoneCompass();
}

/**
 * Builds Potion of Swiftness (Speed Boost)
 * Sparkling glass flask with bright bubbly amber/electric blue potion inside.
 */
let potionTemplate: THREE.Group | null = null;
export function buildPotionOfSwiftness(): THREE.Group {
  if (potionTemplate) return potionTemplate.clone(true);

  const group = new THREE.Group();

  const liquidMat = createBlockMaterial(0x0284c7, 0x38bdf8, 0.95, 1.6);
  const glassMat = createBlockMaterial(0xe0f2fe, 0xffffff, 0.75, 1.2);
  const corkMat = createBlockMaterial(0x78350f);

  // Glass Flask Base
  const flaskGeo = new THREE.CylinderGeometry(0.26, 0.32, 0.55, 12);
  const flask = new THREE.Mesh(flaskGeo, liquidMat);
  group.add(flask);

  // Outer Glass Rim
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.57, 12);
  const rim = new THREE.Mesh(rimGeo, glassMat);
  group.add(rim);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.22, 10);
  const neck = new THREE.Mesh(neckGeo, glassMat);
  neck.position.y = 0.36;
  group.add(neck);

  // Cork Stopper
  const corkGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.12, 8);
  const cork = new THREE.Mesh(corkGeo, corkMat);
  cork.position.y = 0.5;
  group.add(cork);

  potionTemplate = group;
  return group.clone(true);
}

/**
 * Builds Canyon Railway Timber Mine Arch (Spanning track)
 * Natural rustic dark oak timber beams with iron brackets.
 * High-performance: no dynamic point lights, crisp and clean.
 */
export function buildMineshaftArch(width = 16.0, height = 7.8): {
  group: THREE.Group;
  leftTorch: THREE.Group;
  rightTorch: THREE.Group;
} {
  const group = new THREE.Group();

  const woodMat = createBlockMaterial(0x451a03); // Dark Oak Beam
  const ironMat = createBlockMaterial(0x334155); // Iron support braces

  const halfWidth = width / 2;

  // Left Timber Column
  const colGeo = new THREE.BoxGeometry(0.85, height, 0.85);
  const leftCol = new THREE.Mesh(colGeo, woodMat);
  leftCol.position.set(-halfWidth, height / 2 - 0.2, 0);
  leftCol.castShadow = true;
  group.add(leftCol);

  // Right Timber Column
  const rightCol = new THREE.Mesh(colGeo, woodMat);
  rightCol.position.set(halfWidth, height / 2 - 0.2, 0);
  rightCol.castShadow = true;
  group.add(rightCol);

  // Top Timber Crossbeam
  const beamGeo = new THREE.BoxGeometry(width + 1.2, 0.85, 0.85);
  const beam = new THREE.Mesh(beamGeo, woodMat);
  beam.position.set(0, height - 0.35, 0);
  beam.castShadow = true;
  group.add(beam);

  // Left & Right Corner Brackets
  const bracketGeo = new THREE.BoxGeometry(0.4, 0.4, 0.9);
  const bL = new THREE.Mesh(bracketGeo, ironMat);
  bL.position.set(-halfWidth + 0.55, height - 0.9, 0);
  group.add(bL);

  const bR = new THREE.Mesh(bracketGeo, ironMat);
  bR.position.set(halfWidth - 0.55, height - 0.9, 0);
  group.add(bR);

  // Left & Right Torches
  const leftTorch = buildWallTorch('left');
  leftTorch.position.set(-halfWidth + 0.55, height * 0.55, 0);
  group.add(leftTorch);

  const rightTorch = buildWallTorch('right');
  rightTorch.position.set(halfWidth - 0.55, height * 0.55, 0);
  group.add(rightTorch);

  return {
    group,
    leftTorch,
    rightTorch,
  };
}

/**
 * Builds Rustic Minecraft Wall Torch with glowing flame head
 */
export function buildWallTorch(_wallSide: 'left' | 'right' | 'front' = 'left'): THREE.Group {
  const torch = new THREE.Group();

  const stickMat = createBlockMaterial(0x5c3d24);
  const flameMat = createBlockMaterial(0xf59e0b, 0xfef08a, 1.0, 1.8);
  const coreMat = createBlockMaterial(0xffffff, 0xfbbf24, 1.0, 2.0);

  const stickGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);
  const stick = new THREE.Mesh(stickGeo, stickMat);
  stick.position.y = 0.1;
  torch.add(stick);

  const flameGeo = new THREE.BoxGeometry(0.2, 0.22, 0.2);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 0.48;
  torch.add(flame);

  const coreGeo = new THREE.BoxGeometry(0.1, 0.12, 0.1);
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.48;
  torch.add(core);

  return torch;
}

/**
 * Canyon Rock Stalactite / Hanging Redrock Spire
 */
export function buildStalactite(): THREE.Group {
  const group = new THREE.Group();
  const rockMat = createBlockMaterial(0x9a3412); // Redrock canyon tone
  const darkRockMat = createBlockMaterial(0x7c2d12);

  const baseGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
  const base = new THREE.Mesh(baseGeo, darkRockMat);
  group.add(base);

  const coneGeo = new THREE.ConeGeometry(0.55, 2.6, 5);
  const cone = new THREE.Mesh(coneGeo, rockMat);
  cone.rotation.x = Math.PI;
  cone.position.set(0, -1.3, 0);
  group.add(cone);

  return group;
}

/**
 * Natural Stone Ore Block with Sparkling Gem Veins
 */
export function buildOreBlock(oreType: 'diamond' | 'redstone' | 'gold' | 'emerald' = 'diamond'): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = createBlockMaterial(0x64748b); // Natural stone grey

  let gemColor = 0x38bdf8; // Diamond
  if (oreType === 'redstone') gemColor = 0xef4444;
  else if (oreType === 'gold') gemColor = 0xfbbf24;
  else if (oreType === 'emerald') gemColor = 0x10b981;

  const gemMat = createBlockMaterial(gemColor, gemColor, 1.0, 1.5);

  const blockGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const block = new THREE.Mesh(blockGeo, stoneMat);
  group.add(block);

  // Sparkling ore nuggets embedded
  const nugGeo = new THREE.BoxGeometry(0.24, 0.24, 0.08);
  const n1 = new THREE.Mesh(nugGeo, gemMat);
  n1.position.set(-0.25, 0.2, 0.51);
  group.add(n1);

  const n2 = new THREE.Mesh(nugGeo, gemMat);
  n2.position.set(0.25, -0.2, 0.51);
  group.add(n2);

  return group;
}

/**
 * Builds Adventurer Iron Pickaxe
 */
export function buildPickaxe(_type: string = 'iron'): THREE.Group {
  const pick = new THREE.Group();
  const woodMat = createBlockMaterial(0x78350f);
  const ironMat = createBlockMaterial(0x94a3b8);

  const handleGeo = new THREE.BoxGeometry(0.1, 1.1, 0.1);
  const handle = new THREE.Mesh(handleGeo, woodMat);
  handle.position.y = 0.55;
  pick.add(handle);

  const headGeo = new THREE.BoxGeometry(0.8, 0.16, 0.14);
  const head = new THREE.Mesh(headGeo, ironMat);
  head.position.y = 1.05;
  pick.add(head);

  return pick;
}

/**
 * Sea Lantern Light Block for Water Walk theme
 */
export function buildSeaLanternBlock(): THREE.Group {
  const group = new THREE.Group();
  const rimMat = createBlockMaterial(0x155e75);
  const glowMat = createBlockMaterial(0xa5f3fc, 0x06b6d4, 0.9, 1.6);

  const blockGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const core = new THREE.Mesh(blockGeo, glowMat);
  group.add(core);

  const rimGeo = new THREE.BoxGeometry(1.0, 0.1, 1.0);
  const rimTop = new THREE.Mesh(rimGeo, rimMat);
  rimTop.position.y = 0.45;
  group.add(rimTop);

  const rimBot = new THREE.Mesh(rimGeo, rimMat);
  rimBot.position.y = -0.45;
  group.add(rimBot);

  return group;
}

/**
 * Builds authentic cubic Minecraft voxel cloud for daylight open-sky canyon
 */
export function buildVoxelCloud(): THREE.Group {
  const cloud = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });

  // Flat puffy block clusters
  const parts = [
    { w: 14, h: 1.8, d: 8, x: 0, z: 0 },
    { w: 10, h: 1.8, d: 6, x: 5, z: -3 },
    { w: 8, h: 1.8, d: 6, x: -6, z: 2 },
    { w: 6, h: 1.8, d: 4, x: -2, z: -5 },
  ];

  parts.forEach((p) => {
    const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.position.set(p.x, 0, p.z);
    cloud.add(mesh);
  });

  return cloud;
}
