"use strict";

var canvas, gl;
var vertices = [], colors = [], normals = [], indices = [];

// Transformasi
var scaleFactor = 1.0;
var isGreen = true;
var theta = [0.0, 0.0, 0.0];
var translateVec = [0.0, 0.0, 0.0];

// rotasi poster
var posterAnglesX = [0.0, 0.0, 0.0];
var posterAnglesY = [0.0, 0.0, 0.0];
var posterAnglesZ = [0.0, 0.0, 0.0];

// rotasi otomatis
var rotationMode = "none";
var rotationSpeed = 0.0;

// Kamera & Proyeksi
var eye = vec3(0, 0, 3);
var at  = vec3(0, 0, 0);
var up  = vec3(0, 1, 0);
var projectionType = "perspective";
var fovy = 45, near = 0.1, far = 10.0;

// Lighting
var ambientColor = vec3(0.2, 0.2, 0.2);
var diffuseColor = vec3(1.0, 1.0, 1.0);
var specularColor = vec3(1.0, 1.0, 1.0);
var lightPosition = vec3(1.0, 1.0, 1.0);

// uniform locations
var uModelViewLoc, uMvpLoc;
var uAmbientLoc, uDiffuseLoc, uSpecularLoc, uLightPosLoc;

// base index
var baseIsi;
var idxStartPoster1, idxStartPoster2, idxStartPoster3;
var posterIndexCount = 36;

// =======================
// Utility / Geometry
// =======================
function quad(a, b, c, d, verts, baseColor) {
    var t1 = subtract(verts[b], verts[a]);
    var t2 = subtract(verts[c], verts[b]);
    var normal = normalize(cross(t1, t2));

    indices.push(vertices.length, vertices.length+1, vertices.length+2);
    indices.push(vertices.length, vertices.length+2, vertices.length+3);

    vertices.push(verts[a], verts[b], verts[c], verts[d]);
    for (let i=0; i<4; i++) {
        colors.push(baseColor);
        normals.push(normal);
    }
}

function addCuboid(x1, y1, z1, x2, y2, z2, color) {
    var verts = [
        vec4(x1,y1,z2,1), vec4(x2,y1,z2,1), vec4(x2,y2,z2,1), vec4(x1,y2,z2,1),
        vec4(x1,y1,z1,1), vec4(x2,y1,z1,1), vec4(x2,y2,z1,1), vec4(x1,y2,z1,1)
    ];
    quad(0,1,2,3, verts, color);
    quad(1,5,6,2, verts, color);
    quad(5,4,7,6, verts, color);
    quad(4,0,3,7, verts, color);
    quad(3,2,6,7, verts, color);
    quad(4,5,1,0, verts, color);
}

function addPosters() {
    idxStartPoster1 = indices.length;
    addCuboid(-0.6,-0.3,0.11, -0.3,0.3,0.12, vec4(1,0,0,1));
    idxStartPoster2 = indices.length;
    addCuboid(-0.15,-0.3,0.11, 0.15,0.3,0.12, vec4(0.6,0.6,1,1));
    idxStartPoster3 = indices.length;
    addCuboid(0.3,-0.3,0.11, 0.6,0.3,0.12, vec4(1,1,0.6,1));
}

function translateMatrix(x, y, z) {
  return mat4(1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1);
}
function scalem(x, y, z) {
  return mat4(x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1);
}

// =======================
// Init
// =======================
function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) { alert("WebGL 2.0 not available"); return; }

    // Scene
    addCuboid(-0.9,0.55,-0.1, 0.9,0.6,0.1, vec4(0.5,0.25,0.1,1));
    addCuboid(-0.9,-0.6,-0.1, 0.9,-0.55,0.1, vec4(0.5,0.25,0.1,1));
    addCuboid(-0.9,-0.6,-0.1, -0.85,0.6,0.1, vec4(0.5,0.25,0.1,1));
    addCuboid(0.85,-0.6,-0.1, 0.9,0.6,0.1, vec4(0.5,0.25,0.1,1));

    baseIsi = vertices.length;
    addCuboid(-0.85,-0.55,-0.05, 0.85,0.55,0.05, vec4(0,0.6,0,1));
    addPosters();

    // GL init
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1,1,1,1);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Buffers
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.DYNAMIC_DRAW);
    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Uniform locations
    uModelViewLoc = gl.getUniformLocation(program, "uModelView");
    uMvpLoc       = gl.getUniformLocation(program, "uModelViewProjection");
    uAmbientLoc   = gl.getUniformLocation(program, "uAmbientProduct");
    uDiffuseLoc   = gl.getUniformLocation(program, "uDiffuseProduct");
    uSpecularLoc  = gl.getUniformLocation(program, "uSpecularProduct");
    uLightPosLoc  = gl.getUniformLocation(program, "uLightPosition");

    // Controls binding (sama seperti sebelumnya, tetap dipakai)
    bindControls();

    requestAnimationFrame(render);
}

