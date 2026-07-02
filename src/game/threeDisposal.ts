import * as THREE from 'three';

export function disposeObjectTree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((child) => {
    const geometry = getGeometry(child);
    if (geometry) {
      geometries.add(geometry);
    }

    const material = getMaterial(child);
    if (Array.isArray(material)) {
      material.forEach((entry) => materials.add(entry));
    } else if (material) {
      materials.add(material);
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function getGeometry(object: THREE.Object3D): THREE.BufferGeometry | undefined {
  if (!('geometry' in object)) {
    return undefined;
  }

  const geometry = (object as THREE.Object3D & { geometry?: unknown }).geometry;
  return geometry instanceof THREE.BufferGeometry ? geometry : undefined;
}

function getMaterial(object: THREE.Object3D): THREE.Material | THREE.Material[] | undefined {
  if (!('material' in object)) {
    return undefined;
  }

  const material = (object as THREE.Object3D & { material?: unknown }).material;
  if (material instanceof THREE.Material) {
    return material;
  }

  if (Array.isArray(material) && material.every((entry) => entry instanceof THREE.Material)) {
    return material;
  }

  return undefined;
}
