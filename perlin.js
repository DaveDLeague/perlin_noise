var canvas;
var gl;

window.onload = function(){
    window.addEventListener("resize", windowResize);

    canvas = document.getElementById("canvasID");
    gl = canvas.getContext("webgl2");

    canvas.style.position = "absolute";
    canvas.style.border = 'solid';

    windowResize();

    gl.viewport(0, 0, canvas.width, canvas.height);

    var vertexShaderText = "#version 300 es\n\
    in vec2 position;\n\
    in vec2 uv;\n\
    out vec2 uvCoordinates;\n\
    void main(){\n\
        uvCoordinates = uv;\
        gl_Position = vec4(position, 0.0, 1.0);\
    }";
    var fragmentShaderText = "#version 300 es\n\
    precision mediump float;\n\
    in vec2 uvCoordinates;\n\
    uniform sampler2D tex;\n\
    out vec4 color;\n\
    void main(){\n\
        color = texture(tex, uvCoordinates);\
    }";

    shader = compileGLShader(gl, vertexShaderText, fragmentShaderText);
    gl.useProgram(shader);

    var positionID = gl.getAttribLocation(shader, "position");
    var uvID = gl.getAttribLocation(shader, "uv");

    var vertices = [
        -1.0, -1.0,     0.0, 1.0,
        -1.0,  1.0,     0.0, 0.0,  
         1.0,  1.0,     1.0, 0.0,
         1.0,  1.0,     1.0, 0.0, 
         1.0, -1.0,     1.0, 1.0, 
        -1.0, -1.0,     0.0, 1.0,
    ];
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionID);
    gl.enableVertexAttribArray(uvID);
    gl.vertexAttribPointer(positionID, 2, gl.FLOAT, gl.FALSE, 16, 0);
    gl.vertexAttribPointer(uvID, 2, gl.FLOAT, gl.FALSE, 16, 8);

    let texture = generatePerlinNoiseTexture(1024, 1024);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.clearColor(0.2, 0.5, 0.7, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function generatePerlinNoisePixelArray(tw, th, period, amplitude){
    let divW = tw / period;
    let divH = th / period;

    let pix = [];

    let seed = [];
    for(let i = 0; i < period * 4; i++){
        let seedRow = [];
        for(let j = 0; j < period * 4; j++){
            seedRow.push((Math.random() * amplitude) + (0.5 - (amplitude / 2)));
        }
        seed.push(seedRow);
    }

    for(let i = 0; i < th; i++){
        for(let j = 0; j < tw; j++){
            let row = Math.floor(i / divH);
            let col = Math.floor(j / divW);
            let seedSeg = [
                [seed[row    ][col], seed[row    ][col + 1], seed[row    ][col + 2], seed[row    ][col + 3]],
                [seed[row + 1][col], seed[row + 1][col + 1], seed[row + 1][col + 2], seed[row + 1][col + 3]],
                [seed[row + 2][col], seed[row + 2][col + 1], seed[row + 2][col + 2], seed[row + 2][col + 3]],
                [seed[row + 3][col], seed[row + 3][col + 1], seed[row + 3][col + 2], seed[row + 3][col + 3]]
            ];
            let iMod = i % divH;
            let jMod = j % divW;
            pix.push(bicubicInterpolate(seedSeg, iMod / divH, jMod / divW));
            pix.push(bicubicInterpolate(seedSeg, iMod / divH, jMod / divW));
            pix.push(bicubicInterpolate(seedSeg, iMod / divH, jMod / divW));
            pix.push(255);
        }
    }

    let ctr = 0;
    for(let i = 0; i < th; i++){
        for(let j = 0; j < tw; j++){
            pix[ctr++] *= 255;
            pix[ctr++] *= 255;
            pix[ctr++] *= 255;
            ctr++;
        }
    }

    return pix;
}

function generatePerlinNoiseTexture(tw, th){
    let p1 = generatePerlinNoisePixelArray(tw, th, 1, 1);
    let p2 = generatePerlinNoisePixelArray(tw, th, 2, 0.5);
    let p3 = generatePerlinNoisePixelArray(tw, th, 4, 0.25);
    let p4 = generatePerlinNoisePixelArray(tw, th, 8, 0.125);
    let pix = [];
    for(let i = 0; i < p1.length; i++){
        pix.push(p1[i] + p2[i] + p3[i] + p4[i]);
        pix[i] /= 4;
    }

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pix));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
}

function cubicInterpolate (p, x) {
    return p[1] + 0.5 * x*(p[2] - p[0] + x*(2.0*p[0] - 5.0*p[1] + 4.0*p[2] - p[3] + x*(3.0*(p[1] - p[2]) + p[3] - p[0])));
}

function bicubicInterpolate(p, x, y) {
	let arr = [];
	arr.push(cubicInterpolate(p[0], y));
	arr.push(cubicInterpolate(p[1], y));
	arr.push(cubicInterpolate(p[2], y));
	arr.push(cubicInterpolate(p[3], y));
	return cubicInterpolate(arr, x);
}

function windowResize(){
    canvas.width = window.innerWidth * 0.98;
    canvas.height = window.innerHeight * 0.98;
}