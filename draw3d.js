import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

function makeTextSprite(message, parameters) {
  if (parameters === undefined) parameters = {};
  const fontface = parameters.fontface || "Arial";
  const fontsize = parameters.fontsize || 18;
  const borderThickness = parameters.borderThickness || 4;
  const borderColor = parameters.borderColor || { r: 0, g: 0, b: 0, a: 1.0 };
  const backgroundColor = parameters.backgroundColor || { r: 255, g: 255, b: 255, a: 1.0 };

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = "Bold " + fontsize + "px " + fontface;

  const metrics = context.measureText(message);
  const textWidth = metrics.width;
  canvas.width = textWidth + borderThickness * 2;
  canvas.height = fontsize + borderThickness * 2;
  context.font = "Bold " + fontsize + "px " + fontface; // Cập nhật lại font sau khi thay đổi kích thước canvas

  context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
  context.lineWidth = borderThickness;
  context.strokeRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(0, 0, 0, 1.0)";
  context.fillText(message, borderThickness, fontsize + borderThickness);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(20, 10, 1.0); // Điều chỉnh kích thước nhãn
  return sprite;
}

document.addEventListener("DOMContentLoaded", async function () {
  const dataUrl = "CS Example Data File.json";
  const jsonData = await fetch(dataUrl).then(res => res.json());
  const sections = jsonData.polygonsBySection;
  const sectionSelect = document.getElementById("sectionSelect");

  // Thêm Section vào dropdown
  sections.forEach(section => {
    let option = document.createElement("option");
    option.value = section.sectionName;
    option.textContent = section.sectionName;
  });

  // Vẽ khi đổi section
  sectionSelect.addEventListener("change", function () {
    draw3D(this.value);
  });

  // Vẽ lần đầu (section đầu tiên)
  if (sections.length > 0) {
    draw3D(sections[0].sectionName);
  }



  function draw3D(sectionName) {
    const container = document.getElementById("viewer3D");
    container.innerHTML = "";
  
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
  
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, 500);
    container.appendChild(renderer.domElement);
  
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 500, 0.1, 5000);
    camera.position.set(0, 200, 800);
    camera.lookAt(0, 0, 0);
  
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
  
    const section = sections.find(s => s.sectionName === sectionName);
    if (!section) {
      console.error("Section not found:", sectionName);
      return;
    }
  
    const group = new THREE.Group();
    scene.add(group);
  
    const scaleFactor = 5;
  
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
  
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
  
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
  
        vertices.push(x, y, z);
      });
  
      const indices = [];
      for (let i = 1; i < polygon.points3D.length - 1; i++) {
        indices.push(0, i, i + 1);
      }
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
  
      let fillColor = polygon.color;
      if (fillColor && fillColor[0] !== "#") {
        fillColor = "#" + fillColor;
      }
      const material = new THREE.MeshStandardMaterial({
        color: fillColor || "#cccccc",
        side: THREE.DoubleSide
      });
  
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
    });
  
    // if (section.boreholes && section.boreholes.length > 0) {
    //   section.boreholes.forEach(b => {
    //     const x = b.x / scaleFactor;
    //     const z = 0;
  
    //     if (x < minX) minX = x;
    //     if (x > maxX) maxX = x;
    //     if (z < minZ) minZ = z;
    //     if (z > maxZ) maxZ = z;
  
    //     const topY = b.elevation / scaleFactor;
    //     const height = (b.depth || 10) / scaleFactor;
    //     const bottomY = topY - height;
    //     const centerY = (topY + bottomY) / 2;
  
    //     const radius = 2;
    //     const radialSegments = 16;
    //     const cylinderGeo = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
    //     const cylinderMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    //     const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
  
    //     cylinder.position.set(x, centerY, z);
    //     cylinder.rotation.x = -Math.PI / 2; // Dựng borehole đứng dọc
    //     group.add(cylinder);
    //   });
    // }
  
    group.rotation.x = -Math.PI / 2;
  
    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY) || !isFinite(minZ) || !isFinite(maxZ)) {
      console.warn("No valid data for bounding grid.");
      minX = -100; maxX = 100;
      minZ = -100; maxZ = 100;
    }
  
    const minZ_scene = -maxY;
    const maxZ_scene = -minY;
    const gridWidth = maxX - minX;
    const gridDepth = maxZ_scene - minZ_scene;
    const gridSize = Math.max(gridWidth, gridDepth);
    const gridDivisions = 10;
    const gridCenterX = (minX + maxX) / 2;
    const gridCenterZ = (minZ_scene + maxZ_scene) / 2;
  
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x888888);
    gridHelper.position.set(gridCenterX, 0, gridCenterZ);
    scene.add(gridHelper);
  
    // Thêm nhãn cho trục X và Z
    const labelCount = gridDivisions + 1;
    for (let i = 0; i < labelCount; i++) {
      const x = minX + i * (maxX - minX) / gridDivisions;
      const z = minZ_scene - 5;
      const labelValue = (x * scaleFactor).toFixed(2);
      const sprite = makeTextSprite(labelValue);
      sprite.position.set(x, 0.1, z);
      scene.add(sprite);
    }
    for (let i = 0; i < labelCount; i++) {
      const z = minZ_scene + i * (maxZ_scene - minZ_scene) / gridDivisions;
      const x = minX - 5;
      const labelValue = (z * scaleFactor).toFixed(2);
      const sprite = makeTextSprite(labelValue);
      sprite.position.set(x, 0.1, z);
      scene.add(sprite);
    }
  
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.update();
  
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }
});