// =======================
// Helpers
// =======================
function hexToVec3(hex) {
    let r = parseInt(hex.slice(1,3),16)/255.0;
    let g = parseInt(hex.slice(3,5),16)/255.0;
    let b = parseInt(hex.slice(5,7),16)/255.0;
    return vec3(r,g,b);
}

// =======================
// Render
// =======================
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

     // update rotasi otomatis
    if (rotationMode === "x") theta[0] += rotationSpeed;
    if (rotationMode === "y") theta[1] += rotationSpeed;
    if (rotationMode === "z") theta[2] += rotationSpeed;
    
    let proj = (projectionType === "perspective")
        ? perspective(fovy, canvas.width/canvas.height, near, far)
        : ortho(-2,2,-2,2,near,far);

    let view = lookAt(eye, at, up);

    let model = mult( translateMatrix(translateVec[0], translateVec[1], translateVec[2]),
                      scalem(scaleFactor, scaleFactor, scaleFactor) );
    model = mult(rotateZ(theta[2]), mult(rotateY(theta[1]), mult(rotateX(theta[0]), model)));

    let modelView = mult(view, model);
    let mvp = mult(proj, modelView);

    // update isi mading warna
    let newColor = isGreen ? vec4(0,0.6,0,1) : vec4(0,0,0,1);
    for (let i=baseIsi; i<baseIsi+24; i++) colors[i] = newColor;
    var cBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuf);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.DYNAMIC_DRAW);
    var program = gl.getParameter(gl.CURRENT_PROGRAM);
    var colorLoc = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    // lighting
    gl.uniform3fv(uAmbientLoc, flatten(ambientColor));
    gl.uniform3fv(uDiffuseLoc, flatten(diffuseColor));
    gl.uniform3fv(uSpecularLoc, flatten(specularColor));
    gl.uniform3fv(uLightPosLoc, flatten(lightPosition));

    // global uniform
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(modelView));
    gl.uniformMatrix4fv(uMvpLoc, false, flatten(mvp));

    // draw frame + isi
    gl.drawElements(gl.TRIANGLES, idxStartPoster1, gl.UNSIGNED_SHORT, 0);

    // posters
    drawPoster(idxStartPoster1, posterAnglesX[0], posterAnglesY[0], posterAnglesZ[0], -0.45, 0, 0.115, view, proj, model);
    drawPoster(idxStartPoster2, posterAnglesX[1], posterAnglesY[1], posterAnglesZ[1],  0.0, 0, 0.115, view, proj, model);
    drawPoster(idxStartPoster3, posterAnglesX[2], posterAnglesY[2], posterAnglesZ[2],  0.45, 0, 0.115, view, proj, model);

    requestAnimationFrame(render);
}

function drawPoster(indexStart, rx, ry, rz, cx, cy, cz, view, proj, model) {
    let baseMV = mult(view, model);
    let T = translateMatrix(cx, cy, cz);
    let R = mult(rotateX(rx), mult(rotateY(ry), rotateZ(rz)));
    let local = mult(T, mult(R, translateMatrix(-cx, -cy, -cz)));
    let mv = mult(baseMV, local);
    let mvp = mult(proj, mv);

    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(mv));
    gl.uniformMatrix4fv(uMvpLoc, false, flatten(mvp));

    var byteOffset = indexStart * 2;
    gl.drawElements(gl.TRIANGLES, posterIndexCount, gl.UNSIGNED_SHORT, byteOffset);
}

