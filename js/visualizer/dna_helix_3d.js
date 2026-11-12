/**
 * 3D Interactive DNA Double-Helix Visualizer
 * Built with Three.js with real-time base pair tracking, smooth camera following, and molecular particle field dynamics.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HiggsFieldSystem } from "./higgs_field.js";
import { BASE_COLORS, GENETIC_CODE } from "../data/presets.js";

export class DnaHelix3D {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.particleField = null;

    // DNA Structure groups
    this.helixGroup = new THREE.Group();
    this.baseRungs = []; // Store metadata and meshes by sequence index
    this.currentHighlightMesh = null;

    // Simulation & Camera Tracking params
    this.sequence = "";
    this.radius = 7.5;
    this.pitch = 0.85; // vertical height step per base pair
    this.twist = 0.55; // radians twist per base pair
    this.autoRotate = false; // Off by default for professional inspection stability
    this.autoTrackScanner = true; // Keeps active scanner centered in viewport
    this.activeBaseIndex = 0;

    // Windowing for very large sequences (> 350 bp)
    this.maxVisibleBases = 350;

    // Raycasting for interactive base inspection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.hoveredRung = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x090d13, 0.005);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 80);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 220;
    this.controls.minDistance = 15;

    // Studio Lighting (Clean, neutral laboratory illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xf8fafc, 1.2);
    dirLight1.position.set(30, 60, 45);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.8);
    dirLight2.position.set(-30, -50, -45);
    this.scene.add(dirLight2);

    // Add DNA container group
    this.scene.add(this.helixGroup);

    // Ambient Molecular Solvent Particle Field
    this.particleField = new HiggsFieldSystem(this.scene, 1800);

    // Scanner indicator marker
    this.createScannerCursor();

    // Resize handler with ResizeObserver
    window.addEventListener('resize', () => this.onResize());
    if (window.ResizeObserver) {
      new ResizeObserver(() => this.onResize()).observe(this.container);
    }

    // Raycasting & Hover events
    this.setupInteractivity();

    // Animation Loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  createScannerCursor() {
    const ringGeo = new THREE.TorusGeometry(10.2, 0.28, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf0f6fc,
      transparent: true,
      opacity: 0.9
    });
    this.scannerRing = new THREE.Mesh(ringGeo, ringMat);
    this.scannerRing.rotation.x = Math.PI / 2;
    this.scannerRing.visible = false;
    this.helixGroup.add(this.scannerRing);
  }

  setupInteractivity() {
    this.renderer.domElement.addEventListener("mousemove", (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
  }

  /**
   * Rebuilds the 3D double helix model for a given DNA sequence
   * Supports sequences of any length without arbitrary 120 bp cutoffs.
   * @param {string} seq
   */
  setSequence(seq) {
    this.sequence = seq.toUpperCase().replace(/[^ACGT]/g, "");
    
    // Clear existing meshes safely
    while (this.helixGroup.children.length > 0) {
      const obj = this.helixGroup.children[0];
      this.helixGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    this.baseRungs = [];
    this.createScannerCursor();

    if (!this.sequence || this.sequence.length === 0) return;

    // Render up to maxVisibleBases (default 350)
    const n = Math.min(this.sequence.length, this.maxVisibleBases);
    const totalHeight = n * this.pitch;
    const yOffset = totalHeight / 2; // Start from top, sequence flows downward

    const strand1Points = [];
    const strand2Points = [];

    const sphereGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const rungGeo = new THREE.CylinderGeometry(0.3, 0.3, this.radius * 0.95, 12);

    for (let i = 0; i < n; i++) {
      const char = this.sequence[i];
      const compChar = BASE_COLORS[char] ? BASE_COLORS[char].comp : 'T';

      const angle1 = i * this.twist;
      const angle2 = angle1 + Math.PI; // Anti-parallel 180 deg
      const y = yOffset - i * this.pitch; // Flow top to bottom

      const p1 = new THREE.Vector3(Math.cos(angle1) * this.radius, y, Math.sin(angle1) * this.radius);
      const p2 = new THREE.Vector3(Math.cos(angle2) * this.radius, y, Math.sin(angle2) * this.radius);

      strand1Points.push(p1);
      strand2Points.push(p2);

      // Sugar-Phosphate Node 1 (Sense Strand 5' -> 3')
      const color1 = BASE_COLORS[char]?.hex || 0xcccccc;
      const mat1 = new THREE.MeshStandardMaterial({
        color: color1,
        roughness: 0.35,
        metalness: 0.45,
        emissive: color1,
        emissiveIntensity: 0.2
      });
      const node1 = new THREE.Mesh(sphereGeo, mat1);
      node1.position.copy(p1);
      node1.userData = { baseIndex: i, char, compChar, strand: 1 };
      this.helixGroup.add(node1);

      // Sugar-Phosphate Node 2 (Complementary Strand 3' -> 5')
      const color2 = BASE_COLORS[compChar]?.hex || 0xcccccc;
      const mat2 = new THREE.MeshStandardMaterial({
        color: color2,
        roughness: 0.35,
        metalness: 0.45,
        emissive: color2,
        emissiveIntensity: 0.2
      });
      const node2 = new THREE.Mesh(sphereGeo, mat2);
      node2.position.copy(p2);
      node2.userData = { baseIndex: i, char: compChar, compChar: char, strand: 2 };
      this.helixGroup.add(node2);

      // Hydrogen-Bonded Base-Pair Rung connecting the two strands
      const rungGroup = new THREE.Group();

      // Half rung (Sense strand nucleotide)
      const half1 = new THREE.Mesh(rungGeo, mat1);
      half1.position.set(0, (this.radius * 0.95) / 2, 0);
      
      const halfGroup = new THREE.Group();
      halfGroup.position.copy(p1);
      halfGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      halfGroup.add(half1);

      rungGroup.add(halfGroup);
      this.helixGroup.add(rungGroup);

      this.baseRungs.push({
        index: i,
        char,
        compChar,
        position: new THREE.Vector3(0, y, 0),
        node1,
        node2,
        isMutated: false
      });
    }

    // Continuous Sugar-Phosphate Backbone Tubes
    if (strand1Points.length > 2) {
      const curve1 = new THREE.CatmullRomCurve3(strand1Points);
      const tubeGeo1 = new THREE.TubeGeometry(curve1, n * 2, 0.32, 8, false);
      const tubeMat1 = new THREE.MeshStandardMaterial({
        color: 0x8b949e,
        metalness: 0.65,
        roughness: 0.25
      });
      const tube1 = new THREE.Mesh(tubeGeo1, tubeMat1);
      this.helixGroup.add(tube1);

      const curve2 = new THREE.CatmullRomCurve3(strand2Points);
      const tubeGeo2 = new THREE.TubeGeometry(curve2, n * 2, 0.32, 8, false);
      const tubeMat2 = new THREE.MeshStandardMaterial({
        color: 0x6e7681,
        metalness: 0.65,
        roughness: 0.25
      });
      const tube2 = new THREE.Mesh(tubeGeo2, tubeMat2);
      this.helixGroup.add(tube2);
    }

    // Reset camera target
    if (this.controls) {
      this.controls.target.set(0, yOffset - 10, 0);
    }
  }

  /**
   * Updates the scanner cursor position along the DNA helix during automata step
   * Smoothly follows the active position so it never scrolls out of the viewport.
   * @param {number} index
   * @param {boolean} isAccepted
   * @param {boolean} isMutation
   */
  highlightBase(index, isAccepted = false, isMutation = false) {
    if (!this.baseRungs || this.baseRungs.length === 0) return;

    this.activeBaseIndex = index;
    const boundedIdx = Math.min(index, this.baseRungs.length - 1);
    const rung = this.baseRungs[boundedIdx];

    if (rung && this.scannerRing) {
      this.scannerRing.visible = true;
      this.scannerRing.position.y = rung.position.y;

      if (isMutation) {
        this.scannerRing.material.color.setHex(0xda3633); // Alert Red for SNP
        rung.node1.material.emissive.setHex(0xda3633);
        rung.node1.material.emissiveIntensity = 1.0;
        rung.isMutated = true;
        this.particleField?.triggerExcitation("MUTATION");
      } else if (isAccepted) {
        this.scannerRing.material.color.setHex(0x2ea043); // Clinical Emerald for Acceptance
        this.particleField?.triggerExcitation("ACCEPT");
      } else {
        this.scannerRing.material.color.setHex(0xf0f6fc); // Crisp platinum
      }

      // Smooth camera vertical tracking to keep scanner in view
      if (this.autoTrackScanner && this.controls) {
        const targetY = rung.position.y;
        this.controls.target.y = THREE.MathUtils.lerp(this.controls.target.y, targetY, 0.08);
      }
    }
  }

  resetCamera() {
    if (!this.controls || !this.camera) return;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, 80);
    this.controls.update();
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  toggleAutoTrack() {
    this.autoTrackScanner = !this.autoTrackScanner;
    return this.autoTrackScanner;
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();

    if (this.autoRotate) {
      this.helixGroup.rotation.y += 0.003;
    }

    if (this.scannerRing && this.scannerRing.visible) {
      this.scannerRing.rotation.z += 0.025;
    }

    // Update ambient particle field
    if (this.particleField) {
      this.particleField.update(elapsedTime);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
