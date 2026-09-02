import React, { useEffect, useRef } from 'react';

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  #define PI 3.14159265359

  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_mass;
  uniform float u_time;
  uniform float u_clickedTime;

  vec2 rotate(vec2 mt, vec2 st, float angle){
    float cos = cos((angle + u_clickedTime) * PI);
    float sin = sin(angle * 0.0);
    float nx = (cos * (st.x - mt.x)) + (sin * (st.y - mt.y)) + mt.x;
    float ny = (cos * (st.y - mt.y)) - (sin * (st.x - mt.x)) + mt.y;
    return vec2(nx, ny);
  }

  void main() {
    vec2 st = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y)/u_resolution;
    vec2 mt = vec2(u_mouse.x, u_resolution.y - u_mouse.y)/u_resolution;

    float dx = st.x - mt.x;
    float dy = st.y - mt.y;
    float dist = sqrt(dx * dx + dy * dy);
    
    // Safety clamp to prevent divide by zero artifacts
    float pull = u_mass / (max(dist * dist, 0.0001));
    
    vec3 color = vec3(0.0);
    vec2 r = rotate(mt, st, pull);
    
    // Scale the texture slightly so it covers nicely
    vec4 imgcolor = texture2D(u_image, r * 1.0);
    
    color = vec3(
      (imgcolor.x - (pull * 0.25)),
      (imgcolor.y - (pull * 0.25)), 
      (imgcolor.z - (pull * 0.25))
    );
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const BlackholeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    
    if (!gl) {
      console.warn("WebGL not supported. Blackhole disabled.");
      return;
    }

    // Procedural Star Texture Generator (No external images needed!)
    const generateStarTexture = (gl: WebGLRenderingContext): WebGLTexture | null => {
      const texCanvas = document.createElement('canvas');
      texCanvas.width = 1024; // Power of 2 required for gl.REPEAT
      texCanvas.height = 1024;
      const ctx = texCanvas.getContext('2d');
      if (!ctx) return null;

      // Dark deep space background
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, 1024, 1024);

      // Nebula clouds
      for (let i = 0; i < 6; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const r = 250 + Math.random() * 300;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.04)' : 'rgba(255, 0, 255, 0.03)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Starfield
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const radius = Math.random() * 1.5;
        const intensity = Math.random();
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.fill();
        
        // Rare bright blue stars
        if (Math.random() > 0.96) {
          ctx.beginPath();
          ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 240, 255, ${intensity * 0.9})`;
          ctx.fill();
        }
      }

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texCanvas);
      
      return texture;
    };

    const texture = generateStarTexture(gl);

    // Shader Compiler
    const compileShader = (type: number, source: string) => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error("Shader Error:", gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Quad Vertex Buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform mapping
    const locResolution = gl.getUniformLocation(program, "u_resolution");
    const locMouse = gl.getUniformLocation(program, "u_mouse");
    const locMass = gl.getUniformLocation(program, "u_mass");
    const locTime = gl.getUniformLocation(program, "u_time");
    const locClickedTime = gl.getUniformLocation(program, "u_clickedTime");

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Resize strategy: keep 1:1 aspect ratio to avoid elliptical blackholes
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const size = Math.max(width, height);
      canvas.width = size;
      canvas.height = size;
      gl!.viewport(0, 0, size, size);
      gl!.uniform2f(locResolution, size, size);
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Interaction State
    const mouse = { x: width / 2, y: height / 2, moved: false };
    const maxMass = 1200; 
    let currentMass = 0;
    let clicked = false;
    let clickedTime = 0;
    const startTime = Date.now();

    const updatePointer = (clientX: number, clientY: number) => {
      const size = Math.max(width, height);
      const offsetX = (size - width) / 2;
      const offsetY = (size - height) / 2;
      mouse.x = clientX + offsetX;
      mouse.y = size - (clientY + offsetY);
      mouse.moved = true;
    };

    const handlePointerMove = (e: PointerEvent) => updatePointer(e.clientX, e.clientY);
    const handlePointerDown = (e: PointerEvent) => { clicked = true; updatePointer(e.clientX, e.clientY); };
    const handlePointerUp = () => { clicked = false; };

    // We must listen on window so it works anywhere in the app
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    // Main Render Loop
    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000;

      if (currentMass < maxMass - 5) {
        currentMass += (maxMass - currentMass) * 0.03;
      }

      if (clicked) {
        clickedTime += 0.03;
      } else if (clickedTime > 0) {
        clickedTime -= clickedTime * 0.015;
        if (clickedTime < 0) clickedTime = 0;
      }

      // Idle movement 
      const size = Math.max(width, height);
      if (!mouse.moved) {
        mouse.x = (size / 2) + Math.sin(currentTime * 0.6) * -(size * 0.35);
        mouse.y = (size / 2) + Math.sin(currentTime * 0.7) * (size * 0.25);
      }

      gl!.uniform1f(locMass, currentMass * 0.00001);
      gl!.uniform2f(locMouse, mouse.x, mouse.y);
      gl!.uniform1f(locTime, currentTime);
      gl!.uniform1f(locClickedTime, clickedTime);

      gl!.drawArrays(gl!.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Memory Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
      
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black pointer-events-none">
      <canvas 
        ref={canvasRef} 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 'max(100vw, 100vh)', height: 'max(100vw, 100vh)' }}
      />
    </div>
  );
};
