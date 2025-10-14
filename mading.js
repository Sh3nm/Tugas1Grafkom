"use strict";

var canvas, gl;
var vertices = [], colors = [], normals = [], indices = [], texCoords = [];

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

// Texture
var textureChecker, textureImage;
var useImageTexture = false; // if true will use image texture; otherwise checker
var textureEnabled = false;  // whether texture is currently enabled (user toggled)

// Uniform locations
var uModelViewLoc, uMvpLoc;
var uAmbientLoc, uDiffuseLoc, uSpecularLoc, uLightPosLoc;
var uUseTextureLoc, uTextureLoc;

// Base index / vertex ranges for isi (so we can update color buffer)
var baseIsiStart, baseIsiEnd;
var baseIsiVertexStart, baseIsiVertexEnd;
var idxStartPoster1, idxStartPoster2, idxStartPoster3;
var posterIndexCount = 36;

// GPU buffer refs
var colorBuffer;

// Mode flag to make color/texture mutually exclusive
var colorModeActive = true;

// =======================
// Utility / Geometry
// =======================
function quad(a, b, c, d, verts, baseColor) {
    var t1 = subtract(verts[b], verts[a]);
    var t2 = subtract(verts[c], verts[b]);
    var normal = normalize(cross(t1, t2));

    var start = vertices.length;
    indices.push(start, start+1, start+2);
    indices.push(start, start+2, start+3);

    vertices.push(verts[a], verts[b], verts[c], verts[d]);
    for (let i = 0; i < 4; i++) {
        colors.push(baseColor);
        normals.push(normal);
    }

    // Hitung texCoords berdasarkan orientasi muka agar checker tile kontinu
    const TILE = 6.0; // ubah untuk tingkat pengulangan checker
    function tc(v) {
        // v adalah vec4 [x,y,z,w]
        const x = v[0], y = v[1], z = v[2];
        if (Math.abs(normal[2]) > 0.5) {
            // muka depan/belakang -> pakai x,y
            return vec2(x * TILE, y * TILE);
        } else if (Math.abs(normal[0]) > 0.5) {
            // muka kiri/kanan -> pakai z,y
            return vec2(z * TILE, y * TILE);
        } else {
            // muka atas/bawah -> pakai x,z
            return vec2(x * TILE, z * TILE);
        }
    }

    texCoords.push(tc(verts[a]), tc(verts[b]), tc(verts[c]), tc(verts[d]));
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

    // Scene setup
    addCuboid(-0.9,0.55,-0.1, 0.9,0.6,0.1, vec4(0.5,0.25,0.1,1)); // atas
    addCuboid(-0.9,-0.6,-0.1, 0.9,-0.55,0.1, vec4(0.5,0.25,0.1,1)); // bawah
    addCuboid(-0.9,-0.6,-0.1, -0.85,0.6,0.1, vec4(0.5,0.25,0.1,1)); // kiri
    addCuboid(0.85,-0.6,-0.1, 0.9,0.6,0.1, vec4(0.5,0.25,0.1,1));  // kanan

    // isi mading
    baseIsiVertexStart = vertices.length;
    baseIsiStart = indices.length;
    addCuboid(-0.85,-0.55,-0.05, 0.85,0.55,0.05, vec4(0,0.6,0,1));
    baseIsiEnd = indices.length;
    baseIsiVertexEnd = vertices.length;

    addPosters();

    // GL init
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1,1,1,1);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    initBuffers(program);

    // Uniform locations
    uModelViewLoc = gl.getUniformLocation(program, "uModelView");
    uMvpLoc       = gl.getUniformLocation(program, "uModelViewProjection");
    uAmbientLoc   = gl.getUniformLocation(program, "uAmbientProduct");
    uDiffuseLoc   = gl.getUniformLocation(program, "uDiffuseProduct");
    uSpecularLoc  = gl.getUniformLocation(program, "uSpecularProduct");
    uLightPosLoc  = gl.getUniformLocation(program, "uLightPosition");
    uUseTextureLoc = gl.getUniformLocation(program, "uUseTexture");
    uTextureLoc = gl.getUniformLocation(program, "uTexture");
    if (uTextureLoc !== null) gl.uniform1i(uTextureLoc, 0); // texture unit 0

    // Textures
    textureChecker = createCheckerTexture();
    textureImage = loadTexture("Images/TIGER.png");

    // ensure initial state: texture disabled, color mode active (green)
    textureEnabled = false;
    colorModeActive = true;
    isGreen = true;
    updateIsiColors(); // upload initial colors

    bindControls();
    requestAnimationFrame(render);
}

function initBuffers(program) {
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

    colorBuffer = cBuffer;

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    var texLoc = gl.getAttribLocation(program, "aTexCoord");
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texLoc);

    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}


