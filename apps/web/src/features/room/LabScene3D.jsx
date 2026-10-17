import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.15, ...extra });

function mesh(geometry, surface, position, scene) {
  const item = new THREE.Mesh(geometry, surface);
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  scene.add(item);
  return item;
}

function cylinderBetween(item, start, end, radius) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  item.position.copy(a).add(b).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  item.scale.set(radius, a.distanceTo(b), radius);
}

export function estimatePh(lab, baseVolumeMl) {
  const difference = lab.acidMolarity * lab.acidVolumeMl - lab.baseMolarity * baseVolumeMl;
  if (Math.abs(difference) < 1e-9) return 7;
  const concentration = Math.abs(difference) / (lab.acidVolumeMl + baseVolumeMl);
  return Math.max(0, Math.min(14, difference > 0 ? -Math.log10(concentration) : 14 + Math.log10(concentration)));
}

export default function LabScene3D({ kind, lab, experiment }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ lab, experiment });
  const [webglError, setWebglError] = useState(false);
  stateRef.current = { lab, experiment };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1d29");
    scene.fog = new THREE.Fog("#0b1d29", 9, 17);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(4.2, 3.3, 5.8);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setWebglError(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = true;
    controls.minDistance = 3.2; controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2.04;
    controls.target.set(0, 1.35, 0);

    scene.add(new THREE.HemisphereLight("#c9f2ed", "#34516c", 2.1));
    const key = new THREE.DirectionalLight("#fff5dc", 3.4);
    key.position.set(-3, 7, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5; key.shadow.camera.right = 5;
    key.shadow.camera.top = 7; key.shadow.camera.bottom = -4;
    scene.add(key);
    const rim = new THREE.PointLight("#2dd7c8", 32, 9);
    rim.position.set(3, 3, -2); scene.add(rim);
    mesh(new THREE.BoxGeometry(9, 0.13, 7), material("#163645", { roughness: 0.76 }), [0, -0.12, 0], scene);
    const grid = new THREE.GridHelper(8, 16, "#2e6971", "#244656");
    grid.position.y = -0.045; scene.add(grid);

    let update;
    if (kind === "physics-pendulum") {
      const steel = material("#a7c2cb", { metalness: 0.76, roughness: 0.18 });
      mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.15, 20), steel, [-1.4, 1.55, 0], scene);
      mesh(new THREE.BoxGeometry(3.1, 0.12, 0.22), steel, [0.08, 3.12, 0], scene);
      mesh(new THREE.BoxGeometry(1.2, 0.1, 0.9), steel, [-1.4, 0.02, 0], scene);
      const pivot = [1.42, 3.02, 0];
      mesh(new THREE.SphereGeometry(0.12, 24, 16), steel, pivot, scene);
      const rod = mesh(new THREE.CylinderGeometry(1, 1, 1, 12), steel, [0, 0, 0], scene);
      const bob = mesh(new THREE.SphereGeometry(0.28, 36, 24), material("#e9ae43", { metalness: 0.55, roughness: 0.2 }), [0, 0, 0], scene);
      const stripe = mesh(new THREE.TorusGeometry(0.28, 0.012, 8, 48), material("#ffe2a3", { emissive: "#4b2d08" }), [0, 0, 0], scene);
      update = (seconds) => {
        const { lab: currentLab, experiment: current } = stateRef.current;
        const length = Math.max(0.2, Number(current.length) || currentLab.minLength);
        const amplitude = (Number(current.amplitudeDegrees) || 10) * Math.PI / 180;
        const period = 2 * Math.PI * Math.sqrt(length / currentLab.gravity);
        const angle = amplitude * Math.cos(seconds * 2 * Math.PI / period);
        const visualLength = 0.9 + length * 0.68;
        const end = [pivot[0] + visualLength * Math.sin(angle), pivot[1] - visualLength * Math.cos(angle), 0];
        cylinderBetween(rod, pivot, end, 0.018);
        bob.position.set(...end); stripe.position.set(...end); stripe.rotation.y = Math.PI / 2;
      };
    } else {
      const glass = material("#c0e4ec", { transparent: true, opacity: 0.22, metalness: 0.1, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false });
      const metal = material("#9dbdc8", { metalness: 0.72, roughness: 0.2 });
      mesh(new THREE.BoxGeometry(3.8, 0.16, 2.2), material("#34525d", { roughness: 0.42 }), [0, 0.08, 0], scene);
      mesh(new THREE.CylinderGeometry(0.74, 0.64, 1.32, 56, 1, true), glass, [0.3, 0.82, 0], scene);
      mesh(new THREE.TorusGeometry(0.74, 0.035, 8, 56), glass, [0.3, 1.48, 0], scene).rotation.x = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.7, 0.61, 0.04, 56), glass, [0.3, 0.17, 0], scene);
      const liquidMaterial = material("#e9876e", { transparent: true, opacity: 0.78, roughness: 0.16, metalness: 0.08 });
      const liquid = mesh(new THREE.CylinderGeometry(0.68, 0.59, 1, 48), liquidMaterial, [0.3, 0.55, 0], scene);
      const meniscus = mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.02, 48), material("#f7c4a5", { transparent: true, opacity: 0.65 }), [0.3, 1, 0], scene);
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 12), metal, [-1.25, 1.78, -0.25], scene);
      mesh(new THREE.BoxGeometry(1.65, 0.09, 0.13), metal, [-0.45, 3.35, -0.25], scene);
      mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 32, 1, true), glass, [0.2, 2.23, -0.25], scene);
      mesh(new THREE.CylinderGeometry(0.125, 0.125, 1.15, 28), material("#5bd1c2", { transparent: true, opacity: 0.62 }), [0.2, 1.82, -0.25], scene);
      mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 16), glass, [0.2, 0.9, -0.25], scene);
      mesh(new THREE.BoxGeometry(0.38, 0.06, 0.06), metal, [0.2, 1.1, -0.25], scene);
      const drop = mesh(new THREE.SphereGeometry(0.055, 14, 12), material("#64e0d3", { transparent: true, opacity: 0.85 }), [0.2, 0.7, -0.25], scene);
      update = (seconds) => {
        const { lab: currentLab, experiment: current } = stateRef.current;
        const volume = Math.max(0, Number(current.baseVolumeMl) || 0);
        const fraction = Math.min(1, volume / currentLab.maxBaseVolumeMl);
        const height = 0.34 + fraction * 0.78;
        liquid.scale.y = height;
        liquid.position.y = 0.18 + height / 2;
        meniscus.position.y = 0.18 + height;
        const ph = estimatePh(currentLab, volume);
        const tint = ph < 5 ? "#f08f76" : ph < 8.2 ? "#b2c6bc" : "#d870b5";
        liquidMaterial.color.set(tint);
        drop.position.y = 1.05 - (seconds * 1.25) % 0.75;
        drop.visible = volume > 0;
      };
    }

    const resize = () => {
      const width = mount.clientWidth || 500, height = mount.clientHeight || 360;
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const clock = new THREE.Clock();
    let frame;
    const animate = () => { frame = requestAnimationFrame(animate); update(clock.getElapsedTime()); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((surface) => surface.dispose());
      });
      renderer.dispose(); mount.removeChild(renderer.domElement);
    };
  }, [kind]);

  return <div className="lab-scene-shell"><div className="lab-scene" ref={mountRef} aria-label={kind === "physics-pendulum" ? "Aylanadigan 3D mayatnik modeli" : "Aylanadigan 3D titrlash laboratoriyasi"} />{webglError ? <div className="lab-scene-fallback"><strong>3D ko‘rinish bu qurilmada ochilmadi</strong><span>Parametrlarni kiritib tajribani davom ettirishingiz mumkin.</span></div> : <div className="lab-scene-overlay"><span className="lab-3d-badge">INTERAKTIV 3D</span><span>Sichqoncha yoki barmoq bilan aylantiring</span></div>}</div>;
}
