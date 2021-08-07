mod utils;

extern crate js_sys;
extern crate web_sys;

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

use kdtree::distance::squared_euclidean;
use kdtree::KdTree;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Starling {
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

#[wasm_bindgen]
pub struct Murmuration {
    size: u32,
    width: u32,
    height: u32,
    flock: Vec<Starling>,
    tree: KdTree<f32, usize, [f32; 2]>,
    speed_limit: f32,
    visual_field: f32,
    seperation_distance: f32,
    seperation_coefficient: f32,
    alignment_coefficient: f32,
    cohesion_coefficient: f32,
    boundary_margin: u32,
    boundary_coefficient: f32,
}

fn build_tree(flock: &Vec<Starling>) -> KdTree<f32, usize, [f32; 2]> {
    let mut tree = KdTree::new(2);
    for (idx, starling) in flock.iter().enumerate() {
        tree.add([starling.x, starling.y], idx).unwrap();
    }
    tree
}

#[wasm_bindgen]
impl Murmuration {
    pub fn new() -> Murmuration {
        utils::set_panic_hook();
        let size = 1000;
        let width = 2560;
        let height = 1440;
        let speed_limit = 110.;
        let visual_field = 4500.;
        let seperation_distance = 300.;
        let seperation_coefficient = 0.05;
        let alignment_coefficient = 0.05;
        let cohesion_coefficient = 0.01;
        let boundary_margin = 150;
        let boundary_coefficient = 0.75;

        let mut flock: Vec<Starling> = Vec::new();
        for _ in 0..size {
            flock.push(Starling::new(width, height));
        }

        let tree = build_tree(&flock);

        Murmuration {
            size,
            width,
            height,
            flock,
            tree,
            speed_limit,
            visual_field,
            seperation_distance,
            seperation_coefficient,
            alignment_coefficient,
            cohesion_coefficient,
            boundary_margin,
            boundary_coefficient,
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn size(&self) -> u32 {
        self.size
    }

    pub fn flock(&self) -> *const Starling {
        self.flock.as_ptr()
    }

    pub fn tick(&mut self) {
        self.tree = build_tree(&self.flock);
        let mut new_flock = Vec::new();

        for starling in self.flock.iter() {
            let mut visual_neighbours = self.get_neighbours(starling, self.visual_field);
            let visual_ids = self.extract_ids(&visual_neighbours);
            let local_ids = self.neighbour_subset(&mut visual_neighbours, self.seperation_distance);

            let (avg_x, avg_y) = self.cohere(&starling, &self.flock, &visual_ids);
            let (x_delta, y_delta) = self.seperate(&starling, &self.flock, &local_ids);
            let (avg_dx, avg_dy) = self.align(&self.flock, &visual_ids);

            let mut new_dx = starling.dx + avg_x + x_delta + avg_dx;
            let mut new_dy = starling.dy + avg_y + y_delta + avg_dy;

            self.limit_speed(&mut new_dx, &mut new_dy);
            let mut new_starling = Starling {
                x: starling.x + new_dx,
                y: starling.y + new_dy,
                dx: new_dx,
                dy: new_dy,
            };

            self.check_bounds(
                &new_starling.x,
                &new_starling.y,
                &mut new_starling.dx,
                &mut new_starling.dy,
            );
            new_flock.push(new_starling);
        }
        self.flock = new_flock;
    }

    fn limit_speed(&self, dx: &mut f32, dy: &mut f32) {
        let speed = dx.powi(2) + dy.powi(2);
        if speed > self.speed_limit {
            *dx = (*dx / speed) * self.speed_limit;
            *dy = (*dy / speed) * self.speed_limit;
        }
    }

    fn check_bounds(&self, xpos: &f32, ypos: &f32, dx: &mut f32, dy: &mut f32) {
        if *xpos > (self.width - self.boundary_margin) as f32 {
            *dx -= self.boundary_coefficient;
        }
        if *xpos < self.boundary_margin as f32 {
            *dx += self.boundary_coefficient;
        }
        if *ypos > (self.height - self.boundary_margin) as f32 {
            *dy -= self.boundary_coefficient;
        }
        if *ypos < self.boundary_margin as f32 {
            *dy += self.boundary_coefficient;
        }
    }

    fn seperate(
        &self,
        starling: &Starling,
        flock: &Vec<Starling>,
        neighbours: &Vec<usize>,
    ) -> (f32, f32) {
        let mut x_delta = 0.;
        let mut y_delta = 0.;
        for idx in neighbours.iter() {
            x_delta += starling.x - flock.get(*idx).unwrap().x;
            y_delta += starling.y - flock.get(*idx).unwrap().y;
        }
        (
            x_delta * self.seperation_coefficient,
            y_delta * self.seperation_coefficient,
        )
    }

    fn align(&self, flock: &Vec<Starling>, neighbours: &Vec<usize>) -> (f32, f32) {
        let mut avg_dx = 0.;
        let mut avg_dy = 0.;
        for idx in neighbours.iter() {
            avg_dx += flock.get(*idx).unwrap().dx;
            avg_dy += flock.get(*idx).unwrap().dy;
        }

        if neighbours.len() > 0 {
            avg_dx = (avg_dx / neighbours.len() as f32) * self.alignment_coefficient;
            avg_dy = (avg_dy / neighbours.len() as f32) * self.alignment_coefficient;
        }

        (avg_dx, avg_dy)
    }

    fn cohere(
        &self,
        starling: &Starling,
        flock: &Vec<Starling>,
        neighbours: &Vec<usize>,
    ) -> (f32, f32) {
        let mut avg_x = 0.;
        let mut avg_y = 0.;

        for idx in neighbours.iter() {
            avg_x += flock.get(*idx).unwrap().x;
            avg_y += flock.get(*idx).unwrap().y;
        }

        if neighbours.len() > 0 {
            avg_x = (avg_x / neighbours.len() as f32 - starling.x) * self.cohesion_coefficient;
            avg_y = (avg_y / neighbours.len() as f32 - starling.y) * self.cohesion_coefficient;
        }
        (avg_x, avg_y)
    }

    //Returns a vector (distance_from_point:f32, vec_idx:&usize)
    fn get_neighbours(&self, starling: &Starling, range: f32) -> Vec<(f32, &usize)> {
        let mut neighbour_idx = Vec::new();
        let neighbours = self
            .tree
            .within(&[starling.x, starling.y], range, &squared_euclidean)
            .unwrap();

        //Dumb way of checking if the thing isn't self, must think about how to speed this up
        for data in neighbours.iter() {
            if data.0 != 0. {
                neighbour_idx.push(*data);
            }
        }

        neighbour_idx
    }

    fn neighbour_subset(&self, neighbours: &mut Vec<(f32, &usize)>, range: f32) -> Vec<usize> {
        neighbours.sort_unstable_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let partition = neighbours.partition_point(|&x| x.0 < range);
        self.extract_ids(&neighbours[..partition].to_vec())
    }

    fn extract_ids(&self, neighbours: &Vec<(f32, &usize)>) -> Vec<usize> {
        let mut ids = Vec::new();
        for tup in neighbours.iter() {
            ids.push(*tup.1);
        }
        ids
    }
}
