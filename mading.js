"use strict";

var canvas, gl;
var positions = [];
var colors = [];

var scaleFactor = 1.0;
var isGreen = true;
var posterAngles = [0.0, 0.0, 0.0]; // rotasi masing-masing poster

var uModelViewLoc;

// simpan offset index untuk tiap objek
var idxStartIsi;
var idxStartPoster1, idxStartPoster2, idxStartPoster3;
var posterIndexCount = 6; // 2 segitiga = 6 vertex

// Gambar Mading
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
    // Poster kiri (merah)
    idxStartPoster1 = positions.length;
    addRectangle(-0.6, -0.3, -0.3, 0.3, vec4(1.0, 0.0, 0.0, 1.0));

    // Poster tengah (biru muda)
    idxStartPoster2 = positions.length;
    addRectangle(-0.15, -0.3, 0.15, 0.3, vec4(0.6, 0.6, 1.0, 1.0));

    // Poster kanan (kuning)
    idxStartPoster3 = positions.length;
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
    idxStartIsi = positions.length;
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
    document.getElementById("rotatePoster1").oninput = function(e) {
        posterAngles[0] = parseFloat(e.target.value);
    };
    document.getElementById("rotatePoster2").oninput = function(e) {
        posterAngles[1] = parseFloat(e.target.value);
    };
    document.getElementById("rotatePoster3").oninput = function(e) {
        posterAngles[2] = parseFloat(e.target.value);
    };

    // Tombol Reset
    document.getElementById("resetBtn").onclick = function(){
        isGreen = true;
        scaleFactor = 1.0;
        posterAngles = [0.0, 0.0, 0.0];
    }

    // Reset Slidernya jadi gak bingung
    document.getElementById("scaleSlider").value = 1.0;
    document.getElementById("rotatePoster1").value = 0;
    document.getElementById("rotatePoster2").value = 0;
    document.getElementById("rotatePoster3").value = 0;

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let mvBase = mat4();
    mvBase = mult(mvBase, scale(scaleFactor, scaleFactor, 1.0));

    // Update warna isi mading
    let newColor = isGreen ? vec4(0.0, 0.6, 0.0, 1.0) : vec4(1.0, 1.0, 1.0, 1.0);
    for (let i = idxStartIsi; i < idxStartIsi+6; i++) colors[i] = newColor;

    // Update buffer warna
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var colorLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    // Gambar frame + isi mading (semua sebelum poster 1)
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mvBase));
    gl.drawArrays(gl.TRIANGLES, 0, idxStartPoster1);

    // Gambar poster 1
    let mv1 = mult(mvBase, rotateZ(posterAngles[0]));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv1));
    gl.drawArrays(gl.TRIANGLES, idxStartPoster1, posterIndexCount);

    // Gambar poster 2
    let mv2 = mult(mvBase, rotateZ(posterAngles[1]));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv2));
    gl.drawArrays(gl.TRIANGLES, idxStartPoster2, posterIndexCount);

    // Gambar poster 3
    let mv3 = mult(mvBase, rotateZ(posterAngles[2]));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv3));
    gl.drawArrays(gl.TRIANGLES, idxStartPoster3, posterIndexCount);

    requestAnimationFrame(render);
}

window.onload = init;
