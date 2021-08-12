import { mat2, mat3, mat4, vec2, vec3, vec4 } from "gl-matrix";

function createShader(
  gl: WebGL2RenderingContext,
  shaderType: number,
  source: string
): WebGLShader {
  let shader = gl.createShader(shaderType);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function main() {
  const canvas: HTMLCanvasElement = document.getElementById(
    "canvas"
  ) as HTMLCanvasElement;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const gl: WebGL2RenderingContext = canvas.getContext("webgl2");

  if (!gl) {
    console.log("No WebGL.");
    return;
  }

  const vertexShaderSource = `#version 300 es
    in vec4 a_position;
    in vec4 a_color;

    uniform mat4 u_matrix;

    out vec4 v_color;

    void main() {
      gl_Position = u_matrix * a_position;

      v_color = a_color;
    } 
  `;

  const fragmentShaderSource = `#version 300 es
        precision mediump float;

        in vec4 v_color;

        out vec4 outColor;

        void main() {
            outColor = v_color;
        }
  `;

  let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  let program = createProgram(gl, vertexShader, fragmentShader);

  let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  let colorAttributeLocation = gl.getAttribLocation(program, "a_color");

  let matrixLocation = gl.getUniformLocation(program, "u_matrix");

  let positionBuffer = gl.createBuffer();

  let vao = gl.createVertexArray();

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  createBoid(gl);
  let size = 3;
  let dtype = gl.FLOAT;
  let normalize = false;
  let stride = 0;
  let offset = 0;

  gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    dtype,
    normalize,
    stride,
    offset
  );

  let colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

  setColors(gl);

  gl.enableVertexAttribArray(colorAttributeLocation);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  gl.enableVertexAttribArray(positionAttributeLocation);

  size = 3;
  dtype = gl.UNSIGNED_BYTE;
    //color between 0 and 255, normalized 0-1
  normalize=true;
  stride=0;
  offset=0;

  gl.vertexAttribPointer(
    colorAttributeLocation,
    size,
    dtype,
    normalize,
    stride,
    offset
  );

  function degToRad(d: number): number {
    return (d * Math.PI) / 180;
  }

  let fieldOfViewRadians = degToRad(60);
  let rotation = [degToRad(10), degToRad(10), degToRad(10)];
  let scale = vec3.create();
  scale = [1, 1, 1];
  let rotationSpeed = 0.5;

  let then = 0;

  let entities = [
        mat4.identity(mat4.create()),
        mat4.identity(mat4.create()),
        mat4.identity(mat4.create()),
        mat4.identity(mat4.create()),
        mat4.identity(mat4.create()),
  ]

    let translation = [
        vec3.random(vec3.create(), 10),
        vec3.random(vec3.create(), 10),
        vec3.random(vec3.create(), 10),
        vec3.random(vec3.create(), 10),
        vec3.random(vec3.create(), 10),
    ]

    translation[0][2] = -500;
    translation[1][2] = -500;
    translation[2][2] = -500;
    translation[3][2] = -500;
    translation[4][2] = -500;
    
    console.log(translation);

  requestAnimationFrame(drawScene);

  function drawScene(now: number) {
    now *= 0.001;
    let deltaTime = now - then;
    then = now;

    rotation[1] += rotationSpeed * deltaTime;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);

    gl.useProgram(program);

    gl.bindVertexArray(vao);

    let glcanvas = gl.canvas as HTMLCanvasElement;
    let aspect = glcanvas.clientWidth / glcanvas.clientHeight;
    let zNear = 1;
    let zFar = 2000;

    entities.forEach((mat, ndx) => {
        let matrix = mat4.perspective(
          mat,
          fieldOfViewRadians,
          aspect,
          zNear,
          zFar
        );
        translation[ndx][0] -= Math.random() * (ndx + 1);
        translation[ndx][1] -= Math.random() * (ndx + 1);
        matrix = mat4.translate(matrix, matrix, translation[ndx]);

        matrix = mat4.rotateX(matrix, matrix, rotation[0]);
        matrix = mat4.rotateY(matrix, matrix, rotation[1]);
        matrix = mat4.rotateZ(matrix, matrix, rotation[2]);
        matrix = mat4.scale(matrix, matrix, scale);

        gl.uniformMatrix4fv(matrixLocation, false, matrix);

        let primitiveType = gl.TRIANGLES;
        let offset = 0;
        let count = 30;
        gl.drawArrays(primitiveType, offset, count);
            
      })


    requestAnimationFrame(drawScene);
  }
}

//Defines the 3D shape of a Boid from 10 triangles
function createBoid(gl: WebGL2RenderingContext) {
  let positions = new Float32Array([
      //3
        100,100,0,
        50,50,150,
        150,50,0,
        //4
        150,50,0,
        50,50,150,
        100,0,0,
         //10
        100,0,0,
        100,100,0,
        150,50,0,
      //1
        -50,50,0,
        50,50,150,
        0,100,0,
        //2
        0,100,0,
        50,50,150,
        100,100,0,
        //6
        0,0,0,
        50,50,150,
        -50,50,0,
        //7
        0,100,0,
        0,0,0,
        -50,50,0,
        //5
        100,0,0,
        50,50,150,
        0,0,0,
        //8
        0,0,0,
        0,100,0,
        100,0,0,
        //9
        100,0,0,
        0,100,0,
        100,100,0,

  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setColors(gl: WebGL2RenderingContext) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Uint8Array([
        // left column front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
          // top rung front
        240,  70, 120,
        240,  70, 120,
        240,  70, 120,

          // middle rung front
        200,  70, 170,
        200,  70, 170,
        200,  70, 170,

          // left column back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // top rung back
        80, 10, 200,
        80, 10, 200,
        80, 10, 200,

          // middle rung back
        80, 70, 230,
        80, 70, 230,
        80, 70, 230,
          // top
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,

          // top rung right
        200, 250, 70,
        200, 250, 70,
        200, 250, 70,

          // under top rung
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,

          // between top rung and middle
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
 
    ]),
    gl.STATIC_DRAW
  );
}

main();
