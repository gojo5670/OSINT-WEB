// This script requires the OGL library to be loaded first
// <script src="https://unpkg.com/ogl"></script>

(function() {
  // Wait for OGL to be available
  const checkOGL = () => {
    if (window.ogl) {
      initRibbons();
    } else {
      console.log("Waiting for OGL to load...");
      setTimeout(checkOGL, 100);
    }
  };

  function initRibbons() {
    // Get OGL components from global scope
    const { Renderer, Transform, Vec3, Color, Polyline } = window.ogl;

    // Define the RibbonsEffect class
    class RibbonsEffect {
      constructor(container, options = {}) {
        this.container = container;
        this.options = Object.assign({
          colors: ['#ffca28'],  // Batman yellow color
          baseSpring: 0.03,
          baseFriction: 0.9,
          baseThickness: 30,
          offsetFactor: 0.05,
          maxAge: 500,
          pointCount: 50,
          speedMultiplier: 0.6,
          enableFade: false,
          enableShaderEffect: true,
          effectAmplitude: 2,
          backgroundColor: [0, 0, 0, 0]
        }, options);

        this.init();
      }

      init() {
        if (!this.container) return;

        const renderer = new Renderer({ dpr: window.devicePixelRatio || 2, alpha: true });
        this.renderer = renderer;
        const gl = renderer.gl;
        this.gl = gl;

        if (Array.isArray(this.options.backgroundColor) && this.options.backgroundColor.length === 4) {
          gl.clearColor(
            this.options.backgroundColor[0],
            this.options.backgroundColor[1],
            this.options.backgroundColor[2],
            this.options.backgroundColor[3]
          );
        } else {
          gl.clearColor(0, 0, 0, 0);
        }

        gl.canvas.style.position = 'absolute';
        gl.canvas.style.top = '0';
        gl.canvas.style.left = '0';
        gl.canvas.style.width = '100%';
        gl.canvas.style.height = '100%';
        gl.canvas.style.pointerEvents = 'none';
        gl.canvas.style.zIndex = '1000';
        this.container.appendChild(gl.canvas);

        const scene = new Transform();
        this.scene = scene;
        const lines = [];
        this.lines = lines;

        const vertex = `
          precision highp float;
          
          attribute vec3 position;
          attribute vec3 next;
          attribute vec3 prev;
          attribute vec2 uv;
          attribute float side;
          
          uniform vec2 uResolution;
          uniform float uDPR;
          uniform float uThickness;
          uniform float uTime;
          uniform float uEnableShaderEffect;
          uniform float uEffectAmplitude;
          
          varying vec2 vUV;
          
          vec4 getPosition() {
              vec4 current = vec4(position, 1.0);
              vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
              vec2 nextScreen = next.xy * aspect;
              vec2 prevScreen = prev.xy * aspect;
              vec2 tangent = normalize(nextScreen - prevScreen);
              vec2 normal = vec2(-tangent.y, tangent.x);
              normal /= aspect;
              normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
              float dist = length(nextScreen - prevScreen);
              normal *= smoothstep(0.0, 0.02, dist);
              float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
              float pixelWidth = current.w * pixelWidthRatio;
              normal *= pixelWidth * uThickness;
              current.xy -= normal * side;
              if(uEnableShaderEffect > 0.5) {
                current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
              }
              return current;
          }
          
          void main() {
              vUV = uv;
              gl_Position = getPosition();
          }
        `;

        const fragment = `
          precision highp float;
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uEnableFade;
          varying vec2 vUV;
          void main() {
              float fadeFactor = 1.0;
              if(uEnableFade > 0.5) {
                  fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
              }
              gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
          }
        `;

        this.resize = this.resize.bind(this);
        this.updateMouse = this.updateMouse.bind(this);
        this.update = this.update.bind(this);

        window.addEventListener('resize', this.resize);

        const center = (this.options.colors.length - 1) / 2;
        this.options.colors.forEach((color, index) => {
          const spring = this.options.baseSpring + (Math.random() - 0.5) * 0.05;
          const friction = this.options.baseFriction + (Math.random() - 0.5) * 0.05;
          const thickness = this.options.baseThickness + (Math.random() - 0.5) * 3;
          const mouseOffset = new Vec3(
            (index - center) * this.options.offsetFactor + (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.1,
            0
          );

          const line = {
            spring,
            friction,
            mouseVelocity: new Vec3(),
            mouseOffset,
          };

          const count = this.options.pointCount;
          const points = [];
          for (let i = 0; i < count; i++) {
            points.push(new Vec3());
          }
          line.points = points;

          line.polyline = new Polyline(gl, {
            points,
            vertex,
            fragment,
            uniforms: {
              uColor: { value: new Color(color) },
              uThickness: { value: thickness },
              uOpacity: { value: 1.0 },
              uTime: { value: 0.0 },
              uEnableShaderEffect: { value: this.options.enableShaderEffect ? 1.0 : 0.0 },
              uEffectAmplitude: { value: this.options.effectAmplitude },
              uEnableFade: { value: this.options.enableFade ? 1.0 : 0.0 },
            },
          });
          line.polyline.mesh.setParent(scene);
          lines.push(line);
        });

        this.resize();

        this.mouse = new Vec3();
        document.addEventListener('mousemove', this.updateMouse);
        document.addEventListener('touchstart', this.updateMouse);
        document.addEventListener('touchmove', this.updateMouse);

        this.tmp = new Vec3();
        this.lastTime = performance.now();
        this.update();
        
        console.log("Ribbon effect initialized");
      }

      resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        this.lines.forEach(line => line.polyline.resize());
      }

      updateMouse(e) {
        let x, y;
        if (e.changedTouches && e.changedTouches.length) {
          x = e.changedTouches[0].clientX;
          y = e.changedTouches[0].clientY;
        } else {
          x = e.clientX;
          y = e.clientY;
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.mouse.set((x / width) * 2 - 1, (y / height) * -2 + 1, 0);
      }

      update() {
        this.frameId = requestAnimationFrame(this.update);
        const currentTime = performance.now();
        const dt = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.lines.forEach(line => {
          this.tmp.copy(this.mouse)
            .add(line.mouseOffset)
            .sub(line.points[0])
            .multiply(line.spring);
          line.mouseVelocity.add(this.tmp).multiply(line.friction);
          line.points[0].add(line.mouseVelocity);

          for (let i = 1; i < line.points.length; i++) {
            if (isFinite(this.options.maxAge) && this.options.maxAge > 0) {
              const segmentDelay = this.options.maxAge / (line.points.length - 1);
              const alpha = Math.min(1, (dt * this.options.speedMultiplier) / segmentDelay);
              line.points[i].lerp(line.points[i - 1], alpha);
            } else {
              line.points[i].lerp(line.points[i - 1], 0.9);
            }
          }
          if (line.polyline.mesh.program.uniforms.uTime) {
            line.polyline.mesh.program.uniforms.uTime.value = currentTime * 0.001;
          }
          line.polyline.updateGeometry();
        });

        this.renderer.render({ scene: this.scene });
      }

      destroy() {
        window.removeEventListener('resize', this.resize);
        document.removeEventListener('mousemove', this.updateMouse);
        document.removeEventListener('touchstart', this.updateMouse);
        document.removeEventListener('touchmove', this.updateMouse);
        cancelAnimationFrame(this.frameId);
        if (this.gl.canvas && this.gl.canvas.parentNode === this.container) {
          this.container.removeChild(this.gl.canvas);
        }
      }
    }

    // Expose to global scope
    window.RibbonsEffect = RibbonsEffect;
    
    // Auto-initialize if container exists
    document.addEventListener('DOMContentLoaded', function() {
      const ribbonsContainer = document.getElementById('ribbons-container');
      if (ribbonsContainer) {
        console.log("Found ribbons container, initializing effect");
        new RibbonsEffect(ribbonsContainer, {
          colors: ['#ffca28'], // Batman yellow color
          baseThickness: 30,
          speedMultiplier: 0.5,
          maxAge: 500,
          enableFade: false,
          enableShaderEffect: true,
          effectAmplitude: 2
        });
      } else {
        console.log("Ribbons container not found");
      }
    });
  }

  // Start checking for OGL
  checkOGL();
})(); 