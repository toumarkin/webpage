import * as THREE from './vendor/three.module.js';

// Детерминированный random: при каждом заходе грид ломается одинаково.
let seed = 7;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export const rr = (a, b) => a + (b - a) * rnd();

// Плавный переход 0→1 между a и b.
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Кватернион из углов Эйлера.
export const E = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
