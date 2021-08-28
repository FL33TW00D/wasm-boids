//TODO
//1. Work out correct scaling for the axes
//2. Custom geometry
//3. Custom lighting
//4. Skybox
//5. Optimize depth calculation
//6. Setup rust in a web worker
//7. FPS view toggle
import { Murmuration } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";
import * as THREE from "three";
import Stats from "stats.js";
let HEIGHT = window.innerHeight;
let WIDTH = window.innerWidth;
const DEPTH = 300;
let DEBUG = true;
function main() {
    const canvas = document.querySelector("#canvas");
    const div = document.getElementById("container");
    let stats = new Stats();
    div.appendChild(stats.dom);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
    });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio);
    resizeRendererToDisplaySize(renderer);
    renderer.shadowMap.enabled = true;
    let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 350;
    const scene = new THREE.Scene();
    sceneSetup(scene);
    const radius = 2;
    const height = 10;
    const radialSegments = 8;
    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
    if (DEBUG) {
        debugBoxes(scene);
    }
    const murmuration = new Murmuration(canvas.width, canvas.height, DEPTH);
    const flockSize = murmuration.size();
    const starlingPtr = murmuration.flock();
    const starlingFields = new Float32Array(memory.buffer, starlingPtr, flockSize * 6);
    const boidMeshs = createMeshes(starlingFields, geometry, scene);
    function render() {
        updateBoids(murmuration, flockSize, boidMeshs, camera);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        stats.update();
    }
    requestAnimationFrame(render);
}
function makeInstance(scene, geometry, posvec) {
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(parseInt("0x231000")),
        flatShading: true,
    });
    //Mesh is just an extension of Object3D
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.position.x = posvec.x;
    mesh.position.y = posvec.y;
    mesh.position.z = posvec.z;
    return mesh;
}
function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}
function updateBoids(murmuration, flockSize, boidMeshs, camera) {
    murmuration.tick();
    const starlingPtr = murmuration.flock();
    const starlingFields = new Float32Array(memory.buffer, starlingPtr, flockSize * 6);
    let boidIdx = 0;
    for (let i = 0; i < starlingFields.length - 5; i += 6) {
        setBoidPosition(boidMeshs[boidIdx], starlingFields, i, camera.aspect);
        setBoidRotation(boidMeshs[boidIdx], starlingFields, i);
        boidIdx++;
    }
}
function sceneSetup(scene) {
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
    let ambientLight = new THREE.AmbientLight(0xdc8874, 0.5);
    scene.add(ambientLight);
    let hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);
    hemisphereLight.position.z = 10;
    scene.add(hemisphereLight);
}
function debugBoxes(scene) {
    const box = new THREE.BoxGeometry(5, 5, 5);
    makeInstance(scene, box, new THREE.Vector3(100, 100, -2));
    makeInstance(scene, box, new THREE.Vector3(100, -100, -2));
    makeInstance(scene, box, new THREE.Vector3(-100, 100, -2));
    makeInstance(scene, box, new THREE.Vector3(-100, -100, -2));
}
function createMeshes(starlingFields, geometry, scene) {
    const boidMeshs = [];
    for (let i = 0; i < starlingFields.length - 5; i += 6) {
        boidMeshs.push(makeInstance(scene, geometry, new THREE.Vector3(starlingFields[i], starlingFields[i + 1], starlingFields[i + 2] * -1)));
    }
    return boidMeshs;
}
function setBoidPosition(boid, starlingFields, idx, aspect) {
    boid.position.x = ((starlingFields[idx] / WIDTH) * 2 - 1) * aspect * 100;
    boid.position.y = (-(starlingFields[idx + 1] / HEIGHT) * 2 + 1) * 100;
    boid.position.z = (starlingFields[idx + 2] / DEPTH) * -1;
}
function setBoidRotation(boid, starlingFields, idx) {
    let quaternion = new THREE.Quaternion();
    let yAxis = new THREE.Vector3(0, 1, 0);
    let travelVector = new THREE.Vector3(starlingFields[idx + 3], starlingFields[idx + 4] * -1, starlingFields[idx + 5] * -1).normalize();
    quaternion.setFromUnitVectors(yAxis, travelVector);
    boid.setRotationFromQuaternion(quaternion);
}
main();
//# sourceMappingURL=index.js.map