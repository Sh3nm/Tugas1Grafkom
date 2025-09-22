"use strict";

var canvas, gl;
var positions = [];
var colors = [];

var scaleFactor = 1.0;
var isGreen = true;
var posterAngles = [0.0, 0.0, 0.0]; // rotasi masing-masing poster
var theta = [0.0, 0.0, 0.0];        // rotasi manual
var translateVec = [0.0, 0.0, 0.0]; // translasi global

// rotasi otomatis
var rotationMode = "none"; 
var rotationSpeed = 0.0;

var uModelViewLoc, uThetaLoc;
var idxStartIsi;
var idxStartPoster1, idxStartPoster2, idxStartPoster3;
var posterIndexCount = 36; // cuboid

// Buat Mading
function addCuboid(x1, y1, z1, x2, y2, z2, color) {
    var verts = [
        vec4(x1,y1,z2,1), vec4(x2,y1,z2,1), vec4(x2,y2,z2,1), vec4(x1,y2,z2,1), // depan
        vec4(x1,y1,z1,1), vec4(x2,y1,z1,1), vec4(x2,y2,z1,1), vec4(x1,y2,z1,1)  // belakang
    ];
    var faces = [
        [0,1,2,3], [1,5,6,2], [5,4,7,6], [4,0,3,7], [3,2,6,7], [4,5,1,0]
    ];
    for (let f of faces) {
        positions.push(verts[f[0]], verts[f[1]], verts[f[2]]);
        positions.push(verts[f[0]], verts[f[2]], verts[f[3]]);
        for (let i=0;i<6;i++) colors.push(color);
    }
}

// Buat Poster
function addPosters() {
    idxStartPoster1 = positions.length;
    addCuboid(-0.6,-0.3,0.11, -0.3,0.3,0.12, vec4(1.0,0.0,0.0,1.0)); // merah
    idxStartPoster2 = positions.length;
    addCuboid(-0.15,-0.3,0.11, 0.15,0.3,0.12, vec4(0.6,0.6,1.0,1.0)); // biru
    idxStartPoster3 = positions.length;
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


function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 not available");

    // Frame coklat
    let tebal = 0.05; // ketebalan bingkai

    // atas
    addCuboid(-0.9, 0.55, -0.1, 0.9, 0.6, 0.1, vec4(0.5,0.25,0.1,1.0));
    // bawah
    addCuboid(-0.9, -0.6, -0.1, 0.9, -0.55, 0.1, vec4(0.5,0.25,0.1,1.0));
    // kiri
    addCuboid(-0.9, -0.6, -0.1, -0.85, 0.6, 0.1, vec4(0.5,0.25,0.1,1.0));
    // kanan
    addCuboid(0.85, -0.6, -0.1, 0.9, 0.6, 0.1, vec4(0.5,0.25,0.1,1.0));

    // Isi mading
    idxStartIsi = positions.length;
    addCuboid(-0.85,-0.55,-0.05, 0.85,0.55,0.05, vec4(0.0,0.6,0.0,1.0));
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
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
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

    uModelViewLoc = gl.getUniformLocation(program, "uModelView");
    uThetaLoc = gl.getUniformLocation(program, "uTheta");

    // Tombol
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
    document.getElementById("rotatePoster1").oninput = e => posterAngles[0] = parseFloat(e.target.value);
    document.getElementById("rotatePoster2").oninput = e => posterAngles[1] = parseFloat(e.target.value);
    document.getElementById("rotatePoster3").oninput = e => posterAngles[2] = parseFloat(e.target.value);

    // reset
    document.getElementById("resetBtn").onclick = () => {
        isGreen = true;
        scaleFactor = 1.0;
        theta = [0,0,0];
        translateVec = [0,0,0];
        posterAngles = [0,0,0];
        rotationMode = "none";
        rotationSpeed = 0.0;
    };

    render();
}

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

    // warna isi update
    let newColor = isGreen ? vec4(0.0,0.6,0.0,1.0) : vec4(0.0,0.0,0.0,1.0);
    for (let i = idxStartIsi; i < idxStartIsi+36; i++) colors[i] = newColor;

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
    gl.drawArrays(gl.TRIANGLES, 0, idxStartPoster1);

    // poster 1
    let mv1 = mult(mvBase, rotateZ(posterAngles[0]));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, idxStartPoster1, posterIndexCount);

    // poster 2
    let mv2 = mult(mvBase, rotateZ(posterAngles[1]));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv2));
    gl.drawArrays(gl.TRIANGLES, idxStartPoster2, posterIndexCount);

    // poster 3
    let mv3 = mult(mvBase, rotateZ(posterAngles[2]));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv3));
    gl.drawArrays(gl.TRIANGLES, idxStartPoster3, posterIndexCount);

    requestAnimationFrame(render);
}

window.onload = init;
