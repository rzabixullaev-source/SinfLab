import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { studioTools } from "@sinflab/contracts";

function canvasTexture(draw, size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d"), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function benchTexture() {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = "#263d48"; ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 2) {
      const grain = Math.sin(y * 0.19) * 7 + Math.sin(y * 0.043) * 10;
      ctx.fillStyle = `rgba(160,205,209,${0.025 + Math.abs(grain) / 550})`;
      ctx.fillRect(0, y, size, 1);
    }
    for (let i = 0; i < 1200; i++) {
      const x = (i * 73) % size, y = (i * 197) % size;
      ctx.fillStyle = i % 3 ? "#ffffff09" : "#03152214";
      ctx.fillRect(x, y, 2, 2);
    }
  });
}

function labelTexture(text, accent, code) {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = "#f3f0e4"; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, size, 76);
    ctx.fillStyle = "#15303b"; ctx.fillRect(0, size - 58, size, 58);
    ctx.fillStyle = "#203541"; ctx.font = "bold 125px Arial"; ctx.textAlign = "center";
    ctx.fillText(code, size / 2, 277, size - 38);
    ctx.font = "bold 30px Arial"; ctx.fillText(text.slice(0, 24), size / 2, 360, size - 35);
    ctx.fillStyle = "#e9ae43"; ctx.font = "bold 23px Arial"; ctx.fillText("SINF LAB", size / 2, size - 19);
  });
}
const chemistryCodes = {
  hcl: "HCl", naoh: "NaOH", vinegar: "CH₃COOH", bicarbonate: "NaHCO₃",
  fecl3: "FeCl₃", kscn: "KSCN", cuso4: "CuSO₄", agno3: "AgNO₃",
  nacl: "NaCl", h2o2: "H₂O₂", mno2: "MnO₂", iodine: "I₂",
  starch: "STARCH", phenolphthalein: "PHENO", carbonate: "CO₃²⁻",
  indicator: "pH", water: "H₂O", ammonia: "NH₃",
};

const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.12, ...options });
const metal = (color = "#9db8bd") => new THREE.MeshPhysicalMaterial({ color, metalness: 0.8, roughness: 0.22, clearcoat: 0.6 });
const glass = () => new THREE.MeshPhysicalMaterial({
  color: "#cbeaf0", metalness: 0, roughness: 0.08, transparent: true, opacity: 0.32,
  clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false,
});

function part(group, geometry, surface, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(x, y, z);
  object.castShadow = true; object.receiveShadow = true;
  group.add(object);
  return object;
}

