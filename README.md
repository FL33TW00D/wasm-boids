# wasm-boids
<div align="center">
<img src="./imgs/boids.gif" width=100%/><br/>  
</div>
A Rust 🦀 and WebAssembly 🕸 implementation of Craig Reynolds boids algorithm. This implementation is designed to mimick real mumurations by starlings.
Implemented using a KD-Tree for fast nearest neighbour search.

Improvements:
1. Bird FOV
2. WebGL implementation to speed up drawing of boids ( taking approximately 25%
   of execution time right now)
3. 3D version in WebGL
4. Seperate WebWorker for running the neighbour search
