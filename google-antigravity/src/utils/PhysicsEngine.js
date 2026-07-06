/**
 * High-performance 2D Rigid Body Physics Engine for DOM Elements.
 * Directly updates DOM transforms for maximum rendering efficiency (60fps).
 */
export default class PhysicsEngine {
  constructor(options = {}) {
    this.bodies = [];
    this.gravity = options.gravity !== undefined ? options.gravity : 0.6; // acceleration
    this.gravityAngle = options.gravityAngle !== undefined ? options.gravityAngle : Math.PI / 2; // angle in radians (downwards)
    this.friction = options.friction !== undefined ? options.friction : 0.99; // air resistance
    this.bounciness = options.bounciness !== undefined ? options.bounciness : 0.6; // restitution
    this.floorFriction = 0.8; // friction on floor hit
    this.isRunning = false;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Mouse drag state
    this.draggedBody = null;
    this.dragOffset = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.mouseVelocity = { x: 0, y: 0 };
    
    this.animationFrameId = null;
    this.lastTime = 0;
    
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  addBody(el, id, options = {}) {
    // Remove if body already exists
    this.removeBody(id);

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate center coordinates
    const x = rect.left + width / 2;
    const y = rect.top + height / 2;

    const body = {
      id,
      el,
      x,
      y,
      prevX: x,
      prevY: y,
      width,
      height,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      mass: (width * height) || 1000,
      bounciness: options.bounciness !== undefined ? options.bounciness : this.bounciness,
      isStatic: options.isStatic || false,
      isDragging: false
    };

    body.invMass = body.isStatic ? 0 : 1 / body.mass;
    this.bodies.push(body);
    return body;
  }

  removeBody(id) {
    this.bodies = this.bodies.filter(b => b.id !== id);
  }

  clear() {
    this.bodies = [];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    const tick = (time) => {
      if (!this.isRunning) return;
      this.update(time);
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // Set physics options dynamically
  setGravity(value) {
    this.gravity = value;
  }

  setGravityAngle(angleRad) {
    this.gravityAngle = angleRad;
  }

  setBounciness(value) {
    this.bounciness = value;
    this.bodies.forEach(b => {
      b.bounciness = value;
    });
  }

  setFriction(value) {
    this.friction = value;
  }

  startDrag(id, mouseX, mouseY) {
    const body = this.bodies.find(b => b.id === id);
    if (!body || body.isStatic) return;

    this.draggedBody = body;
    body.isDragging = true;
    body.vx = 0;
    body.vy = 0;
    body.angularVelocity = 0;
    
    this.dragOffset = {
      x: mouseX - body.x,
      y: mouseY - body.y
    };
    
    this.lastMousePos = { x: mouseX, y: mouseY };
    this.mouseVelocity = { x: 0, y: 0 };
  }

  updateDrag(mouseX, mouseY) {
    if (!this.draggedBody) return;
    
    const body = this.draggedBody;
    
    // Store current position for velocity estimation
    body.prevX = body.x;
    body.prevY = body.y;
    
    // Set position directly based on cursor
    body.x = mouseX - this.dragOffset.x;
    body.y = mouseY - this.dragOffset.y;
    
    // Track mouse velocity
    this.mouseVelocity = {
      x: mouseX - this.lastMousePos.x,
      y: mouseY - this.lastMousePos.y
    };
    
    this.lastMousePos = { x: mouseX, y: mouseY };
    
    // Make body tilt slightly while dragging
    const targetAngle = this.mouseVelocity.x * 0.02;
    body.angle += (targetAngle - body.angle) * 0.15;
  }

  endDrag() {
    if (!this.draggedBody) return;
    
    const body = this.draggedBody;
    body.isDragging = false;
    
    // Throw with velocity
    body.vx = this.mouseVelocity.x * 0.8;
    body.vy = this.mouseVelocity.y * 0.8;
    
    // Set some spinning momentum based on drag speed
    body.angularVelocity = this.mouseVelocity.x * 0.05;
    
    this.draggedBody = null;
  }

  update(time) {
    let dt = (time - this.lastTime) / 16.666; // Normalize dt around 1.0 (approx 60fps)
    if (dt > 3) dt = 3; // Cap dt to prevent massive jumps on frame drops
    this.lastTime = time;

    const gravityX = Math.cos(this.gravityAngle) * this.gravity;
    const gravityY = Math.sin(this.gravityAngle) * this.gravity;

    // 1. Apply Forces and Integrate Positions
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (b.isStatic) continue;

      if (b.isDragging) {
        // Dragged body position is updated by mouse/touch event directly.
        // We compute its velocity for throwing.
        b.vx = b.x - b.prevX;
        b.vy = b.y - b.prevY;
        b.prevX = b.x;
        b.prevY = b.y;
        continue;
      }

      // Apply gravity
      b.vx += gravityX * dt;
      b.vy += gravityY * dt;

      // Apply air friction
      b.vx *= Math.pow(this.friction, dt);
      b.vy *= Math.pow(this.friction, dt);
      b.angularVelocity *= Math.pow(this.friction, dt);

      // Integrate position
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.angularVelocity * dt;
    }

    // 2. Resolve Collisions between Bodies (Box-on-Box)
    // Run multiple passes for constraint relaxation (gives stiffer stacking)
    const iterations = 3;
    for (let k = 0; k < iterations; k++) {
      this.resolveCollisions();
    }

    // 3. Resolve Boundary Collisions
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (b.isStatic || b.isDragging) continue;

      const halfW = b.width / 2;
      const halfH = b.height / 2;

      // Floor
      if (b.y + halfH > this.height) {
        b.y = this.height - halfH;
        b.vy = -b.vy * b.bounciness;
        b.vx *= this.floorFriction;
        b.angularVelocity = -b.vx * 0.05; // roll rotation
      }
      // Ceiling
      if (b.y - halfH < 0) {
        b.y = halfH;
        b.vy = -b.vy * b.bounciness;
        b.vx *= this.floorFriction;
      }
      // Left Wall
      if (b.x - halfW < 0) {
        b.x = halfW;
        b.vx = -b.vx * b.bounciness;
        b.angularVelocity = b.vy * 0.05;
      }
      // Right Wall
      if (b.x + halfW > this.width) {
        b.x = this.width - halfW;
        b.vx = -b.vx * b.bounciness;
        b.angularVelocity = -b.vy * 0.05;
      }
    }

    // 4. Update DOM Elements
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      // Convert center x, y back to top-left for positioning
      const left = b.x - b.width / 2;
      const top = b.y - b.height / 2;
      b.el.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${b.angle}rad)`;
    }
  }

  resolveCollisions() {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b1 = this.bodies[i];
        const b2 = this.bodies[j];

        if (b1.isStatic && b2.isStatic) continue;

        // Simple AABB collision check
        const hWidths = (b1.width + b2.width) / 2;
        const hHeights = (b1.height + b2.height) / 2;
        const dx = b1.x - b2.x;
        const dy = b1.y - b2.y;

        if (Math.abs(dx) < hWidths && Math.abs(dy) < hHeights) {
          // Collision detected! Calculate overlaps
          const overlapX = hWidths - Math.abs(dx);
          const overlapY = hHeights - Math.abs(dy);

          let normalX = 0;
          let normalY = 0;
          let penetration = 0;

          // Resolve along direction of minimal penetration
          if (overlapX < overlapY) {
            normalX = dx > 0 ? 1 : -1;
            penetration = overlapX;
          } else {
            normalY = dy > 0 ? 1 : -1;
            penetration = overlapY;
          }

          // 1. Positional correction (resolve overlap to prevent sinking/glitching)
          const percent = 0.4; // penetration percentage to resolve per step
          const slop = 0.01; // penetration allowance
          const correction = Math.max(penetration - slop, 0) / (b1.invMass + b2.invMass) * percent;
          const correctionX = normalX * correction;
          const correctionY = normalY * correction;

          if (!b1.isDragging) {
            b1.x += correctionX * b1.invMass;
            b1.y += correctionY * b1.invMass;
          }
          if (!b2.isDragging) {
            b2.x -= correctionX * b2.invMass;
            b2.y -= correctionY * b2.invMass;
          }

          // 2. Impulse resolution (elastic bounce velocities)
          // Relative velocity
          const rvx = b1.vx - b2.vx;
          const rvy = b1.vy - b2.vy;

          // Relative velocity along normal
          const velAlongNormal = rvx * normalX + rvy * normalY;

          // Do not resolve if velocities are separating
          if (velAlongNormal < 0) {
            // Restitution (elasticity)
            const e = Math.min(b1.bounciness, b2.bounciness);

            // Impulse scalar
            let jImpulse = -(1 + e) * velAlongNormal;
            jImpulse /= (b1.invMass + b2.invMass);

            // Apply impulse
            const impulseX = normalX * jImpulse;
            const impulseY = normalY * jImpulse;

            if (!b1.isDragging && !b1.isStatic) {
              b1.vx += impulseX * b1.invMass;
              b1.vy += impulseY * b1.invMass;
              
              // Add simple rotation on impact based on horizontal/vertical offsets
              b1.angularVelocity += (normalY * b1.vx - normalX * b1.vy) * 0.005;
            }
            if (!b2.isDragging && !b2.isStatic) {
              b2.vx -= impulseX * b2.invMass;
              b2.vy -= impulseY * b2.invMass;
              
              b2.angularVelocity -= (normalY * b2.vx - normalX * b2.vy) * 0.005;
            }
          }
        }
      }
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }
}
