import { Murmuration } from "wasm-boids";
import { memory } from "wasm-boids/wasm_boids_bg.wasm";
import * as THREE from "three";
function main() {
    const canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const murmuration = new Murmuration(canvas.width, canvas.height, 700);
    const flockSize = murmuration.size;
    const starlingPtr = murmuration.flock;
    const starlings = new Float32Array(memory.buffer, starlingPtr, flockSize * 6);
    const renderer = new THREE.WebGLRenderer({ canvas });
    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 700;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 2;
    const scene = new THREE.Scene();
    const boxWidth = .5;
    const boxHeight = .5;
    const boxDepth = .5;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
    //initialising the array of cubes that we will set the positions of to
    //animate
    const starlingCubes = [];
    for (let i = 0; i < starlings.length - 6; i += 6) {
        let cubyStarling = new THREE.Mesh(geometry, material);
        console.log(`Setting initial starling cube positions: x: ${starlings[i]} y: ${starlings[i + 1]} z: ${starlings[i + 2]}`);
        cubyStarling.position.set(starlings[i], starlings[i + 1], starlings[i + 2] * -1);
        starlingCubes.push(cubyStarling);
        scene.add(cubyStarling);
    }
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
    renderer.render(scene, camera);
    requestAnimationFrame(drawScene);
    function drawScene(time) {
        murmuration.tick();
        time *= 0.001; // convert time to seconds
        let cubeIdx = 0;
        for (let i = 0; i < starlings.length - 6; i += 6) {
            starlingCubes[cubeIdx++].position.set(starlings[i], starlings[i + 1], starlings[i + 2] * -1);
        }
        renderer.render(scene, camera);
        requestAnimationFrame(drawScene);
    }
}
//Defines the 3D shape of a Boid from 10 triangles
function createBoid(gl) {
    let positions = new Float32Array([
        //3
        100, 100, 0, 50, 50, 150, 150, 50, 0,
        //4
        150, 50, 0, 50, 50, 150, 100, 0, 0,
        //10
        100, 0, 0, 100, 100, 0, 150, 50, 0,
        //1
        -50, 50, 0, 50, 50, 150, 0, 100, 0,
        //2
        0, 100, 0, 50, 50, 150, 100, 100, 0,
        //6
        0, 0, 0, 50, 50, 150, -50, 50, 0,
        //7
        0, 100, 0, 0, 0, 0, -50, 50, 0,
        //5
        100, 0, 0, 50, 50, 150, 0, 0, 0,
        //8
        0, 0, 0, 0, 100, 0, 100, 0, 0,
        //9
        100, 0, 0, 0, 100, 0, 100, 100, 0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}
function setColors(gl) {
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([
        200, 70, 120, 200, 70, 120, 200, 70, 120,
        240, 70, 120, 240, 70, 120, 240, 70, 120,
        200, 70, 170, 200, 70, 170, 200, 70, 170,
        80, 70, 200, 80, 70, 200, 80, 70, 200,
        80, 10, 200, 80, 10, 200, 80, 10, 200,
        80, 70, 230, 80, 70, 230, 80, 70, 230,
        70, 200, 210, 70, 200, 210, 70, 200, 210,
        200, 250, 70, 200, 250, 70, 200, 250, 70,
        210, 100, 70, 210, 100, 70, 210, 100, 70,
        210, 160, 70, 210, 160, 70, 210, 160, 70,
    ]), gl.STATIC_DRAW);
}
main();
//# sourceMappingURL=index.js.map