// Texture
function createCheckerTexture() {
    const texSize = 128;
    const numRows = 8, numCols = 8;
    const image = new Uint8Array(4 * texSize * texSize);

    for (let i = 0; i < texSize; ++i) {
        for (let j = 0; j < texSize; ++j) {
            const patchx = Math.floor(i / (texSize / numRows));
            const patchy = Math.floor(j / (texSize / numCols));
            const c = ((patchx % 2) ^ (patchy % 2)) ? 255 : 50;
            const idx = 4 * (i * texSize + j);
            image[idx] = image[idx+1] = image[idx+2] = c;
            image[idx+3] = 255;
        }
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // allow repeating (so texcoords >1 tiles the checker across faces)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}

function loadTexture(url) {
    const texture = gl.createTexture();
    const image = new Image();
    image.crossOrigin = "";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        // for image mapping, clamp to edge to avoid seam unless image is tileable
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    image.src = url;
    return texture;
}


// update isi colors on GPU (restore to green/red when texture disabled)
function updateIsiColors() {
    if (baseIsiVertexStart == null || baseIsiVertexEnd == null) return;
    var col = isGreen ? vec4(0,0.6,0,1) : vec4(0.8,0.1,0.1,1);
    for (var v = baseIsiVertexStart; v < baseIsiVertexEnd; v++) {
        colors[v] = col;
    }
    if (colorBuffer && gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(colors));
    }
}

// Render
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (rotationMode === "x") theta[0] += rotationSpeed;
    if (rotationMode === "y") theta[1] += rotationSpeed;
    if (rotationMode === "z") theta[2] += rotationSpeed;

    let proj = (projectionType === "perspective")
        ? perspective(fovy, canvas.width/canvas.height, near, far)
        : ortho(-2,2,-2,2,near,far);

    let view = lookAt(eye, at, up);

    let model = mult(translateMatrix(translateVec[0], translateVec[1], translateVec[2]),
                     scalem(scaleFactor, scaleFactor, scaleFactor));
    model = mult(rotateZ(theta[2]), mult(rotateY(theta[1]), mult(rotateX(theta[0]), model)));

    let modelView = mult(view, model);
    let mvp = mult(proj, modelView);

    // Lighting
    gl.uniform3fv(uAmbientLoc, flatten(ambientColor));
    gl.uniform3fv(uDiffuseLoc, flatten(diffuseColor));
    gl.uniform3fv(uSpecularLoc, flatten(specularColor));
    gl.uniform3fv(uLightPosLoc, flatten(lightPosition));
    gl.uniformMatrix4fv(uModelViewLoc, false, flatten(modelView));
    gl.uniformMatrix4fv(uMvpLoc, false, flatten(mvp));

    // Bind texture if enabled (checker or image)
    if (textureEnabled) {
        const currentTex = useImageTexture ? textureImage : textureChecker;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentTex);
        gl.uniform1i(uUseTextureLoc, 1);
    } else {
        gl.uniform1i(uUseTextureLoc, 0);
        // ensure isi colors are correct when texture is off
        updateIsiColors();
    }

    // Draw: first part indices up to baseIsiStart (frame parts), then isi, then posters
    // frame + borders (0 .. baseIsiStart-1)
    if (baseIsiStart > 0) {
        gl.drawElements(gl.TRIANGLES, baseIsiStart, gl.UNSIGNED_SHORT, 0);
    }

    // Isi mading (texture or color)
    if (baseIsiEnd > baseIsiStart) {
        const isiCount = baseIsiEnd - baseIsiStart;
        const byteOffsetIsi = baseIsiStart * 2;
        gl.drawElements(gl.TRIANGLES, isiCount, gl.UNSIGNED_SHORT, byteOffsetIsi);
    }

    // Poster (juga menggunakan same texture when enabled)
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


// Controls
function bindControls() {
    document.getElementById("toggleColor").onclick = () => {
        // toggle color mode -> automatically disable texture
        isGreen = !isGreen;
        colorModeActive = true;
        textureEnabled = false;
        if (uUseTextureLoc) gl.uniform1i(uUseTextureLoc, 0);
        updateIsiColors();
    };

    document.getElementById("toggleTexture").onclick = () => {
        // Cycle texture state: off -> checker -> image -> off ...
        if (!textureEnabled) {
            // first click: enable texture as checker
            textureEnabled = true;
            useImageTexture = false;
        } else {
            if (!useImageTexture) {
                // second click: switch to image (TIGER.png)
                useImageTexture = true;
            } else {
                // third click: disable texture entirely
                textureEnabled = false;
                useImageTexture = false;
            }
        }
        // Keep color/texture mutually exclusive
        colorModeActive = !textureEnabled;
        if (uUseTextureLoc) gl.uniform1i(uUseTextureLoc, textureEnabled ? 1 : 0);

        if (textureEnabled) {
            const tex = useImageTexture ? textureImage : textureChecker;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
        } else {
            // texture disabled -> restore colors
            updateIsiColors();
        }
    };

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

function hexToVec3(hex) {
    let r = parseInt(hex.slice(1,3),16)/255.0;
    let g = parseInt(hex.slice(3,5),16)/255.0;
    let b = parseInt(hex.slice(5,7),16)/255.0;
    return vec3(r,g,b);
}

function resetAll() {
    isGreen = true; scaleFactor = 1.0; theta=[0,0,0]; translateVec=[0,0,0];
    posterAnglesX=[0,0,0]; posterAnglesY=[0,0,0]; posterAnglesZ=[0,0,0];
    rotationMode="none"; rotationSpeed=0.0;
    eye=vec3(0,0,3); projectionType="perspective";
    ambientColor=vec3(0.2,0.2,0.2); diffuseColor=vec3(1,1,1); specularColor=vec3(1,1,1);
    lightPosition=vec3(1,1,1);
    textureEnabled=false;
    colorModeActive=true;
    if (uUseTextureLoc) gl.uniform1i(uUseTextureLoc, 0);
    updateIsiColors();
    document.getElementById("projectionSelect").value="perspective";
}

window.onload = init;