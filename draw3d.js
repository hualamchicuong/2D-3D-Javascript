import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

document.addEventListener("DOMContentLoaded", async function () {
  const dataUrl = "CS Example Data File.json";
  const jsonData = await fetch(dataUrl).then(res => res.json());
  const sections = jsonData.polygonsBySection;
  const sectionSelect = document.getElementById("sectionSelect");

  sections.forEach(section => {
    let option = document.createElement("option");
    option.value = section.sectionName;
    option.textContent = section.sectionName;
  });

  // Perform draw after choose section
  sectionSelect.addEventListener("change", function () {
    draw3D(this.value);
  });

  // Draw 3D for the first time (when access the website)
  if (sections.length > 0) {
    draw3D(sections[0].sectionName);
  }

  function draw3D(sectionName) {
    const container = document.getElementById("viewer3D");
    container.innerHTML = "";

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, 500);
    container.appendChild(renderer.domElement);

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 500, 0.1, 5000);
    camera.position.set(0, 100, 800);
    camera.lookAt(0, 0, 0);

    // Add light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    // Find the chosen section
    const section = sections.find(s => s.sectionName === sectionName);
    if (!section) {
      console.error("Section not found:", sectionName);
      return;
    }

    const scaleFactor = 5; // Scale to zoom out the data
    // Calc bouding box of polygons
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity;

    // Draw polygons from points3D
    section.polygons.forEach(polygon => {
      if (!polygon.points3D || polygon.points3D.length < 3) {
        console.warn("Invalid polygon:", polygon);
        return;
      }
      const vertices = [];
      polygon.points3D.forEach(point => {
        const x = point.vertex[0] / scaleFactor;
        const y = -point.vertex[1] / scaleFactor;
        const z = point.vertex[2] / scaleFactor;
        vertices.push(x, y, z);
        // Update bounding box
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
        if (y < minY) minY = y;
      });
      // Fan triangulation: (0,1,2), (0,2,3), ...
      const indices = [];
      for (let i = 1; i < polygon.points3D.length - 1; i++) {
        indices.push(0, i, i + 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      // Add '#' to the polygon.color
      let fillColor = polygon.color;
      if (fillColor && fillColor[0] !== "#") {
        fillColor = "#" + fillColor;
      }
      const material = new THREE.MeshStandardMaterial({
        color: fillColor || "#cccccc",
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
    });

    // If polygon's data invalid, set bouding to default
    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
      console.warn("No valid polygon data for bounding grid.");
      minX = -50; maxX = 50; minZ = -50; maxZ = 50;
      minY = 0;
    }

    // Calc grid base on bouding box
    const gridWidth = maxX - minX;
    const gridDepth = maxZ - minZ;
    const gridSize = Math.max(gridWidth, gridDepth);
    const gridDivisions = 10; // Divisions amout of the grid

    // Create grid helper and locate it at the floor (minY) and the center is base on x and z.
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x888888);
    gridHelper.position.set((minX + maxX) / 2, minY, (minZ + maxZ) / 2);
    scene.add(gridHelper);

    // Add OrbitControls to zoom, rotate and pan
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.update();

    // Loop animation
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }
});