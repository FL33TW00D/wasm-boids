//TODO
//1. Work out correct scaling for the axes
//2. Custom geometry
//6. Setup rust in a web worker
//7. FPS view toggle

import { Murmuration, Starling } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";
import * as THREE from "three";
import Stats from "stats.js";

let HEIGHT = window.innerHeight;
let WIDTH = window.innerWidth;
const DEPTH = 400;
let DEBUG = true;

function main() {
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
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
    let camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        3000
    );
    console.log(`WIDTH: ${WIDTH}, HEIGHT:${HEIGHT}`);
    /*
    camera.position.x = (screenToWorldX(WIDTH, WIDTH, camera.aspect, 100) - screenToWorldX(0, WIDTH, camera.aspect, 100)) * 2;
    camera.position.y = (screenToWorldY(HEIGHT, HEIGHT, 100) - screenToWorldY(0, HEIGHT, 100)) * 2;
    */
    console.log(`CAMERA POSITION: ${JSON.stringify(camera.position)}`);
    camera.position.z = 350;

    const scene = new THREE.Scene();
    sceneSetup(scene);

    if (DEBUG) {
        const helper = new THREE.CameraHelper(camera);
        scene.add(helper);
    }

    const radius = 1;
    const height = 7;
    const radialSegments = 8;
    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);

    if (DEBUG) {
        debugBoxes(scene);
    }

    const murmuration = new Murmuration(canvas.width, canvas.height, DEPTH);
    const flockSize = murmuration.size();

    const starlingPtr = murmuration.flock();
    const starlingFields = new Float32Array(
        memory.buffer,
        starlingPtr,
        flockSize * 6
    );

    const boidMeshs = createMeshes(starlingFields, geometry, scene);
    function render() {
        updateBoids(murmuration, flockSize, boidMeshs, camera);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        stats.update();
    }
    requestAnimationFrame(render);
}

function makeInstance(
    scene: THREE.Scene,
    geometry: any,
    posvec: THREE.Vector3
) {
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(parseInt("0x231000")),
        flatShading: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    mesh.position.x = posvec.x;
    mesh.position.y = posvec.y;
    mesh.position.z = posvec.z;
    return mesh;
}

function resizeRendererToDisplaySize(renderer: any) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function updateBoids(
    murmuration: Murmuration,
    flockSize: number,
    boidMeshs: THREE.Mesh[],
    camera: any
) {
    murmuration.tick();
    const starlingPtr = murmuration.flock();
    const starlingFields = new Float32Array(
        memory.buffer,
        starlingPtr,
        flockSize * 6
    );

    let boidIdx = 0;
    for (let i = 0; i < starlingFields.length - 5; i += 6) {
        setBoidPosition(boidMeshs[boidIdx], starlingFields, i, camera.aspect);
        setBoidRotation(boidMeshs[boidIdx], starlingFields, i);
        boidIdx++;
    }
}

function sceneSetup(scene: THREE.Scene) {
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
    let ambientLight = new THREE.AmbientLight(0xdc8874, 0.5);
    scene.add(ambientLight);
    let hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);
    hemisphereLight.position.z = 350;
    scene.add(hemisphereLight);
}

function debugBoxes(scene: THREE.Scene) {
    const box = new THREE.BoxGeometry(5, 5, 5);
    makeInstance(scene, box, new THREE.Vector3(100, 100, -2));
    makeInstance(scene, box, new THREE.Vector3(100, -100, -2));
    makeInstance(scene, box, new THREE.Vector3(-100, 100, -2));
    makeInstance(scene, box, new THREE.Vector3(-100, -100, -2));
}

function createMeshes(
    starlingFields: Float32Array,
    geometry: THREE.ConeGeometry,
    scene: THREE.Scene
) {
    const boidMeshs: any[] = [];
    for (let i = 0; i < starlingFields.length - 5; i += 6) {
        boidMeshs.push(
            makeInstance(
                scene,
                geometry,
                new THREE.Vector3(
                    starlingFields[i],
                    starlingFields[i + 1],
                    starlingFields[i + 2] * -1
                )
            )
        );
    }
    return boidMeshs;
}

function setBoidPosition(
    boid: THREE.Mesh,
    starlingFields: Float32Array,
    idx: number,
    aspect: number
) {
    boid.position.x = screenToWorldX(starlingFields[idx], WIDTH, aspect, 100); 
    boid.position.y = screenToWorldY(starlingFields[idx + 1], HEIGHT, 100); 
    boid.position.z = (starlingFields[idx + 2] / DEPTH) * -1;
}

function setBoidRotation(
    boid: THREE.Mesh,
    starlingFields: Float32Array,
    idx: number
) {
    let quaternion = new THREE.Quaternion();
    let yAxis = new THREE.Vector3(0, 1, 0);
    let travelVector = new THREE.Vector3(
        starlingFields[idx + 3],
        starlingFields[idx + 4] * -1,
        starlingFields[idx + 5] * -1
    ).normalize();
    quaternion.setFromUnitVectors(yAxis, travelVector);
    boid.setRotationFromQuaternion(quaternion);
}

function screenToWorldX(coord: number, width: number, aspect: number, scaleFactor: number){
    return ((coord / width) * 2 - 1) * aspect * scaleFactor;
}

function screenToWorldY(coord: number, height: number, scaleFactor:number){
   return (-(coord / height) * 2 + 1) * scaleFactor;
}

main();
