/**
 * Higgs-Field Particle Dynamic System
 * Simulates a quantum scalar particle field surrounding the DNA double-helix.
 * Reacts to mouse interaction, ambient quantum fluctuations, and shockwave pulses on automata state events.
 */

import * as THREE from "three";

export class HiggsFieldSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {number} particleCount
   */
  constructor(scene, particleCount = 1800) {
    this.scene = scene;
    this.particleCount = particleCount;
    this.particles = null;
    this.geometry = null;
    this.material = null;

    // Physics attributes
    this.positions = new Float32Array(particleCount * 3);
    this.velocities = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.basePositions = new Float32Array(particleCount * 3);
    this.originalColors = new Float32Array(particleCount * 3);

    // Dynamic state
    this.pulseEnergy = 0.0;
    this.pulseColor = new THREE.Color(0xc9d1d9); // Platinum silver baseline
    this.targetColor = new THREE.Color(0xc9d1d9);
    this.mouseTarget = new THREE.Vector3(0, 0, 0);

    this.init();
  }

  init() {
    this.geometry = new THREE.BufferGeometry();

    // Generate cylinder-volume particle cloud encapsulating the DNA helix
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Radius between 8 and 38 units from center Y-axis
      const radius = 8 + Math.random() * 32;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 160;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      // Small random drift velocity
      this.velocities[i3] = (Math.random() - 0.5) * 0.08;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.12;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.08;

      // Refined monochromatic laboratory luminescence (platinum to warm ivory)
      const lightness = 0.65 + Math.random() * 0.25;
      const col = new THREE.Color().setHSL(0.12, 0.08, lightness); // Subtle warm titanium

      this.colors[i3] = col.r;
      this.colors[i3 + 1] = col.g;
      this.colors[i3 + 2] = col.b;

      this.originalColors[i3] = col.r;
      this.originalColors[i3 + 1] = col.g;
      this.originalColors[i3 + 2] = col.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Particle texture generator (clean, crisp circular node without AI cyan blooming)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.3, 'rgba(209, 213, 219, 0.7)');
    gradient.addColorStop(0.7, 'rgba(148, 163, 184, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 1.8,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  /**
   * Triggers a high-energy excitation shockwave across the Higgs field
   * @param {"ACCEPT" | "MUTATION" | "IDLE"} eventType
   */
  triggerExcitation(eventType) {
    this.pulseEnergy = 1.0;
    if (eventType === "ACCEPT") {
      this.targetColor = new THREE.Color(0x2ea043); // Clinical green pulse for ORF / Match
    } else if (eventType === "MUTATION") {
      this.targetColor = new THREE.Color(0xda3633); // Alert crimson pulse for Point Mutation
    } else {
      this.targetColor = new THREE.Color(0xc9d1d9); // Platinum default
    }
  }

  /**
   * Updates particle positions, orbital turbulence, and color decays
   * @param {number} time
   */
  update(time) {
    if (!this.geometry) return;

    const posAttr = this.geometry.attributes.position;
    const colAttr = this.geometry.attributes.color;

    // Decay pulse energy
    this.pulseEnergy *= 0.94;
    if (this.pulseEnergy < 0.01) this.pulseEnergy = 0;

    const waveFactor = Math.sin(time * 2) * 0.5 + 0.5;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Orbit rotation around Y-axis
      const bx = this.basePositions[i3];
      const by = this.basePositions[i3 + 1];
      const bz = this.basePositions[i3 + 2];

      const angleSpeed = 0.003 + (i % 5) * 0.001;
      const cosA = Math.cos(time * angleSpeed);
      const sinA = Math.sin(time * angleSpeed);

      // Rotated position with pulse expansion
      const expansion = 1.0 + (this.pulseEnergy * 0.45 * Math.sin(by * 0.05 + time * 6));
      let x = (bx * cosA - bz * sinA) * expansion;
      let y = by + Math.sin(time * 1.5 + bx) * 1.2;
      let z = (bx * sinA + bz * cosA) * expansion;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      // Color interpolation during excitation
      if (this.pulseEnergy > 0.05) {
        const mix = this.pulseEnergy;
        this.colors[i3] = THREE.MathUtils.lerp(this.originalColors[i3], this.targetColor.r, mix);
        this.colors[i3 + 1] = THREE.MathUtils.lerp(this.originalColors[i3 + 1], this.targetColor.g, mix);
        this.colors[i3 + 2] = THREE.MathUtils.lerp(this.originalColors[i3 + 2], this.targetColor.b, mix);
      } else {
        this.colors[i3] = this.originalColors[i3];
        this.colors[i3 + 1] = this.originalColors[i3 + 1];
        this.colors[i3 + 2] = this.originalColors[i3 + 2];
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }
}
