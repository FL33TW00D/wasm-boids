# wasm-boids
<div align="center">
<img src="./imgs/boids_3d.gif" width=100%/><br/>  
</div>
<br></br>



A Rust 🦀 and WebAssembly 🕸 implementation of Craig Reynolds boids algorithm. This implementation is designed to mimick real mumurations by starlings.
Implemented using a KD-Tree for fast nearest neighbour search. Running inside Three.JS.


This implementation is capable of running with 2000 flock members at 60fps on a 2020 M1 Macbook Pro.
