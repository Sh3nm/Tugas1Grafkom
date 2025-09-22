"use strict";

var canvas, gl;
var vertices = [];
var colors = [];
var indices = [];

var scaleFactor = 1.0;
var isGreen = true;
var theta = [0.0, 0.0, 0.0];        // rotasi manual
var translateVec = [0.0, 0.0, 0.0]; // translasi global

// rotasi poster
var posterAnglesX = [0.0, 0.0, 0.0];
var posterAnglesY = [0.0, 0.0, 0.0];
var posterAnglesZ = [0.0, 0.0, 0.0];

// rotasi otomatis
var rotationMode = "none"; 
var rotationSpeed = 0.0;

// index tracking
var uModelViewLoc, uThetaLoc;
var idxStartIsi, isiIndexCount;
var idxStartPoster1, idxStartPoster2, idxStartPoster3;
var posterIndexCount = 36;

// simpan base index untuk isi mading (8 vertex unik)
var baseIsi;

// =======================
// Utility Functions
// =======================
function addCuboid(x1, y1, z1, x2, y2, z2, color) {
    let baseIndex = vertices.length;

    var verts = [
        vec4(x1,y1,z2,1), vec4(x2,y1,z2,1), vec4(x2,y2,z2,1), vec4(x1,y2,z2,1), // depan
        vec4(x1,y1,z1,1), vec4(x2,y1,z1,1), vec4(x2,y2,z1,1), vec4(x1,y2,z1,1)  // belakang
    ];

    var faces = [
        [0,1,2,3], [1,5,6,2], [5,4,7,6],
        [4,0,3,7], [3,2,6,7], [4,5,1,0]
    ];

    for (let v of verts) vertices.push(v);
    for (let i=0;i<8;i++) colors.push(color);

    for (let f of faces) {
        indices.push(baseIndex+f[0], baseIndex+f[1], baseIndex+f[2]);
        indices.push(baseIndex+f[0], baseIndex+f[2], baseIndex+f[3]);
    }
}

function addPosters() {
    idxStartPoster1 = indices.length;
    addCuboid(-0.6,-0.3,0.11, -0.3,0.3,0.12, vec4(1.0,0.0,0.0,1.0)); // merah
    idxStartPoster2 = indices.length;
    addCuboid(-0.15,-0.3,0.11, 0.15,0.3,0.12, vec4(0.6,0.6,1.0,1.0)); // biru
    idxStartPoster3 = indices.length;
    addCuboid(0.3,-0.3,0.11, 0.6,0.3,0.12, vec4(1.0,1.0,0.6,1.0)); // kuning
}

function translateMatrix(x, y, z) {
  return mat4(1, 0, 0, x,
              0, 1, 0, y,
              0, 0, 1, z,
              0, 0, 0, 1);
}
function scalem(x, y, z) {
  return mat4(x, 0, 0, 0,
              0, y, 0, 0,
              0, 0, z, 0,
              0, 0, 0, 1);
}

