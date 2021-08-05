mod utils;

use kdtree::KdTree;
use kdtree::ErrorKind;
use kdtree::distance::squared_euclidean;

use wasm_bindgen::prelude::*;
// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

let dimensions = 2;



#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

struct Starling {
    x: u32,
    y: u32,
    dx: i32,
    dy: i32,
}


