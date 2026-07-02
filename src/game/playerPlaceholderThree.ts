import * as THREE from 'three';

import type { FallbackRigDefinition } from '../types';
import { disposeObjectTree } from './threeDisposal';

export interface ThreePlaceholderRig {
  dispose: () => void;
  group: THREE.Group;
  setMotion: (time: number, lateralBias: number) => void;
}

interface ThreePlaceholderConfig {
  rig: FallbackRigDefinition;
  accentColor?: THREE.Color;
  mode: 'ps1' | 'aaa';
}

export function createThreePlaceholderRig({
  rig,
  accentColor,
  mode,
}: ThreePlaceholderConfig): ThreePlaceholderRig {
  const group = new THREE.Group();
  group.name = 'pc-placeholder-rig';

  const baseColor = new THREE.Color(rig.colors.base);
  const trimColor = accentColor?.clone() ?? new THREE.Color(rig.colors.trim);
  const accent = new THREE.Color(rig.colors.accent);
  const outline = new THREE.Color(rig.colors.outline);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: mode === 'aaa' ? outline.clone().multiplyScalar(0.2) : outline.clone().multiplyScalar(0.08),
    emissiveIntensity: mode === 'aaa' ? 0.5 : 0.3,
    flatShading: mode === 'ps1',
    metalness: mode === 'aaa' ? 0.48 : 0.08,
    roughness: mode === 'aaa' ? 0.24 : 0.82,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: trimColor,
    emissive: trimColor,
    emissiveIntensity: mode === 'aaa' ? 0.85 : 0.45,
    flatShading: mode === 'ps1',
    metalness: mode === 'aaa' ? 0.55 : 0.12,
    roughness: mode === 'aaa' ? 0.2 : 0.72,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: mode === 'aaa' ? 0.92 : 0.52,
    flatShading: mode === 'ps1',
    metalness: mode === 'aaa' ? 0.38 : 0.08,
    roughness: mode === 'aaa' ? 0.18 : 0.7,
  });

  const torso = new THREE.Mesh(
    mode === 'aaa' ? new THREE.CapsuleGeometry(0.62, 1.2, 8, 16) : new THREE.BoxGeometry(1.3, 1.8, 0.85),
    bodyMaterial,
  );
  torso.name = 'pc-torso';
  torso.position.y = mode === 'aaa' ? 1.6 : 1.3;
  group.add(torso);

  const head = new THREE.Mesh(
    mode === 'aaa' ? new THREE.SphereGeometry(0.48, 18, 18) : new THREE.BoxGeometry(0.92, 0.92, 0.92),
    trimMaterial,
  );
  head.name = 'pc-head';
  head.position.y = mode === 'aaa' ? 2.82 : 2.55;
  group.add(head);

  const shoulders = new THREE.Mesh(
    mode === 'aaa' ? new THREE.BoxGeometry(1.75, 0.38, 0.7) : new THREE.BoxGeometry(1.55, 0.26, 0.58),
    accentMaterial,
  );
  shoulders.name = 'pc-shoulders';
  shoulders.position.y = mode === 'aaa' ? 2.08 : 1.84;
  group.add(shoulders);

  const leftArm = new THREE.Mesh(
    mode === 'aaa' ? new THREE.CylinderGeometry(0.16, 0.2, 1.08, 12) : new THREE.BoxGeometry(0.35, 1.15, 0.35),
    trimMaterial,
  );
  leftArm.name = 'pc-arm-left';
  leftArm.position.set(mode === 'aaa' ? -0.98 : -0.95, mode === 'aaa' ? 1.62 : 1.4, 0);
  leftArm.rotation.z = 0.28;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.name = 'pc-arm-right';
  rightArm.position.x = mode === 'aaa' ? 0.98 : 0.95;
  rightArm.rotation.z = -0.28;
  group.add(rightArm);

  const leftLeg = new THREE.Mesh(
    mode === 'aaa' ? new THREE.CylinderGeometry(0.22, 0.28, 1.3, 14) : new THREE.BoxGeometry(0.4, 1.1, 0.4),
    trimMaterial,
  );
  leftLeg.name = 'pc-leg-left';
  leftLeg.position.set(mode === 'aaa' ? -0.33 : -0.35, mode === 'aaa' ? 0.55 : 0.35, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.name = 'pc-leg-right';
  rightLeg.position.x = mode === 'aaa' ? 0.33 : 0.35;
  group.add(rightLeg);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(mode === 'aaa' ? 0.74 : 0.62, mode === 'aaa' ? 0.14 : 0.12, 0.16),
    accentMaterial,
  );
  visor.name = 'pc-visor';
  visor.position.set(0, mode === 'aaa' ? 2.8 : 2.55, mode === 'aaa' ? 0.42 : 0.5);
  group.add(visor);

  const sockets: THREE.Mesh[] = [
    new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), trimMaterial),
    new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), accentMaterial),
    new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), accentMaterial),
  ];
  sockets[0].name = 'pc-socket-one';
  sockets[0].position.set(0, mode === 'aaa' ? 1.58 : 1.28, 0.55);
  sockets[1].name = 'pc-socket-two';
  sockets[1].position.set(mode === 'aaa' ? -0.46 : -0.4, mode === 'aaa' ? 1.92 : 1.62, 0.44);
  sockets[2].name = 'pc-socket-three';
  sockets[2].position.set(mode === 'aaa' ? 0.44 : 0.38, mode === 'aaa' ? 0.9 : 0.78, 0.38);
  sockets.forEach((socket) => group.add(socket));

  if (mode === 'aaa') {
    const booster = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 12), trimMaterial);
    booster.name = 'pc-booster-left';
    booster.position.set(-0.38, 0.08, -0.2);
    booster.rotation.x = Math.PI;
    group.add(booster);

    const secondBooster = booster.clone();
    secondBooster.name = 'pc-booster-right';
    secondBooster.position.x = 0.38;
    group.add(secondBooster);
  }

  const setMotion = (time: number, lateralBias: number): void => {
    const bob = Math.sin(time * (mode === 'aaa' ? 5 : 6)) * (mode === 'aaa' ? 0.04 : 0.03);
    const lean = THREE.MathUtils.clamp(lateralBias * 0.22, -0.32, 0.32);

    torso.rotation.z = -lean * 0.6;
    head.position.y = (mode === 'aaa' ? 2.82 : 2.55) + bob;
    leftArm.rotation.z = 0.28 - lean * 0.7 + bob * 0.8;
    rightArm.rotation.z = -0.28 - lean * 0.7 - bob * 0.8;
    leftLeg.position.y = (mode === 'aaa' ? 0.55 : 0.35) + bob * 0.8;
    rightLeg.position.y = (mode === 'aaa' ? 0.55 : 0.35) - bob * 0.8;
    shoulders.rotation.z = -lean * 0.4;
  };

  return {
    dispose: () => {
      disposeObjectTree(group);
    },
    group,
    setMotion,
  };
}
