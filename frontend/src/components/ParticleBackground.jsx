import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 1.5 + 0.5;
        this.opacity = Math.random() * 0.4 + 0.1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        this.vx *= 0.999;
        this.vy *= 0.999;
      }
      draw() {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(0, 255, 136, ${this.opacity})`;
        context.fill();
      }
    }

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle, index) => {
        if (!reduceMotion) particle.update();
        particle.draw();
        for (let next = index + 1; next < particles.length; next += 1) {
          const dx = particle.x - particles[next].x;
          const dy = particle.y - particles[next].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(particles[next].x, particles[next].y);
            context.strokeStyle = `rgba(0, 255, 136, ${(1 - distance / 150) * 0.08})`;
            context.lineWidth = 0.5;
            context.stroke();
          }
        }
      });
      if (!reduceMotion) animationId = requestAnimationFrame(draw);
    };

    resize();
    particles = Array.from({ length: Math.min(24, Math.floor(window.innerWidth / 60)) }, () => new Particle());
    window.addEventListener('resize', resize);
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-background" aria-hidden="true" />;
}
