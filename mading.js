"use strict";

var canvas, gl;
var positions = [];
var colors = [];

var scaleFactor = 1.0;
var posterAngle = 0.0;
var isGreen = true;

var uModelViewLoc;

// Buat mading
function addRectangle(x1, y1, x2, y2, color) {
    let verts = [
        vec4(x1, y1, 0.0, 1.0),
        vec4(x2, y1, 0.0, 1.0),
        vec4(x2, y2, 0.0, 1.0),
        vec4(x1, y2, 0.0, 1.0)
    ];
    let idx = [0, 1, 2, 0, 2, 3];
    for (let i of idx) {
        positions.push(verts[i]);
        colors.push(color);
    }
}

function addPosters() {
    // Poster kiri (putih)
    addRectangle(-0.6, -0.3, -0.3, 0.3, vec4(1.0, 1.0, 1.0, 1.0));
    // Poster tengah (biru muda)
    addRectangle(-0.15, -0.3, 0.15, 0.3, vec4(0.6, 0.6, 1.0, 1.0));
    // Poster kanan (kuning)
    addRectangle(0.3, -0.3, 0.6, 0.3, vec4(1.0, 1.0, 0.6, 1.0));
}

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 not available");

    // Bingkai coklat
    addRectangle(-0.9, -0.6, 0.9, -0.5, vec4(0.5, 0.25, 0.1, 1.0)); // bawah
    addRectangle(-0.9,  0.5, 0.9,  0.6, vec4(0.5, 0.25, 0.1, 1.0)); // atas
    addRectangle(-0.9, -0.6, -0.8, 0.6, vec4(0.5, 0.25, 0.1, 1.0)); // kiri
    addRectangle( 0.8, -0.6, 0.9, 0.6, vec4(0.5, 0.25, 0.1, 1.0)); // kanan

    // Isi mading (awal hijau)
    addRectangle(-0.8, -0.5, 0.8, 0.5, vec4(0.0, 0.6, 0.0, 1.0));

    // 3 poster
    addPosters();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    uModelViewLoc = gl.getUniformLocation(program, "uModelView");

    // Kontrol UI
    document.getElementById("toggleColor").onclick = function() {
        isGreen = !isGreen;
    };
    document.getElementById("scaleSlider").oninput = function(e) {
        scaleFactor = parseFloat(e.target.value);
    };
    document.getElementById("rotateSlider").oninput = function(e) {
        posterAngle = parseFloat(e.target.value);
    };

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let mv = mat4();
    mv = mult(mv, scale(scaleFactor, scaleFactor, 1.0));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv));

    // Update warna isi mading
    let idxStart = 4*6; // setelah bingkai (4 rect x 6 vertex)
    let newColor = isGreen ? vec4(0.0, 0.6, 0.0, 1.0) : vec4(1.0, 1.0, 1.0, 1.0);
    for (let i = idxStart; i < idxStart+6; i++) colors[i] = newColor;

    // Update buffer warna
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var colorLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    // Rotasi poster
    let posterStart = idxStart + 6;
    let mvPoster = mult(mv, rotateZ(posterAngle));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mvPoster));

    // Gambar semua
    gl.drawArrays(gl.TRIANGLES, 0, positions.length);

    requestAnimationFrame(render);
}

window.onload = init;
