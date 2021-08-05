mod utils;

extern crate js_sys;
use kdtree::distance::squared_euclidean;
use kdtree::ErrorKind;
use kdtree::KdTree;

use wasm_bindgen::prelude::*;
// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

struct Starling {
    x: f32,
    y: f32,
    dx: f32,
    dy: f32,
}

impl Starling {
    fn new(width: u32, height: u32) -> Starling {
        Starling {
            x: js_sys::Math::random() as f32 * width as f32,
            y: js_sys::Math::random() as f32 * height as f32,
            dx: js_sys::Math::random() as f32 * 10 as f32,
            dy: js_sys::Math::random() as f32 * 10 as f32,
        }
    }
}

pub struct Murmuration {
    size: u32,
    width: u32,
    height: u32,
    flock: Vec<Starling>,
    speed_limit: u32,
    visual_field: u32,
    seperation_distance: u32,
    seperation_coefficient: f32,
    alignment_coefficient: f32,
    cohesion_coefficient: f32,
    boundary_margin: u32,
    boundary_coefficient: f32,
}

impl Murmuration {
    pub fn tick(&mut self) {
        for starling in self.flock.iter(){
            let local = get_neighbours(starling, self.seperation_distance);
            let visual = get_neighbours(starling, self.seperation_distance);

            
        }
    }

    fn new() -> Murmuration {
        let width = 1000;
        let height = 1000;
        let size = 500;
        let mut flock: Vec<Starling> = Vec::new();
        for n in 0..size {
            flock.push(Starling::new(width, height));
        }

    }

    //Switch these so that they do not modify the starling dx values directly
    fn seperate(&self, starling: &mut Starling, neighbours: Vec<Starling>) {
        let mut x_delta = 0.;
        let mut y_delta = 0.;
        for neighbour in neighbours.iter() {
            x_delta += starling.x - neighbour.x;
            y_delta += starling.y - neighbour.y;
        }

        starling.dx += x_delta * self.seperation_coefficient;
        starling.dy += y_delta * self.seperation_coefficient;
    }

    fn align(&self, starling: &mut Starling, neighbours: &Vec<Starling>) {
        let mut avg_dx = 0.;
        let mut avg_dy = 0.;
        for neighbour in neighbours.iter() {
            avg_dx += neighbour.dx;
            avg_dy += neighbour.dy;
        }
        if neighbours.len() > 0 {
            starling.dx += (avg_dx / neighbours.len() as f32) * self.alignment_coefficient;
            starling.dy += (avg_dy / neighbours.len() as f32) * self.alignment_coefficient;
        }
    }

    fn cohere(&self, starling: &mut Starling, neighbours: &Vec<Starling>) {
        let mut avg_x = 0.;
        let mut avg_y = 0.;

        for neighbour in neighbours.iter() {
            avg_x += neighbour.x;
            avg_y += neighbour.y;
        }

        if neighbours.len() > 0 {
            starling.dx +=
                (avg_x / neighbours.len() as f32 - starling.x) * self.cohesion_coefficient;
            starling.dy +=
                (avg_y / neighbours.len() as f32 - starling.y) * self.cohesion_coefficient;
        }
    }

    fn get_neighbours(starling: &Starling, range: u32) -> Vec<Starling> {}
}
