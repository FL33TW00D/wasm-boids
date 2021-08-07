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

#[derive(Clone, Copy, Debug, PartialEq)]
struct Position {
    x: f32,
    y: f32,
}

impl Position {
    fn new() -> Position {
        Position { x: 0., y: 0. }
    }

    fn init_rand(width: u32, height: u32) -> Position {
        Position {
            x: js_sys::Math::random() as f32 * width as f32,
            y: js_sys::Math::random() as f32 * height as f32,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct Velocity {
    dx: f32,
    dy: f32,
}

impl Velocity {
    fn new() -> Velocity {
        Velocity { dx: 0., dy: 0. }
    }

    fn init_rand(speed: f32) -> Velocity {
        Velocity {
            dx: js_sys::Math::random() as f32 * speed,
            dy: js_sys::Math::random() as f32 * speed,
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Starling {
    position: Position,
    velocity: Velocity,
}

impl Starling {
    fn init_rand(width: u32, height: u32, speed_limit: f32) -> Starling {
        Starling {
            position: Position::init_rand(width, height),
            velocity: Velocity::init_rand(speed_limit),
        }
    }
}

#[wasm_bindgen]
pub struct Murmuration {
    size: u32,
    width: u32,
    height: u32,
    flock: Vec<Starling>,
    tree: KdTree<f32, usize, 2>,
    speed_limit: f32,
    visual_field: f32,
    seperation_distance: f32,
    seperation_coefficient: f32,
    alignment_coefficient: f32,
    cohesion_coefficient: f32,
    boundary_margin: u32,
    boundary_coefficient: f32,
}

fn build_tree(flock: &Vec<Starling>) -> KdTree<f32, usize, 2> {
    let mut tree = KdTree::new();

    for (idx, starling) in flock.iter().enumerate() {
        tree.add(&[starling.position.x, starling.position.y], idx)
            .unwrap();
    }

    tree
}

#[wasm_bindgen]
impl Murmuration {
    pub fn new() -> Murmuration {
        utils::set_panic_hook();
        let size = 700;
        let width = 2560;
        let height = 1300;
        let speed_limit = 90.;
        let visual_field = 5625.;
        let seperation_distance = 500.;
        let seperation_coefficient = 0.05;
        let alignment_coefficient = 0.05;
        let cohesion_coefficient = 0.008;
        let boundary_margin = 500;
        let boundary_coefficient = 0.25;

        let mut flock: Vec<Starling> = Vec::new();
        for _ in 0..size {
            flock.push(Starling::init_rand(width, height, 10.));
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

            let center_of_mass = self.cohere(&starling, &self.flock, &visual_ids);
            let position_delta = self.seperate(&starling, &self.flock, &local_ids);
            let average_vel = self.align(&self.flock, &visual_ids);

            let mut updated_velocity = Velocity {
                dx: starling.velocity.dx + center_of_mass.x + position_delta.x + average_vel.dx,
                dy: starling.velocity.dy + center_of_mass.y + position_delta.y + average_vel.dy,
            };

            let updated_position = Position {
                x: starling.position.x + updated_velocity.dx,
                y: starling.position.y + updated_velocity.dy,
            };

            self.limit_speed(&mut updated_velocity);

            let mut updated_starling = Starling {
                position: updated_position,
                velocity: updated_velocity,
            };

            self.check_bounds(&mut updated_starling);
            new_flock.push(updated_starling);
        }
        self.flock = new_flock;
    }

    fn limit_speed(&self, velocity: &mut Velocity) {
        let speed = velocity.dx.powi(2) + velocity.dy.powi(2);
        if speed > self.speed_limit {
            velocity.dx = (velocity.dx / speed) * self.speed_limit;
            velocity.dy = (velocity.dy / speed) * self.speed_limit;
        }
    }

    fn check_bounds(&self, updated_starling: &mut Starling) {
        let pos = updated_starling.position;
        let mut vel = updated_starling.velocity;

        if pos.x > (self.width - self.boundary_margin) as f32 {
            vel.dx -= self.boundary_coefficient;
        }
        if pos.x < self.boundary_margin as f32 {
            vel.dx += self.boundary_coefficient;
        }
        if pos.y > (self.height - self.boundary_margin) as f32 {
            vel.dy -= self.boundary_coefficient;
        }
        if pos.y < self.boundary_margin as f32 {
            vel.dy += self.boundary_coefficient;
        }
        updated_starling.velocity = vel;
    }

    //Steer to avoid crowding local flockmates
    fn seperate(
        &self,
        starling: &Starling,
        flock: &Vec<Starling>,
        neighbours: &Vec<usize>,
    ) -> Position {
        let mut pos_delta = Position::new();
        for idx in neighbours.iter() {
            let pos = flock.get(*idx).unwrap().position;
            pos_delta.x = starling.position.x - pos.x;
            pos_delta.y = starling.position.y - pos.y;
        }

        pos_delta.x *= self.seperation_coefficient;
        pos_delta.y *= self.seperation_coefficient;

        pos_delta
    }

    //Steer towards the average heading of local flockmates
    fn align(&self, flock: &Vec<Starling>, neighbours: &Vec<usize>) -> Velocity {
        let mut avg_vel = Velocity::new();

        for idx in neighbours.iter() {
            let vel = flock.get(*idx).unwrap().velocity;
            avg_vel.dx += vel.dx;
            avg_vel.dy += vel.dy;
        }

        if neighbours.len() > 0 {
            avg_vel.dx = (avg_vel.dx / neighbours.len() as f32) * self.alignment_coefficient;
            avg_vel.dy = (avg_vel.dy / neighbours.len() as f32) * self.alignment_coefficient;
        }

        avg_vel
    }

    //Steer to move towards the average position (center of mass) of local flockmates
    fn cohere(
        &self,
        starling: &Starling,
        flock: &Vec<Starling>,
        neighbours: &Vec<usize>,
    ) -> Position {
        let mut avg_pos = Position::new();

        for idx in neighbours.iter() {
            let pos = flock.get(*idx).unwrap().position;
            avg_pos.x += pos.x;
            avg_pos.y += pos.y;
        }

        if neighbours.len() > 0 {
            avg_pos.x = (avg_pos.x / neighbours.len() as f32 - starling.position.x)
                * self.cohesion_coefficient;
            avg_pos.y = (avg_pos.y / neighbours.len() as f32 - starling.position.y)
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
                &[starling.position.x, starling.position.y],
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

    fn extract_ids(&self, neighbours: &Vec<(f32, &usize)>) -> Vec<usize> {
        let mut ids = Vec::new();
        for tup in neighbours.iter() {
            ids.push(*tup.1);
        }
        ids
    }
}
