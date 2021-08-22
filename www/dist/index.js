import { Murmuration } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";
import * as THREE from "three";
function main() {
    const canvas = document.querySelector("#canvas");
    //    canvas.width = window.innerWidth;
    //    canvas.height = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas });
    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 700;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 10;
    const scene = new THREE.Scene();
    {
        const color = 0xffffff;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
    }
    const boxWidth = 0.05;
    const boxHeight = 0.05;
    const boxDepth = 0.05;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    function makeInstance(geometry, posvec) {
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(parseInt("0x" + Math.floor(Math.random() * 16777215).toString(16))),
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        cube.position.x = posvec.x;
        cube.position.y = posvec.y;
        cube.position.z = posvec.z;
        return cube;
    }
    const murmuration = Murmuration.new(canvas.width, canvas.height, 700);
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
            console.log(`JS STARLING ${cubeIdx}: ${starlingFields[i] / 300} ${starlingFields[i + 1] / 150} ${(starlingFields[i + 2] * -1) / 700} ${starlingFields[i + 3]} ${starlingFields[i + 4]} ${starlingFields[i + 5]}`);
            cubes[cubeIdx].position.x = starlingFields[i] / 300;
            cubes[cubeIdx].position.y = starlingFields[i + 1] / 150;
            cubes[cubeIdx++].position.z = (starlingFields[i + 2] * -1) / 700;
        }
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
main();
//# sourceMappingURL=index.js.map