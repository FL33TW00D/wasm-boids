//TODO
//1. Work out correct scaling for the axes
//2. Custom geometry
//3. Custom lighting
//4. Skybox
//5. Optimize depth calculation
//6. Setup rust in a web worker
//8. Normalize the bounds of the axis between 0 and 1
import { Murmuration } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";
import * as THREE from "three";
let HEIGHT = window.innerHeight;
let WIDTH = window.innerWidth;
const DEPTH = 500;
function main() {
    const canvas = document.querySelector("#canvas");
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        //have to profile how much impact this has on performance
        antialias: false
    });
    // Define the size of the renderer; in this case,
    // it will fill the entire screen
    renderer.setSize(WIDTH, HEIGHT);
    resizeRendererToDisplaySize(renderer);
    // Enable shadow rendering
    renderer.shadowMap.enabled = true;
    // Create the camera
    let aspectRatio = WIDTH / HEIGHT;
    let fieldOfView = 30;
    let nearPlane = 1;
    let farPlane = DEPTH;
    let camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
    //need to think about this
    camera.position.x = 0;
    camera.position.z = 5;
    camera.position.y = 0;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
    let ambientLight = new THREE.AmbientLight(0xdc8874, 0.5);
    scene.add(ambientLight);
    const helper = new THREE.CameraHelper(camera);
    scene.add(helper);
    let hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);
    hemisphereLight.position.z = 10;
    scene.add(hemisphereLight);
    const radius = 0.01;
    const height = 0.05;
    const radialSegments = 6;
    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
    const murmuration = Murmuration.new(canvas.width, canvas.height, DEPTH);
    const flockSize = murmuration.size();
    const starlingPtr = murmuration.flock();
    const starlingFields = new Float32Array(memory.buffer, starlingPtr, flockSize * 6);
    const boidMeshs = [];
    for (let i = 0; i < starlingFields.length - 5; i += 6) {
        boidMeshs.push(makeInstance(scene, geometry, new THREE.Vector3(starlingFields[i], starlingFields[i + 1], starlingFields[i + 2] * -1)));
    }
    function render() {
        updateBoids(murmuration, flockSize, boidMeshs, camera);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
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
        /*
        console.log(
            `JS STARLING ${boidIdx}: ${-1 + (starlingFields[i] / WIDTH) * 2} ${
                1 + (starlingFields[i + 1] / HEIGHT) * 2
            } ${starlingFields[i + 2] / DEPTH} ${starlingFields[i + 3]} ${
                starlingFields[i + 4]
            } ${starlingFields[i + 5]}`
        );
        */
        console.log(`\n X POS: ${starlingFields[i]} \n Y POS: ${starlingFields[i + 1]} \n
                     XT: ${(starlingFields[i] / WIDTH) * 2 - 1} \n
                     YT: ${-(starlingFields[i + 1] / HEIGHT) * 2 + 1}
            `);
        boidMeshs[boidIdx].position.x = (starlingFields[i] / WIDTH) * 2 - 1;
        boidMeshs[boidIdx].position.y =
            -(starlingFields[i + 1] / HEIGHT) * 2 + 1;
        //multiplying by -1 so rust world can be all +ve and z-axis in THREE
        //world can be -ve
        //this sucks
        boidMeshs[boidIdx].position.z = (starlingFields[i + 2] / DEPTH) * -1;
        var quaternion = new THREE.Quaternion();
        let yAxis = new THREE.Vector3(0, 1, 0);
        let travelVector = new THREE.Vector3(starlingFields[i + 3], starlingFields[i + 4] * -1, starlingFields[i + 5] * -1).normalize();
        boidMeshs[boidIdx];
        quaternion.setFromUnitVectors(yAxis, travelVector);
        boidMeshs[boidIdx].setRotationFromQuaternion(quaternion);
        boidIdx++;
    }
}
main();
//# sourceMappingURL=index.js.map