// =======================
// Init
// =======================
function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 not available");

    // Frame coklat
    addCuboid(-0.9, 0.55, -0.1, 0.9, 0.6, 0.1, vec4(0.5,0.25,0.1,1.0)); // atas
    addCuboid(-0.9, -0.6, -0.1, 0.9, -0.55, 0.1, vec4(0.5,0.25,0.1,1.0)); // bawah
    addCuboid(-0.9, -0.6, -0.1, -0.85, 0.6, 0.1, vec4(0.5,0.25,0.1,1.0)); // kiri
    addCuboid(0.85, -0.6, -0.1, 0.9, 0.6, 0.1, vec4(0.5,0.25,0.1,1.0)); // kanan

    // Isi mading
    baseIsi = vertices.length; // simpan base vertex index
    idxStartIsi = indices.length;
    addCuboid(-0.85,-0.55,-0.05, 0.85,0.55,0.05, vec4(0.0,0.6,0.0,1.0));
    isiIndexCount = indices.length - idxStartIsi;

    // Poster
    addPosters();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // VBO posisi
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // VBO warna
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.DYNAMIC_DRAW);
    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    // IBO
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    uModelViewLoc = gl.getUniformLocation(program, "uModelView");
    uThetaLoc = gl.getUniformLocation(program, "uTheta");

    // =======================
    // Controls
    // =======================
    document.getElementById("toggleColor").onclick = () => isGreen = !isGreen;
    document.getElementById("scaleSlider").oninput = e => scaleFactor = parseFloat(e.target.value);

    document.getElementById("rotateX").oninput = e => theta[0] = parseFloat(e.target.value);
    document.getElementById("rotateY").oninput = e => theta[1] = parseFloat(e.target.value);
    document.getElementById("rotateZ").oninput = e => theta[2] = parseFloat(e.target.value);

    // translasi
    document.getElementById("btnLeft").onclick  = () => translateVec[0] -= 0.2;
    document.getElementById("btnRight").onclick = () => translateVec[0] += 0.2;
    document.getElementById("btnUp").onclick    = () => translateVec[1] += 0.2;
    document.getElementById("btnDown").onclick  = () => translateVec[1] -= 0.2;

    // rotasi otomatis
    document.getElementById("btnNoRotate").onclick   = () => rotationMode = "none";
    document.getElementById("btnRotateX").onclick    = () => rotationMode = "x";
    document.getElementById("btnRotateY").onclick    = () => rotationMode = "y";
    document.getElementById("btnRotateZ").onclick    = () => rotationMode = "z";
    document.getElementById("speedSlider").oninput   = e => rotationSpeed = parseFloat(e.target.value);

    // poster rotasi
    document.getElementById("rotatePoster1X").oninput = e => posterAnglesX[0] = parseFloat(e.target.value);
    document.getElementById("rotatePoster1Y").oninput = e => posterAnglesY[0] = parseFloat(e.target.value);
    document.getElementById("rotatePoster1Z").oninput = e => posterAnglesZ[0] = parseFloat(e.target.value);

    document.getElementById("rotatePoster2X").oninput = e => posterAnglesX[1] = parseFloat(e.target.value);
    document.getElementById("rotatePoster2Y").oninput = e => posterAnglesY[1] = parseFloat(e.target.value);
    document.getElementById("rotatePoster2Z").oninput = e => posterAnglesZ[1] = parseFloat(e.target.value);

    document.getElementById("rotatePoster3X").oninput = e => posterAnglesX[2] = parseFloat(e.target.value);
    document.getElementById("rotatePoster3Y").oninput = e => posterAnglesY[2] = parseFloat(e.target.value);
    document.getElementById("rotatePoster3Z").oninput = e => posterAnglesZ[2] = parseFloat(e.target.value);

    // reset
    document.getElementById("resetBtn").onclick = () => {
        isGreen = true;
        scaleFactor = 1.0;
        theta = [0,0,0];
        translateVec = [0,0,0];
        posterAnglesX = [0,0,0];
        posterAnglesY = [0,0,0];
        posterAnglesZ = [0,0,0];
        rotationMode = "none";
        rotationSpeed = 0.0;

        // reset slider UI
        document.getElementById("scaleSlider").value = 1.0;
        document.getElementById("rotateX").value = 0.0;
        document.getElementById("rotateY").value = 0.0;
        document.getElementById("rotateZ").value = 0.0;
        document.getElementById("speedSlider").value = 0.0;

        document.getElementById("rotatePoster1X").value = 0.0;
        document.getElementById("rotatePoster1Y").value = 0.0;
        document.getElementById("rotatePoster1Z").value = 0.0;

        document.getElementById("rotatePoster2X").value = 0.0;
        document.getElementById("rotatePoster2Y").value = 0.0;
        document.getElementById("rotatePoster2Z").value = 0.0;

        document.getElementById("rotatePoster3X").value = 0.0;
        document.getElementById("rotatePoster3Y").value = 0.0;
        document.getElementById("rotatePoster3Z").value = 0.0;
    };

    render();
}

// =======================
// Render
// =======================
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // kamera
    let proj = perspective(45, canvas.width/canvas.height, 0.1, 10.0);
    let view = lookAt(vec3(0,0,3), vec3(0,0,0), vec3(0,1,0));
    let mvBase = mult(proj, view);

    // translasi + skala
    let t = translateMatrix(translateVec[0], translateVec[1], translateVec[2]);
    let s = scalem(scaleFactor, scaleFactor, scaleFactor);
    mvBase = mult(mvBase, mult(t, s));

    // update warna isi (8 vertex)
    let newColor = isGreen ? vec4(0.0,0.6,0.0,1.0) : vec4(0.0,0.0,0.0,1.0);
    for (let i = baseIsi; i < baseIsi + 8; i++) {
        colors[i] = newColor;
    }
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.DYNAMIC_DRAW);
    var colorLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    // update rotasi otomatis
    if (rotationMode === "x") theta[0] += rotationSpeed;
    if (rotationMode === "y") theta[1] += rotationSpeed;
    if (rotationMode === "z") theta[2] += rotationSpeed;

    gl.uniform3fv(uThetaLoc, theta);

    // gambar frame + isi
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mvBase));
    gl.drawElements(gl.TRIANGLES, idxStartPoster1, gl.UNSIGNED_SHORT, 0);

    // poster 1
    let mv1 = mult(mvBase, mult(rotateX(posterAnglesX[0]), mult(rotateY(posterAnglesY[0]), rotateZ(posterAnglesZ[0]))));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv1));
    gl.drawElements(gl.TRIANGLES, posterIndexCount, gl.UNSIGNED_SHORT, idxStartPoster1*2);

    // poster 2
    let mv2 = mult(mvBase, mult(rotateX(posterAnglesX[1]), mult(rotateY(posterAnglesY[1]), rotateZ(posterAnglesZ[1]))));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv2));
    gl.drawElements(gl.TRIANGLES, posterIndexCount, gl.UNSIGNED_SHORT, idxStartPoster2*2);

    // poster 3
    let mv3 = mult(mvBase, mult(rotateX(posterAnglesX[2]), mult(rotateY(posterAnglesY[2]), rotateZ(posterAnglesZ[2]))));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv3));
    gl.drawElements(gl.TRIANGLES, posterIndexCount, gl.UNSIGNED_SHORT, idxStartPoster3*2);

    requestAnimationFrame(render);
}

window.onload = init;