function toolModel(itemId, subject) {
  const group = new THREE.Group();
  const [name, color] = studioTools[itemId];
  if (subject === "chemistry") {
    part(group, new THREE.CylinderGeometry(0.25, 0.27, 0.68, 28), glass(), 0, 0.42);
    part(group, new THREE.CylinderGeometry(0.22, 0.23, 0.36, 28), standard(color, { transparent: true, opacity: 0.82 }), 0, 0.26);
    part(group, new THREE.CylinderGeometry(0.13, 0.13, 0.16, 24), standard("#234453"), 0, 0.83);
    part(group, new THREE.CylinderGeometry(0.11, 0.11, 0.14, 24), metal("#c4ad7d"), 0, 0.98);
    const label = labelTexture(name, color, chemistryCodes[itemId] || itemId.toUpperCase());
    part(group, new THREE.PlaneGeometry(0.49, 0.33), new THREE.MeshBasicMaterial({ map: label, side: THREE.DoubleSide }), 0, 0.46, 0.27);
  } else if (subject === "biology") {
    part(group, new THREE.CylinderGeometry(0.34, 0.34, 0.13, 32), glass(), 0, 0.16);
    part(group, new THREE.SphereGeometry(0.19, 24, 16), standard(color, { transparent: true, opacity: 0.85 }), 0, 0.33);
    part(group, new THREE.TorusGeometry(0.32, 0.025, 8, 36), metal(), 0, 0.25).rotation.x = Math.PI / 2;
    part(group, new THREE.PlaneGeometry(0.7, 0.19), new THREE.MeshBasicMaterial({ map: labelTexture(name, color, itemId.slice(0, 5).toUpperCase()), side: THREE.DoubleSide }), 0, 0.62, 0.05);
  } else {
    if (itemId.toLowerCase().includes("ball") || itemId === "bob" || itemId === "float") {
      part(group, new THREE.SphereGeometry(0.29, 32, 24), new THREE.MeshPhysicalMaterial({ color, metalness: 0.48, roughness: 0.2, clearcoat: 0.72 }), 0, 0.35);
    } else if (itemId === "spring" || itemId === "string") {
      const points = Array.from({ length: 90 }, (_, i) => {
        const t = i / 89;
        return new THREE.Vector3(Math.sin(t * 24 * Math.PI) * 0.15, t * 0.65, Math.cos(t * 24 * Math.PI) * 0.15);
      });
      part(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 220, 0.035, 7), metal(color), 0, 0.12);
    } else {
      part(group, new THREE.BoxGeometry(0.66, 0.42, 0.48), new THREE.MeshPhysicalMaterial({ color, roughness: 0.26, metalness: 0.32, clearcoat: 0.55 }), 0, 0.32);
      part(group, new THREE.BoxGeometry(0.52, 0.055, 0.36), standard("#1b3541", { metalness: 0.4 }), 0, 0.56);
    }
    part(group, new THREE.PlaneGeometry(0.76, 0.2), new THREE.MeshBasicMaterial({ map: labelTexture(name, color, itemId.slice(0, 5).toUpperCase()), side: THREE.DoubleSide }), 0, 0.75, 0.03);
  }
  return group;
}

function disposeGroup(group) {
  group.traverse((object) => {
    object.geometry?.dispose();
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((surface) => {
      surface.map?.dispose();
      surface.dispose();
    });
  });
}