// =======================
// Controls
// =======================
function bindControls() {
    document.getElementById("toggleColor").onclick = () => isGreen = !isGreen;
    document.getElementById("scaleSlider").oninput = e => scaleFactor = parseFloat(e.target.value);
    document.getElementById("rotateX").oninput = e => theta[0] = parseFloat(e.target.value);
    document.getElementById("rotateY").oninput = e => theta[1] = parseFloat(e.target.value);
    document.getElementById("rotateZ").oninput = e => theta[2] = parseFloat(e.target.value);

    document.getElementById("btnLeft").onclick  = () => translateVec[0] -= 0.2;
    document.getElementById("btnRight").onclick = () => translateVec[0] += 0.2;
    document.getElementById("btnUp").onclick    = () => translateVec[1] += 0.2;
    document.getElementById("btnDown").onclick  = () => translateVec[1] -= 0.2;

    document.getElementById("btnNoRotate").onclick = () => rotationMode = "none";
    document.getElementById("btnRotateX").onclick  = () => rotationMode = "x";
    document.getElementById("btnRotateY").onclick  = () => rotationMode = "y";
    document.getElementById("btnRotateZ").onclick  = () => rotationMode = "z";
    document.getElementById("speedSlider").oninput = e => rotationSpeed = parseFloat(e.target.value);

    document.getElementById("rotatePoster1X").oninput = e => posterAnglesX[0] = parseFloat(e.target.value);
    document.getElementById("rotatePoster1Y").oninput = e => posterAnglesY[0] = parseFloat(e.target.value);
    document.getElementById("rotatePoster1Z").oninput = e => posterAnglesZ[0] = parseFloat(e.target.value);

    document.getElementById("rotatePoster2X").oninput = e => posterAnglesX[1] = parseFloat(e.target.value);
    document.getElementById("rotatePoster2Y").oninput = e => posterAnglesY[1] = parseFloat(e.target.value);
    document.getElementById("rotatePoster2Z").oninput = e => posterAnglesZ[1] = parseFloat(e.target.value);

    document.getElementById("rotatePoster3X").oninput = e => posterAnglesX[2] = parseFloat(e.target.value);
    document.getElementById("rotatePoster3Y").oninput = e => posterAnglesY[2] = parseFloat(e.target.value);
    document.getElementById("rotatePoster3Z").oninput = e => posterAnglesZ[2] = parseFloat(e.target.value);

    document.getElementById("projectionSelect").onchange = e => projectionType = e.target.value;
    document.getElementById("eyeX").oninput = e => eye[0] = parseFloat(e.target.value);
    document.getElementById("eyeY").oninput = e => eye[1] = parseFloat(e.target.value);
    document.getElementById("eyeZ").oninput = e => eye[2] = parseFloat(e.target.value);

    document.getElementById("ambientColor").oninput = e => ambientColor = hexToVec3(e.target.value);
    document.getElementById("diffuseColor").oninput = e => diffuseColor = hexToVec3(e.target.value);
    document.getElementById("specularColor").oninput = e => specularColor = hexToVec3(e.target.value);
    document.getElementById("lightX").oninput = e => lightPosition[0] = parseFloat(e.target.value);
    document.getElementById("lightY").oninput = e => lightPosition[1] = parseFloat(e.target.value);
    document.getElementById("lightZ").oninput = e => lightPosition[2] = parseFloat(e.target.value);

    document.getElementById("resetBtn").onclick = resetAll;
}

function resetAll() {
    isGreen = true; scaleFactor = 1.0; theta=[0,0,0]; translateVec=[0,0,0];
    posterAnglesX=[0,0,0]; posterAnglesY=[0,0,0]; posterAnglesZ=[0,0,0];
    rotationMode="none"; rotationSpeed=0.0;
    eye=vec3(0,0,3); projectionType="perspective";
    ambientColor=vec3(0.2,0.2,0.2); diffuseColor=vec3(1,1,1); specularColor=vec3(1,1,1);
    lightPosition=vec3(1,1,1);

    // reset UI
    document.getElementById("scaleSlider").value = 1.0;
    document.getElementById("rotateX").value=0; document.getElementById("rotateY").value=0; document.getElementById("rotateZ").value=0;
    document.getElementById("speedSlider").value=0;
    ["1","2","3"].forEach(n=>["X","Y","Z"].forEach(axis=>{
        document.getElementById("rotatePoster"+n+axis).value=0;
    }));
    document.getElementById("projectionSelect").value="perspective";
    document.getElementById("eyeX").value=0; document.getElementById("eyeY").value=0; document.getElementById("eyeZ").value=3;
    document.getElementById("ambientColor").value="#333333"; 
    document.getElementById("diffuseColor").value="#ffffff"; 
    document.getElementById("specularColor").value="#ffffff";
    document.getElementById("lightX").value=1; document.getElementById("lightY").value=1; document.getElementById("lightZ").value=1;
}

// =======================
window.onload = init;
