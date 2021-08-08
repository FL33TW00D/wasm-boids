#![feature(test)]

extern crate test;
extern crate wasm_boids;

#[bench]
fn murmuration_ticks(b: &mut test::Bencher) {
    let mut murmuration = wasm_boids::Murmuration::new();

    b.iter(|| {
        murmuration.tick();
    });
}