function apparatus(scene, scenario) {
  const group = new THREE.Group();
  scene.add(group);
  const frame = metal("#a6bfc3");
  const accent = standard("#0f766e", { metalness: 0.32 });
  const isChemistry = scenario.subject === "chemistry";
  const isBiology = scenario.subject === "biology";
  if (isChemistry || ["enzyme", "osmosis", "diffusion", "food"].includes(scenario.model)) {
    part(group, new THREE.CylinderGeometry(0.8, 0.7, 1.25, 52, 1, true), glass(), 0, 0.75, -1);
    part(group, new THREE.TorusGeometry(0.8, 0.035, 8, 52), frame, 0, 1.38, -1).rotation.x = Math.PI / 2;
    const liquid = part(group, new THREE.CylinderGeometry(0.75, 0.68, 1, 52), standard("#59bdb8", { transparent: true, opacity: 0.75, roughness: 0.12 }), 0, 0.4, -1);
    const surface = part(group, new THREE.CylinderGeometry(0.75, 0.75, 0.025, 52), standard("#9de4db", { transparent: true, opacity: 0.7 }), 0, 0.75, -1);
    const bubbles = Array.from({ length: 22 }, (_, i) => part(group, new THREE.SphereGeometry(0.018 + i % 3 * 0.012, 9, 7), glass(), 0, 0, -1));
    return (time, state) => {
      const effect = state.reaction?.effect;
      const biologyReady = isBiology && state.correct;
      const color = state.reaction?.color || (scenario.model === "food" && biologyReady ? "#25345a"
        : scenario.model === "enzyme" && biologyReady ? "#88d5a5"
          : scenario.model === "osmosis" && (state.values.concentration || 0) > 5 ? "#5c9db8" : isBiology ? "#68b896" : "#59bdb8");
      liquid.material.color.set(color); surface.material.color.set(color);
      const osmoticChange = scenario.model === "osmosis" ? (5 - (state.values.concentration || 5)) * 0.025 : 0;
      const height = Math.max(0.18, Math.min(0.92, 0.24 + state.placed.length * 0.1 + osmoticChange));
      liquid.scale.y = height; liquid.position.y = 0.13 + height / 2; surface.position.y = 0.13 + height;
      bubbles.forEach((bubble, i) => {
        bubble.visible = effect === "gas" || (scenario.model === "enzyme" && biologyReady);
        bubble.position.set(Math.sin(i * 7.5) * 0.48, 0.2 + (time * (0.3 + i % 4 * 0.1) + i * 0.18) % Math.max(0.25, height), -1 + Math.cos(i * 4.2) * 0.38);
      });
    };
  }
  if (isBiology) {
    let dynamic = null;
    if (scenario.model === "microscope") {
      part(group, new THREE.CylinderGeometry(0.24, 0.28, 0.9, 24), frame, 0.25, 1.25, -1);
      part(group, new THREE.CylinderGeometry(0.13, 0.16, 0.68, 24), standard("#1e4755", { metalness: 0.65 }), 0.05, 1.95, -1);
      part(group, new THREE.BoxGeometry(1.2, 0.1, 0.7), frame, 0, 0.65, -1);
      const specimen = part(group, new THREE.BoxGeometry(0.8, 0.08, 0.44), glass(), 0, 0.75, -1);
      dynamic = (_time, state) => { specimen.material.color.set(state.correct ? "#9ce0b4" : "#cbeaf0"); };
    } else if (scenario.model === "photosynthesis" || scenario.model === "ecosystem") {
      part(group, new THREE.CylinderGeometry(0.05, 0.08, 1.05, 12), standard("#588765"), 0, 0.65, -1);
      const leaves = [];
      for (let i = 0; i < 9; i++) {
        const leaf = part(group, new THREE.SphereGeometry(0.25, 16, 12), standard(i % 2 ? "#4cb27e" : "#89c76c", { roughness: 0.8 }), Math.sin(i * 2.4) * 0.45, 0.65 + i * 0.11, -1 + Math.cos(i * 2.4) * 0.2);
        leaf.scale.set(1.2, 0.35, 0.48);
        leaves.push(leaf);
      }
      part(group, new THREE.CylinderGeometry(0.55, 0.43, 0.35, 28), standard("#8b6655"), 0, 0.16, -1);
      dynamic = (time, state) => {
        const strength = scenario.model === "photosynthesis" ? (state.values.light || 0) / 100 : Math.min(1, (state.values.plants || 0) / 100);
        leaves.forEach((leaf, index) => {
          leaf.scale.x = 0.5 + strength * 0.9;
          leaf.rotation.z = Math.sin(time * 1.2 + index) * 0.12;
        });
      };
    } else if (scenario.model === "genetics") {
      for (let i = 0; i < 28; i++) {
        const y = 0.25 + i * 0.067, t = i * 0.55;
        part(group, new THREE.SphereGeometry(0.055, 10, 8), standard(i % 2 ? "#e9ae43" : "#62c9b6"), Math.sin(t) * 0.35, y, -1 + Math.cos(t) * 0.22);
        part(group, new THREE.SphereGeometry(0.055, 10, 8), standard(i % 2 ? "#8a9ed3" : "#d8899e"), -Math.sin(t) * 0.35, y, -1 - Math.cos(t) * 0.22);
      }
    } else {
      const cell = part(group, new THREE.SphereGeometry(0.73, 48, 32), new THREE.MeshPhysicalMaterial({ color: scenario.model === "heart" ? "#b75d6e" : "#69c6ab", transparent: true, opacity: 0.66, roughness: 0.2, clearcoat: 0.8 }), 0, 0.87, -1);
      part(group, new THREE.SphereGeometry(0.22, 24, 16), standard("#ad85ba"), -0.14, 0.85, -0.55);
      dynamic = (time, state) => {
        const pulse = scenario.model === "heart" ? (state.values.rate || 75) / 75 : scenario.model === "diffusion" ? (state.values.gradient || 8) / 8 : 1;
        cell.scale.setScalar(1 + Math.sin(time * pulse * 2.3) * (scenario.model === "heart" ? 0.08 : 0.025));
        cell.material.color.set(state.correct ? scenario.model === "heart" ? "#cc727b" : "#77d0ad" : "#69c6ab");
      };
    }
    return (time, state) => { group.rotation.y = Math.sin(time * 0.25) * 0.08; dynamic?.(time, state); };
  }
  switch (scenario.model) {
    case "ramp": {
      const ramp = part(group, new THREE.BoxGeometry(2.4, 0.13, 0.85), standard("#a98260", { roughness: 0.7 }), 0, 0.67, -1);
      const block = part(group, new THREE.BoxGeometry(0.35, 0.32, 0.34), standard("#d1ac7f"), 0, 0.9, -1);
      return (time, state) => {
        const angle = (state.values.angle || 25) * Math.PI / 180;
        ramp.rotation.z = -angle;
        const travel = state.correct ? (time * Math.sin(angle) * 0.3) % 2.1 - 1.05 : -0.8;
        block.position.set(travel, 0.83 - travel * Math.sin(angle), -1);
      };
    }
    case "pendulum": {
      part(group, new THREE.CylinderGeometry(0.05, 0.06, 2.1, 16), frame, -1, 1.12, -1);
      part(group, new THREE.BoxGeometry(2, 0.1, 0.1), frame, -0.1, 2.13, -1);
      const rod = part(group, new THREE.CylinderGeometry(0.022, 0.022, 1.2, 12), frame, 0.78, 1.5, -1);
      const bob = part(group, new THREE.SphereGeometry(0.22, 24, 16), standard("#e9ae43", { metalness: 0.5 }), 0.78, 0.9, -1);
      return (time, state) => {
        const angle = ((state.values.angle || 20) * Math.PI / 180) * Math.sin(time * 2.8);
        rod.rotation.z = angle;
        bob.position.set(0.78 + Math.sin(angle) * 0.65, 2.1 - Math.cos(angle) * 1.2, -1);
      };
    }
    case "spring": {
      part(group, new THREE.BoxGeometry(1.7, 0.12, 0.3), frame, 0, 2.2, -1);
      const coil = part(group, new THREE.CylinderGeometry(0.21, 0.21, 1.1, 16, 20, true), frame, 0, 1.5, -1);
      const load = part(group, new THREE.BoxGeometry(0.6, 0.45, 0.55), standard("#d2ad6c", { metalness: 0.55 }), 0, 0.7, -1);
      return (_time, state) => {
        const extension = Math.min(0.6, (state.values.mass || 0.5) * 0.15);
        coil.scale.y = 1 + extension; load.position.y = 0.7 - extension;
      };
    }
    case "lever": {
      const plank = part(group, new THREE.BoxGeometry(2.5, 0.12, 0.38), standard("#b7906a"), 0, 0.9, -1);
      part(group, new THREE.ConeGeometry(0.32, 0.65, 4), frame, 0, 0.35, -1);
      return (_time, state) => { plank.rotation.z = Math.max(-0.25, Math.min(0.25, ((state.values.left || 1) - (state.values.right || 1)) * 0.16)); };
    }
    case "projectile": {
      const barrel = part(group, new THREE.CylinderGeometry(0.15, 0.2, 1.3, 20), frame, -0.8, 0.8, -1);
      part(group, new THREE.BoxGeometry(1.2, 0.2, 0.9), accent, -0.8, 0.2, -1);
      const ball = part(group, new THREE.SphereGeometry(0.13, 20, 16), standard("#e9ae43"), -0.8, 1, -1);
      return (time, state) => {
        const angle = (state.values.angle || 45) * Math.PI / 180, speed = (state.values.speed || 12) / 12;
        barrel.rotation.z = Math.PI / 2 + angle;
        const t = state.correct ? time % 2.4 : 0;
        ball.position.set(-0.8 + t * speed * Math.cos(angle), 0.7 + t * speed * Math.sin(angle) - 0.5 * t * t, -1);
      };
    }
    case "buoyancy": {
      part(group, new THREE.BoxGeometry(2.2, 1.2, 1.4), glass(), 0, 0.66, -1);
      part(group, new THREE.BoxGeometry(2.05, 0.65, 1.25), standard("#4dacc3", { transparent: true, opacity: 0.57 }), 0, 0.39, -1);
      const body = part(group, new THREE.SphereGeometry(0.24, 24, 16), standard("#d5a46d"), 0, 0.6, -1);
      return (time, state) => { body.position.y = (state.values.density || 700) < (state.values.fluid || 1000) ? 0.66 + Math.sin(time * 2) * 0.025 : 0.31; };
    }
    case "circuit": {
      part(group, new THREE.BoxGeometry(2.5, 0.12, 1.3), standard("#284956"), 0, 0.2, -1);
      part(group, new THREE.TorusGeometry(0.8, 0.035, 8, 64), standard("#e9ae43", { metalness: 0.7 }), 0, 0.35, -1).rotation.x = Math.PI / 2;
      const bulb = part(group, new THREE.SphereGeometry(0.22, 24, 16), standard("#e9ae43", { emissive: "#e9ae43" }), 0, 0.8, -1);
      return (_time, state) => { bulb.material.emissiveIntensity = state.correct ? Math.min(2.4, (state.values.voltage || 9) / (state.values.resistance || 18) * 2) : 0.05; };
    }
    case "lens": {
      part(group, new THREE.SphereGeometry(0.62, 40, 28), glass(), 0, 1.1, -1).scale.z = 0.22;
      part(group, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12), frame, 0, 0.44, -1);
      const ray = part(group, new THREE.CylinderGeometry(0.015, 0.015, 1.8, 8), standard("#f5d784", { emissive: "#e9ae43", emissiveIntensity: 1 }), -0.95, 1.1, -1);
      ray.rotation.z = Math.PI / 2;
      return (_time, state) => { ray.visible = state.correct; };
    }
    case "collision": {
      part(group, new THREE.BoxGeometry(2.9, 0.12, 0.8), frame, 0, 0.17, -1);
      const left = part(group, new THREE.SphereGeometry(0.26, 24, 16), standard("#e9ae43"), -0.75, 0.5, -1);
      const right = part(group, new THREE.SphereGeometry(0.26, 24, 16), standard("#64c7bb"), 0.75, 0.5, -1);
      return (time, state) => { const t = state.correct ? Math.sin(time * (state.values.speed || 5) * 0.45) : 0; left.position.x = -0.75 + Math.max(0, t) * 0.48; right.position.x = 0.75 - Math.max(0, t) * 0.48; };
    }
    case "heat": {
      part(group, new THREE.BoxGeometry(1.8, 0.24, 1.15), metal("#866f6a"), 0, 0.26, -1);
      const plate = part(group, new THREE.BoxGeometry(1.4, 0.04, 0.85), standard("#e77b5c", { emissive: "#a73522", emissiveIntensity: 0.6 }), 0, 0.4, -1);
      return (_time, state) => { plate.material.emissiveIntensity = (state.values.power || 50) / 50; };
    }
    default: part(group, new THREE.BoxGeometry(1.4, 0.2, 1), accent, 0, 0.3, -1);
  }
  return () => {};
}

