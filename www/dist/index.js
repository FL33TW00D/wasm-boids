//TODO
//1. Work out correct scaling for the axes
//2. Custom geometry
//3. Custom lighting
//4. Skybox
//5. Optimize depth calculation
//6. Setup rust in a web worker
//7. Use dx, dy, dz values to rotate the starling in the correct direction
//8. Normalize the bounds of the axis between 0 and 1
import { Murmuration } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";
import * as THREE from "three";
function main() {
    const canvas = document.querySelector("#canvas");
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
    });
    let HEIGHT = window.innerHeight;
    let WIDTH = window.innerWidth;
    // Create the camera
    let aspectRatio = WIDTH / HEIGHT;
    let fieldOfView = 60;
    let nearPlane = 1;
    let farPlane = 10000;
    let camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
    camera.position.z = 4;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
    let ambientLight = new THREE.AmbientLight(0xdc8874, 0.5);
    scene.add(ambientLight);
    const radius = 0.02;
    const height = 0.1;
    const radialSegments = 6;
    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
    function makeInstance(geometry, posvec) {
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(parseInt("0x321100"
            //"0x" + Math.floor(Math.random() * 16777215).toString(16)
            )),
            flatShading: true,
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        cube.position.x = posvec.x;
        cube.position.y = posvec.y;
        cube.position.z = posvec.z;
        return cube;
    }
    const murmuration = Murmuration.new(canvas.width, canvas.height, 50);
    const flockSize = murmuration.size();
    const starlingPtr = murmuration.flock();
    const starlingFields = new Float32Array(memory.buffer, starlingPtr, flockSize * 6);
    const cubes = [];
    for (let i = 0; i < starlingFields.length - 5; i += 6) {
        cubes.push(makeInstance(geometry, new THREE.Vector3(starlingFields[i], starlingFields[i + 1], starlingFields[i + 2] * -1)));
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
    resizeRendererToDisplaySize(renderer);
    function render() {
        murmuration.tick();
        const starlingPtr = murmuration.flock();
        const starlingFields = new Float32Array(memory.buffer, starlingPtr, flockSize * 6);
        let cubeIdx = 0;
        for (let i = 0; i < starlingFields.length - 5; i += 6) {
            /*
            console.log(
                `JS STARLING ${cubeIdx}: ${starlingFields[i] / 300} ${
                    starlingFields[i + 1] / 150
                } ${(starlingFields[i + 2] * -1) / 700} ${starlingFields[i + 3]} ${
                    starlingFields[i + 4]
                } ${starlingFields[i + 5]}`
            );
            */
            //these need to be normalized to negative, currently really dumb
            cubes[cubeIdx].position.x = starlingFields[i] / 300;
            cubes[cubeIdx].position.y = starlingFields[i + 1] / 150;
            cubes[cubeIdx++].position.z = (starlingFields[i + 2] * -1) / 1000;
        }
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
function createLighting() { }
main();
//# sourceMappingURL=index.js.map