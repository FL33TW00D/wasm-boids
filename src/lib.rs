mod utils;

extern crate js_sys;

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

use kiddo::distance::squared_euclidean;
use kiddo::KdTree;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Position {
    x: f32,
    y: f32,
    z: f32,
}
#[wasm_bindgen]
impl Position {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Position { x, y, z }
    }

    fn init_rand(width: u32, height: u32, depth: u32) -> Self {
        Position {
            x: js_sys::Math::random() as f32 * width as f32,
            y: js_sys::Math::random() as f32 * height as f32,
            z: js_sys::Math::random() as f32 * depth as f32,
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Velocity {
    dx: f32,
    dy: f32,
    dz: f32,
}

#[wasm_bindgen]
impl Velocity {
    #[wasm_bindgen(constructor)]
    pub fn new(dx: f32, dy: f32, dz: f32) -> Self {
        Velocity { dx, dy, dz }
    }

    fn init_rand(speed: f32) -> Self {
        Velocity {
            dx: js_sys::Math::random() as f32 * speed,
            dy: js_sys::Math::random() as f32 * speed,
            dz: js_sys::Math::random() as f32 * speed,
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Starling {
    x: f32,
    y: f32,
    z: f32,
    dx: f32,
    dy: f32,
    dz: f32,
}

#[wasm_bindgen]
impl Starling {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, z: f32, dx: f32, dy: f32, dz: f32) -> Self {
        Starling {
            x,
            y,
            z,
            dx,
            dy,
            dz
        }
    }

    fn init_rand(width: u32, height: u32, depth: u32, speed_limit: f32) -> Self {
        Starling {
            x: js_sys::Math::random() as f32 * width as f32,
            y: js_sys::Math::random() as f32 * height as f32,
            z: js_sys::Math::random() as f32 * depth as f32,
            dx: js_sys::Math::random() as f32 * speed_limit,
            dy: js_sys::Math::random() as f32 * speed_limit,
            dz: js_sys::Math::random() as f32 * speed_limit,
        }
    }
}

#[wasm_bindgen]
pub struct Murmuration {
    size: u32,
    width: u32,
    height: u32,
    depth: u32,
    flock: Vec<Starling>,
    tree: KdTree<f32, usize, 3>,
    speed_limit: f32,
    visual_field: f32,
    seperation_distance: f32,
    seperation_coefficient: f32,
    alignment_coefficient: f32,
    cohesion_coefficient: f32,
    boundary_margin: f32,
    boundary_coefficient: f32,
}

fn build_tree(flock: &[Starling]) -> KdTree<f32, usize, 3> {
    let mut tree = KdTree::new();

    for (idx, starling) in flock.iter().enumerate() {
        tree.add(
            &[
                starling.x,
                starling.y,
                starling.z,
            ],
            idx,
        )
        .unwrap();
    }

    tree
}
impl Default for Murmuration {
    fn default() -> Self {
        Self::new(1920, 1080, 700)
    }
}

#[wasm_bindgen]
impl Murmuration {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, depth: u32) -> Murmuration {
        utils::set_panic_hook();
        let size = 10;
        let speed_limit = 70.;
        let visual_field = 5000.;
        let seperation_distance = 600.;
        let seperation_coefficient = 0.05;
        let alignment_coefficient = 0.05;
        let cohesion_coefficient = 0.008;
        //boundary margin and coefficient must be relative to canvas size
        let boundary_margin = 0.15;
        let boundary_coefficient = 0.25;

        let mut flock: Vec<Starling> = Vec::new();
        for _ in 0..size {
            flock.push(Starling::init_rand(width, height, depth, 10.));
        }

        let tree = build_tree(&flock);

        Murmuration {
            size,
            width,
            height,
            depth,
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

    #[wasm_bindgen(getter)]
    pub fn size(&self) -> u32 {
        self.size
    }

    #[wasm_bindgen(getter)]
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

            let center_of_mass = self.cohere(&starling, &self.flock, &visual_ids);
            let position_delta = self.seperate(&starling, &self.flock, &local_ids);
            let average_vel = self.align(&self.flock, &visual_ids);

            let mut updated_starling = Starling {
                x: starling.x + starling.dx + center_of_mass.x + position_delta.x + average_vel.dx,
                y: starling.y + starling.dy + center_of_mass.y + position_delta.y + average_vel.dy,
                z: starling.z + starling.dx + center_of_mass.z + position_delta.z + average_vel.dz,
                dx: starling.dx + center_of_mass.x + position_delta.x + average_vel.dx,
                dy: starling.dy + center_of_mass.y + position_delta.y + average_vel.dy,
                dz: starling.dz + center_of_mass.z + position_delta.z + average_vel.dz,
            };

            self.limit_speed(&mut updated_starling);

            self.check_bounds(&mut updated_starling);
            log!("{:?}", updated_starling);
            new_flock.push(updated_starling);
        }
        self.flock = new_flock;
    }

    fn limit_speed(&self, updated_starling: &mut Starling) {
        let speed = updated_starling.dx.powi(2) + updated_starling.dy.powi(2) + updated_starling.dz.powi(2);
        if speed > self.speed_limit {
            updated_starling.dx = (updated_starling.dx / speed) * self.speed_limit;
            updated_starling.dy = (updated_starling.dy / speed) * self.speed_limit;
            updated_starling.dz = (updated_starling.dz / speed) * self.speed_limit;
        }
    }

    fn check_bounds(&self, updated_starling: &mut Starling) {
        log!("Before bounds check: {:?}", updated_starling);
        if updated_starling.x > (self.width as f32 - (self.boundary_margin * self.width as f32)) {
            updated_starling.dx -= self.boundary_coefficient;
        }
        if updated_starling.x < (self.boundary_margin * self.width as f32) {
            updated_starling.dx += self.boundary_coefficient;
        }
        if updated_starling.y > (self.height as f32 - (self.height as f32 * self.boundary_margin)) {
            updated_starling.dy -= self.boundary_coefficient;
        }
        if updated_starling.y < (self.boundary_margin * self.height as f32) {
            updated_starling.dy += self.boundary_coefficient;
        }

        if updated_starling.z > (self.depth as f32 - (self.depth as f32 * self.boundary_margin)) {
            updated_starling.dz -= self.boundary_coefficient;
        }
        if updated_starling.z < (self.boundary_margin * self.depth as f32) {
            updated_starling.dz += self.boundary_coefficient;
        }
        log!("After bounds check: {:?}", updated_starling);
    }

    //Steer to avoid crowding local flockmates
    fn seperate(&self, starling: &Starling, flock: &[Starling], neighbours: &[usize]) -> Position {
        let mut pos_delta = Position::new(0.,0.,0.);
        for idx in neighbours.iter() {
            let flock_member = flock.get(*idx).unwrap();
            pos_delta.x = starling.x - flock_member.x;
            pos_delta.y = starling.y - flock_member.y;
            pos_delta.z = starling.z - flock_member.z;
        }

        pos_delta.x *= self.seperation_coefficient;
        pos_delta.y *= self.seperation_coefficient;
        pos_delta.z *= self.seperation_coefficient;

        pos_delta
    }

    //Steer towards the average heading of local flockmates
    fn align(&self, flock: &[Starling], neighbours: &[usize]) -> Velocity {
        let mut avg_vel = Velocity::new(0.,0.,0.);

        for idx in neighbours.iter() {
            let flock_member = flock.get(*idx).unwrap();
            avg_vel.dx += flock_member.dx;
            avg_vel.dy += flock_member.dy;
            avg_vel.dz += flock_member.dz;
        }

        if !neighbours.is_empty() {
            avg_vel.dx = (avg_vel.dx / neighbours.len() as f32) * self.alignment_coefficient;
            avg_vel.dy = (avg_vel.dy / neighbours.len() as f32) * self.alignment_coefficient;
            avg_vel.dz = (avg_vel.dz / neighbours.len() as f32) * self.alignment_coefficient;
        }

        avg_vel
    }

    //Steer to move towards the average position (center of mass) of local flockmates
    fn cohere(&self, starling: &Starling, flock: &[Starling], neighbours: &[usize]) -> Position {
        let mut avg_pos = Position::new(0.,0.,0.);

        for idx in neighbours.iter() {
            let flock_member = flock.get(*idx).unwrap();
            avg_pos.x += flock_member.x;
            avg_pos.y += flock_member.y;
            avg_pos.z += flock_member.z;
        }

        if !neighbours.is_empty() {
            avg_pos.x = (avg_pos.x / neighbours.len() as f32 - starling.x)
                * self.cohesion_coefficient;
            avg_pos.y = (avg_pos.y / neighbours.len() as f32 - starling.y)
                * self.cohesion_coefficient;
            avg_pos.z = (avg_pos.z / neighbours.len() as f32 - starling.y)
                * self.cohesion_coefficient;
        }

        avg_pos
    }

    //Returns a vector (distance_from_point:f32, vec_idx:&usize)
    fn get_neighbours(&self, starling: &Starling, range: f32) -> Vec<(f32, &usize)> {
        let mut neighbour_idx = Vec::new();
        let neighbours = self
            .tree
            .within(
                &[
                    starling.x,
                    starling.y,
                    starling.z,
                ],
                range,
                &squared_euclidean,
            )
            .unwrap();

        for data in neighbours.iter() {
            neighbour_idx.push(*data);
        }

        if neighbour_idx.len() == 1 {
            neighbour_idx.remove(0);
        }

        neighbour_idx
    }

    fn neighbour_subset(&self, neighbours: &mut Vec<(f32, &usize)>, range: f32) -> Vec<usize> {
        let partition = neighbours.partition_point(|&x| x.0 < range);
        self.extract_ids(&neighbours[..partition].to_vec())
    }

    fn extract_ids(&self, neighbours: &[(f32, &usize)]) -> Vec<usize> {
        let mut ids = Vec::new();
        for tup in neighbours.iter() {
            ids.push(*tup.1);
        }
        ids
    }
}