export default function StudioScene3D({ scenario, state, onAdd, onRemove }) {
  const mountRef = useRef(null);
  const live = useRef({ state, onAdd, onRemove });
  const [failed, setFailed] = useState(false);
  live.current = { state, onAdd, onRemove };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b202b");
    scene.fog = new THREE.Fog("#0b202b", 8, 16);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 50);
    camera.position.set(4.6, 3.7, 6.4);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = true; controls.minDistance = 4.4; controls.maxDistance = 11;
    controls.maxPolarAngle = Math.PI * 0.49; controls.target.set(0, 0.65, 0);
    scene.add(new THREE.HemisphereLight("#c7f4ec", "#294658", 2.25));
    const key = new THREE.DirectionalLight("#fff4d8", 3.7); key.position.set(-3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    const rim = new THREE.PointLight("#23d5c6", 24, 8); rim.position.set(3, 3, -3); scene.add(rim);
    const floor = part(scene, new THREE.BoxGeometry(9.5, 0.22, 6.5), new THREE.MeshPhysicalMaterial({ map: benchTexture(), roughness: 0.62, metalness: 0.22, clearcoat: 0.22 }), 0, -0.2);
    floor.receiveShadow = true;
    part(scene, new THREE.BoxGeometry(8.2, 0.08, 1.4), standard("#182f3a", { roughness: 0.5 }), 0, 0.01, 1.55);
    const ring = part(scene, new THREE.TorusGeometry(1.1, 0.018, 8, 64), standard("#5daca6", { emissive: "#0f766e", emissiveIntensity: 0.35 }), 0, 0.045, -1);
    ring.rotation.x = Math.PI / 2;
    const updateApparatus = apparatus(scene, scenario);
    const rack = scenario.tools.map((itemId, index) => {
      const group = toolModel(itemId, scenario.subject);
      group.userData.itemId = itemId; group.userData.source = "rack";
      group.position.set((index - (scenario.tools.length - 1) / 2) * 1.55, 0.04, 1.55);
      scene.add(group); return group;
    });
    const pickables = [...rack];
    let placedGroups = [];
    let placedKey = "";
    const refreshPlaced = () => {
      const nextKey = live.current.state.placed.map((item) => item.itemId).join("|");
      if (nextKey === placedKey) return;
      placedGroups.forEach((group) => { scene.remove(group); disposeGroup(group); });
      placedGroups = live.current.state.placed.map((item, index) => {
        const group = toolModel(item.itemId, scenario.subject);
        group.userData.itemId = item.itemId; group.userData.source = "placed";
        group.position.set(-0.7 + index % 4 * 0.45, 0.04, -1.8 + Math.floor(index / 4) * 0.45);
        group.scale.setScalar(0.62);
        scene.add(group); return group;
      });
      pickables.splice(rack.length, pickables.length - rack.length, ...placedGroups);
      placedKey = nextKey;
    };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
    const point = new THREE.Vector3();
    let grabbing = null;
    function ray(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
    }
    function down(event) {
      ray(event);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      if (!hit) return;
      let group = hit.object;
      while (group && !group.userData.itemId) group = group.parent;
      if (!group) return;
      grabbing = { group, source: group.userData.source, itemId: group.userData.itemId, original: group.position.clone(), moved: false };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    }
    function move(event) {
      if (!grabbing) return;
      ray(event);
      if (!raycaster.ray.intersectPlane(plane, point)) return;
      grabbing.group.position.x = THREE.MathUtils.clamp(point.x, -3.7, 3.7);
      grabbing.group.position.z = THREE.MathUtils.clamp(point.z, -2.3, 2.5);
      grabbing.group.position.y = 0.23;
      grabbing.moved = true;
    }
    function up() {
      if (!grabbing) return;
      const { group, source, itemId, original, moved } = grabbing;
      const inWorkArea = Math.abs(group.position.x) < 1.3 && group.position.z < 0.45;
      if ((inWorkArea || !moved) && source === "rack") live.current.onAdd(itemId);
      else if (!inWorkArea && source === "placed") live.current.onRemove(itemId);
      group.position.copy(original);
      grabbing = null; controls.enabled = true; renderer.domElement.style.cursor = "grab";
    }
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const resize = () => {
      const width = mount.clientWidth || 500, height = mount.clientHeight || 400;
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const clock = new THREE.Clock();
    let frame;
    function animate() {
      frame = requestAnimationFrame(animate);
      refreshPlaced();
      const time = clock.getElapsedTime();
      updateApparatus(time, live.current.state);
      controls.update(); renderer.render(scene, camera);
    }
    animate();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((item) => materials.add(item));
      });
      placedGroups.forEach((group) => group.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((item) => materials.add(item));
      }));
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => { if (item.map) textures.add(item.map); item.dispose(); });
      textures.forEach((item) => item.dispose());
      renderer.dispose(); mount.removeChild(renderer.domElement);
    };
  }, [scenario.id]);

  return <div className="studio-3d-shell">
    <div ref={mountRef} className="studio-3d-stage" role="img" aria-label={`${scenario.title} 3D ish maydoni`} />
    {failed ? <div className="studio-3d-fallback">3D bu qurilmada ochilmadi. Pastdagi asbob tugmalari bilan tajribani davom ettiring.</div> : null}
    <div className="studio-3d-caption"><span>3D ISH STOLI</span><span>Asbobni ushlab markazga olib boring · ko'rinishni aylantiring</span></div>
  </div>;
}
