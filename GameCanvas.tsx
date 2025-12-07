import React, { useRef, useEffect, useState } from 'react';
import { Vector2, Entity, EntityType, Particle, GameStatus } from '../types';
import { worldToIso, distance, angleToTarget, lerp, clamp } from '../utils/math';
import { CONFIG, COLORS, TILE_WIDTH, TILE_HEIGHT } from '../constants';

interface GameCanvasProps {
  status: GameStatus;
  joystickInput: Vector2;
  isFiring: boolean;
  smartBombTrigger: number;
  onScoreUpdate: (score: number) => void;
  onWaveUpdate: (wave: number) => void;
  onGameOver: () => void;
  fireRateLevel: number; // 0-3
  healthLevel: number; // 0-3
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  status, joystickInput, isFiring, smartBombTrigger, onScoreUpdate, onWaveUpdate, onGameOver, fireRateLevel, healthLevel, radarCanvasRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (avoid React renders for 60fps loop)
  const entities = useRef<Entity[]>([]);
  const particles = useRef<Particle[]>([]);
  const camera = useRef<Vector2>({ x: 0, y: 0 });
  const lastTime = useRef<number>(0);
  const wave = useRef<number>(1);
  const score = useRef<number>(0);
  const spawnTimer = useRef<number>(0);
  const mousePos = useRef<Vector2>({ x: 0, y: 0 });
  
  // Track triggers
  const lastFireRateLevel = useRef<number>(fireRateLevel);
  const lastHealthLevel = useRef<number>(healthLevel);
  const lastSmartBombTrigger = useRef<number>(smartBombTrigger);

  // Init Game
  const initGame = () => {
    entities.current = [];
    particles.current = [];
    score.current = 0;
    wave.current = 1;
    onScoreUpdate(0);
    onWaveUpdate(1);

    // Player
    const baseHp = 100;
    const hpBonus = healthLevel * 50;

    const player: Entity = {
      id: 'player',
      type: EntityType.PLAYER,
      pos: { x: 5, y: 5 },
      vel: { x: 0, y: 0 },
      width: 0.8,
      height: 0.8,
      rotation: 0,
      turretRotation: 0,
      hp: baseHp + hpBonus,
      maxHp: baseHp + hpBonus,
      color: COLORS.primary,
      dead: false,
      cooldown: 0,
      maxCooldown: 15 - (fireRateLevel * 2), // Fire rate upgrade
      glow: 0
    };
    entities.current.push(player);

    // Reset Camera immediately to player position to avoid jumps
    const camX = -player.pos.x * (TILE_WIDTH/2) + player.pos.y * (TILE_WIDTH/2);
    const camY = -player.pos.x * (TILE_HEIGHT/2) - player.pos.y * (TILE_HEIGHT/2);
    camera.current = { x: camX, y: camY };

    // Add some random obstacles
    for(let i=0; i<15; i++) {
        const x = Math.floor(Math.random() * CONFIG.mapWidth);
        const y = Math.floor(Math.random() * CONFIG.mapHeight);
        if (distance({x, y}, {x:5, y:5}) > 5) {
             entities.current.push({
                id: `obs_${i}`,
                type: EntityType.OBSTACLE,
                pos: { x: x + 0.5, y: y + 0.5 },
                vel: { x: 0, y: 0 },
                width: 1,
                height: 1,
                rotation: 0,
                hp: 500,
                maxHp: 500,
                color: '#475569',
                dead: false
            });
        }
    }
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
        // Check if player is dead or missing, if so, re-init
        const player = entities.current.find(e => e.type === EntityType.PLAYER);
        if (!player || player.dead) {
            initGame();
        }
    }
    // If we enter the shop from Game Over, we want to show a fresh tank for visuals
    if (status === GameStatus.SHOP) {
        const player = entities.current.find(e => e.type === EntityType.PLAYER);
        if (!player || player.dead) {
            initGame();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Handle Fire Rate Upgrade Effects
  useEffect(() => {
    if (fireRateLevel > lastFireRateLevel.current) {
        const player = entities.current.find(e => e.type === EntityType.PLAYER);
        if (player) {
            player.maxCooldown = 15 - (fireRateLevel * 2);
            player.glow = 1.0; 
            spawnUpgradeParticles(player.pos, '#22d3ee'); // Cyan
        }
    }
    lastFireRateLevel.current = fireRateLevel;
  }, [fireRateLevel]);

  // Handle Health Upgrade Effects
  useEffect(() => {
    if (healthLevel > lastHealthLevel.current) {
        const player = entities.current.find(e => e.type === EntityType.PLAYER);
        if (player) {
            const baseHp = 100;
            player.maxHp = baseHp + (healthLevel * 50);
            player.hp = player.maxHp; // Heal to full on upgrade
            player.glow = 1.0;
            spawnUpgradeParticles(player.pos, '#10b981'); // Emerald
        }
    }
    lastHealthLevel.current = healthLevel;
  }, [healthLevel]);

  const spawnUpgradeParticles = (pos: Vector2, color: string) => {
      // Expanding Shockwave Ring
      for(let i=0; i<36; i++) {
          const angle = (i / 36) * Math.PI * 2;
          const speed = 4;
          particles.current.push({
            id: `upg_ring_${Date.now()}_${i}`,
            type: EntityType.PARTICLE,
            pos: { ...pos },
            vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            width: 0.1,
            height: 0.1,
            rotation: 0,
            hp: 0, maxHp: 0,
            color: color,
            dead: false,
            life: 40,
            maxLife: 40,
            scale: 0.8,
            startColor: color,
            endColor: '#ffffff'
          });
      }

      // Rising Energy / Sparks
      for(let i=0; i<30; i++) {
        particles.current.push({
            id: `upg_spark_${Date.now()}_${i}`,
            type: EntityType.PARTICLE,
            pos: { x: pos.x + (Math.random() - 0.5), y: pos.y + (Math.random() - 0.5) },
            vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 - 2 },
            width: 0.1,
            height: 0.1,
            rotation: 0,
            hp: 0, maxHp: 0,
            color: '#ffffff',
            dead: false,
            life: 60,
            maxLife: 60,
            scale: Math.random() * 0.5 + 0.5,
            startColor: '#ffffff',
            endColor: color
        });
      }
  };

  // Main Loop
  const animate = (time: number) => {
    // We allow rendering in SHOP state to show the background tank
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP && status !== GameStatus.MENU) {
        requestRef.current = requestAnimationFrame(animate);
        return; 
    }

    const dt = Math.min((time - lastTime.current) / 1000, 0.1); // Cap dt
    lastTime.current = time;

    // Only update game logic (enemies, physics) if PLAYING
    if (status === GameStatus.PLAYING) {
        update(dt);
    } else if (status === GameStatus.SHOP) {
        // In SHOP, we only update particles and visual effects to allow the upgrade effect to play
        updateParticlesOnly(dt);
    }

    // Always draw
    draw();
    drawRadar(); // Radar is drawn on separate canvas
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, joystickInput, isFiring, fireRateLevel, healthLevel, smartBombTrigger]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Mouse for Desktop aiming
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        mousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // --- LOGIC ---

  const spawnEnemy = () => {
    const edge = Math.floor(Math.random() * 4);
    let pos = { x: 0, y: 0 };
    switch(edge) {
        case 0: pos = { x: Math.random() * CONFIG.mapWidth, y: 0 }; break;
        case 1: pos = { x: CONFIG.mapWidth, y: Math.random() * CONFIG.mapHeight }; break;
        case 2: pos = { x: Math.random() * CONFIG.mapWidth, y: CONFIG.mapHeight }; break;
        case 3: pos = { x: 0, y: Math.random() * CONFIG.mapHeight }; break;
    }

    const isHeavy = Math.random() > 0.8 && wave.current > 2;

    entities.current.push({
        id: `enemy_${Date.now()}_${Math.random()}`,
        type: isHeavy ? EntityType.ENEMY_HEAVY : EntityType.ENEMY_LIGHT,
        pos,
        vel: {x:0, y:0},
        width: isHeavy ? 1.2 : 0.8,
        height: isHeavy ? 1.2 : 0.8,
        rotation: 0,
        turretRotation: 0,
        hp: isHeavy ? 200 : 60,
        maxHp: isHeavy ? 200 : 60,
        color: isHeavy ? COLORS.danger : COLORS.accent,
        dead: false,
        cooldown: 0,
        maxCooldown: isHeavy ? 80 : 40,
        glow: 0
    });
  };

  const updateParticlesOnly = (dt: number) => {
      for(let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.life--;
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        if (p.life <= 0) particles.current.splice(i, 1);
    }
    
    // Also update visual effects decay for entities (glow)
    entities.current.forEach(e => {
        if (e.glow && e.glow > 0) {
            e.glow -= dt * 2.5; // Fade out speed
            if (e.glow < 0) e.glow = 0;
        }
    });

    // Camera follow for shop (if player is alive/reset)
    const player = entities.current.find(e => e.type === EntityType.PLAYER);
    if (player && !player.dead) {
        camera.current.x = lerp(camera.current.x, -player.pos.x * (TILE_WIDTH/2) + player.pos.y * (TILE_WIDTH/2), 0.1);
        camera.current.y = lerp(camera.current.y, -player.pos.x * (TILE_HEIGHT/2) - player.pos.y * (TILE_HEIGHT/2), 0.1);
    }
  };

  const fireSmartBomb = (player: Entity) => {
      const angle = player.turretRotation || player.rotation;
      entities.current.push({
          id: `sb_${Date.now()}`,
          type: EntityType.SMART_BOMB,
          pos: { ...player.pos },
          vel: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
          width: 0.5,
          height: 0.5,
          rotation: angle,
          hp: 1, maxHp: 1,
          color: '#fbbf24', // Amber
          dead: false,
          life: 0
      });
      // Launch effect
      spawnExplosion(player.pos, '#fbbf24', 5);
  };

  const update = (dt: number) => {
    const player = entities.current.find(e => e.type === EntityType.PLAYER);
    if (!player || player.dead) return;

    // Check for Smart Bomb Trigger
    if (smartBombTrigger > lastSmartBombTrigger.current) {
        fireSmartBomb(player);
        lastSmartBombTrigger.current = smartBombTrigger;
    }

    // Spawning Logic
    spawnTimer.current += dt;
    const spawnRate = Math.max(1, 5 - wave.current * 0.5);
    if (spawnTimer.current > spawnRate) {
        if (entities.current.filter(e => e.type === EntityType.ENEMY_LIGHT || e.type === EntityType.ENEMY_HEAVY).length < 5 + wave.current * 2) {
             spawnEnemy();
        }
        spawnTimer.current = 0;
    }

    // Player Movement
    const speed = 5 + (fireRateLevel * 0.5); // Speed also slightly increases with fire rate core upgrade
    player.vel.x = joystickInput.x * speed;
    player.vel.y = joystickInput.y * speed;

    // Player Rotation (Body follows velocity)
    if (Math.abs(player.vel.x) > 0.1 || Math.abs(player.vel.y) > 0.1) {
        const targetRot = Math.atan2(player.vel.y, player.vel.x);
        // Smooth rotation
        let diff = targetRot - player.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        player.rotation += diff * dt * 10;
    }

    // Player Turret (Follows Mouse OR Shoot direction on mobile)
    const isMobile = 'ontouchstart' in window;
    if (isMobile) {
         if (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1) {
            player.turretRotation = player.rotation;
         }
    } else {
        if (canvasRef.current) {
            const cx = canvasRef.current.width / 2;
            const cy = canvasRef.current.height / 2;
            const dx = mousePos.current.x - cx;
            const dy = mousePos.current.y - cy;
            player.turretRotation = Math.atan2(dy, dx) - Math.PI / 8; // Slight adjustment for look feel
        }
    }

    // Player Fire
    if (player.cooldown! > 0) player.cooldown! -= 1;
    if (isFiring && player.cooldown! <= 0) {
        fireProjectile(player);
        player.cooldown = player.maxCooldown;
    }

    // Update All Entities
    entities.current.forEach(e => {
        if (e.dead) return;

        // Visual Decay (glow)
        if (e.glow && e.glow > 0) {
            e.glow -= dt * 2.0;
            if (e.glow < 0) e.glow = 0;
        }

        // Apply Velocity
        e.pos.x += e.vel.x * dt;
        e.pos.y += e.vel.y * dt;

        // Friction for non-projectiles
        if (e.type !== EntityType.PROJECTILE && e.type !== EntityType.SMART_BOMB) {
            e.vel.x *= 0.9;
            e.vel.y *= 0.9;
        }

        // Bounds
        e.pos.x = clamp(e.pos.x, 0, CONFIG.mapWidth);
        e.pos.y = clamp(e.pos.y, 0, CONFIG.mapHeight);

        // Smart Bomb Logic (Homing)
        if (e.type === EntityType.SMART_BOMB) {
            e.life = (e.life || 0) + 1;
            if (e.life! > 300) e.dead = true; // 5s lifetime

            // Find closest enemy
            let target: Entity | null = null;
            let minDist = 20;

            entities.current.forEach(other => {
                if ((other.type === EntityType.ENEMY_LIGHT || other.type === EntityType.ENEMY_HEAVY) && !other.dead) {
                    const d = distance(e.pos, other.pos);
                    if (d < minDist) {
                        minDist = d;
                        target = other;
                    }
                }
            });

            if (target) {
                const targetEntity = target as Entity;
                const angleTo = angleToTarget(e.pos, targetEntity.pos);
                // Steer velocity
                const currentAngle = Math.atan2(e.vel.y, e.vel.x);
                let diff = angleTo - currentAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                
                const turnSpeed = 5 * dt;
                const newAngle = currentAngle + clamp(diff, -turnSpeed, turnSpeed);
                const speed = 12; // High speed
                e.vel.x = Math.cos(newAngle) * speed;
                e.vel.y = Math.sin(newAngle) * speed;
                e.rotation = newAngle;
            }

            // Trail
            if (e.life! % 2 === 0) {
                particles.current.push({
                    id: `sb_trail_${Date.now()}_${Math.random()}`,
                    type: EntityType.PARTICLE,
                    pos: { ...e.pos },
                    vel: { x: -e.vel.x * 0.1, y: -e.vel.y * 0.1 },
                    width: 0.1, height: 0.1, rotation: 0,
                    hp: 0, maxHp: 0,
                    color: '#fbbf24',
                    dead: false,
                    life: 15, maxLife: 15,
                    scale: 0.5, startColor: '#fbbf24', endColor: '#000'
                });
            }

            // Collision check
             entities.current.forEach(target => {
                if (target === e || target.dead || target.type === EntityType.PROJECTILE || target.type === EntityType.PARTICLE || target.type === EntityType.PLAYER || target.type === EntityType.SMART_BOMB) return;

                if (distance(e.pos, target.pos) < (target.width / 2 + 0.5)) {
                    e.dead = true;
                    // Massive Damage
                    const damage = 300; 
                    target.hp -= damage;
                    target.glow = 1.0;
                    spawnExplosion(e.pos, '#fbbf24', 20); // Big explosion
                    
                    if (target.hp <= 0) {
                        target.dead = true;
                        spawnExplosion(target.pos, COLORS.danger, 20);
                         if (target.type === EntityType.ENEMY_LIGHT) {
                            score.current += 100;
                            onScoreUpdate(score.current);
                        } else if (target.type === EntityType.ENEMY_HEAVY) {
                            score.current += 300;
                            onScoreUpdate(score.current);
                        }
                    }
                }
            });
        }

        // Enemy AI
        if (e.type === EntityType.ENEMY_LIGHT || e.type === EntityType.ENEMY_HEAVY) {
            const dist = distance(e.pos, player.pos);
            const range = e.type === EntityType.ENEMY_HEAVY ? 12 : 8;
            
            // Move towards player
            if (dist > 3) {
                const angle = angleToTarget(e.pos, player.pos);
                const moveSpeed = e.type === EntityType.ENEMY_HEAVY ? 1.5 : 3;
                e.vel.x += Math.cos(angle) * moveSpeed * dt;
                e.vel.y += Math.sin(angle) * moveSpeed * dt;
                e.rotation = angle;
            }

            // Shoot
            e.turretRotation = angleToTarget(e.pos, player.pos);
            if (e.cooldown! > 0) e.cooldown! -= 1;
            if (dist < range && e.cooldown! <= 0) {
                fireProjectile(e);
                e.cooldown = e.maxCooldown;
            }
        }

        // Projectile Logic
        if (e.type === EntityType.PROJECTILE) {
            e.life = (e.life || 0) + 1;
            if (e.life! > 100) e.dead = true;

            // Check Collision
            entities.current.forEach(target => {
                if (target === e || target.dead || target.type === EntityType.PROJECTILE || target.type === EntityType.PARTICLE || target.type === EntityType.SMART_BOMB) return;
                // Don't hit owner (simple ID check via prefix)
                if (e.id.startsWith('proj_player') && target.type === EntityType.PLAYER) return;
                if (!e.id.startsWith('proj_player') && (target.type === EntityType.ENEMY_LIGHT || target.type === EntityType.ENEMY_HEAVY)) return;

                if (distance(e.pos, target.pos) < (target.width / 2 + 0.2)) {
                    e.dead = true;
                    // Player does more damage with fire rate upgrade (optional mechanic, just adding flat damage for now)
                    const damage = 20 + (fireRateLevel * 5); 
                    target.hp -= damage;
                    target.glow = 0.8; // Flash on hit
                    spawnExplosion(e.pos, COLORS.danger);
                    
                    if (target.hp <= 0) {
                        target.dead = true;
                        spawnExplosion(target.pos, COLORS.danger, 20);
                        if (target.type === EntityType.ENEMY_LIGHT) {
                            score.current += 100;
                            onScoreUpdate(score.current);
                        } else if (target.type === EntityType.ENEMY_HEAVY) {
                            score.current += 300;
                            onScoreUpdate(score.current);
                        } else if (target.type === EntityType.PLAYER) {
                            onGameOver();
                        }
                    }
                }
            });
        }
    });

    // Particle Logic
    updateParticlesOnly(dt);

    // Cleanup Dead Entities
    entities.current = entities.current.filter(e => !e.dead);

    // Camera Follow Smooth
    camera.current.x = lerp(camera.current.x, -player.pos.x * (TILE_WIDTH/2) + player.pos.y * (TILE_WIDTH/2), 0.1);
    camera.current.y = lerp(camera.current.y, -player.pos.x * (TILE_HEIGHT/2) - player.pos.y * (TILE_HEIGHT/2), 0.1);

    // Wave Progression
    if (score.current > wave.current * 1000) {
        wave.current++;
        onWaveUpdate(wave.current);
    }
  };

  const fireProjectile = (owner: Entity) => {
    const angle = owner.turretRotation || owner.rotation;
    const speed = 15;
    entities.current.push({
        id: `proj_${owner.id}_${Date.now()}`,
        type: EntityType.PROJECTILE,
        pos: { ...owner.pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        width: 0.2,
        height: 0.2,
        rotation: angle,
        hp: 1,
        maxHp: 1,
        color: owner.type === EntityType.PLAYER ? COLORS.primary : COLORS.danger,
        dead: false,
        life: 0 // usage as timer
    });

    // Muzzle Flash
    const muzzleDist = 0.8; // Approx turret length
    const mx = owner.pos.x + Math.cos(angle) * muzzleDist;
    const my = owner.pos.y + Math.sin(angle) * muzzleDist;
    particles.current.push({
        id: `muzzle_${Date.now()}`,
        type: EntityType.PARTICLE,
        pos: { x: mx, y: my },
        vel: { x: 0, y: 0 },
        width: 0.3,
        height: 0.3,
        rotation: 0,
        hp: 0, maxHp: 0,
        color: '#ffffff',
        dead: false,
        life: 5,
        maxLife: 5,
        scale: 1,
        startColor: '#ffffff',
        endColor: '#ffffff'
    });
  };

  const spawnExplosion = (pos: Vector2, color: string, count = 8) => {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5;
        particles.current.push({
            id: `p_${Date.now()}_${i}`,
            type: EntityType.PARTICLE,
            pos: { ...pos },
            vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            width: 0.1,
            height: 0.1,
            rotation: 0,
            hp: 0, maxHp: 0,
            color: color,
            dead: false,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            scale: Math.random() * 0.5 + 0.5,
            startColor: color,
            endColor: '#ffffff'
        });
    }
  };

  // --- RENDER ---
  
  const drawRadar = () => {
    const rCanvas = radarCanvasRef.current;
    if (!rCanvas) return;
    const rCtx = rCanvas.getContext('2d');
    if (!rCtx) return;

    const w = rCanvas.width;
    const h = rCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2;
    const range = 25; // World units range radius

    // Clear
    rCtx.clearRect(0, 0, w, h);

    // Clip circle
    rCtx.save();
    rCtx.beginPath();
    rCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    rCtx.clip();

    // Grid lines
    rCtx.strokeStyle = 'rgba(6, 182, 212, 0.2)'; 
    rCtx.lineWidth = 1;
    rCtx.beginPath();
    rCtx.moveTo(0, cy); rCtx.lineTo(w, cy);
    rCtx.moveTo(cx, 0); rCtx.lineTo(cx, h);
    rCtx.stroke();

    // Rings
    rCtx.beginPath();
    rCtx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    rCtx.stroke();

    const player = entities.current.find(e => e.type === EntityType.PLAYER);
    if (!player) {
        rCtx.restore();
        return;
    }

    // Draw Player (Center)
    rCtx.fillStyle = COLORS.primary;
    rCtx.beginPath();
    
    // Rotate player indicator
    rCtx.translate(cx, cy);
    rCtx.rotate(player.rotation);
    rCtx.moveTo(6, 0);
    rCtx.lineTo(-4, 4);
    rCtx.lineTo(-4, -4);
    rCtx.fill();
    rCtx.rotate(-player.rotation);
    rCtx.translate(-cx, -cy);

    // Draw Entities
    entities.current.forEach(e => {
        if (e.dead || e === player) return;
        if (e.type === EntityType.PARTICLE || e.type === EntityType.PROJECTILE || e.type === EntityType.SMART_BOMB) return;

        const dx = e.pos.x - player.pos.x;
        const dy = e.pos.y - player.pos.y;
        
        // Check world distance first to optimization
        if (Math.abs(dx) > range || Math.abs(dy) > range) return;

        const rX = cx + (dx / range) * radius;
        const rY = cy + (dy / range) * radius;

        let color = '#fff';
        let size = 2;

        switch(e.type) {
            case EntityType.ENEMY_LIGHT:
                color = COLORS.danger; 
                size = 3;
                break;
            case EntityType.ENEMY_HEAVY:
                color = '#ef4444'; // Brighter Red
                size = 5;
                break;
            case EntityType.OBSTACLE:
                color = '#64748b'; // Slate
                size = 2;
                break;
        }

        rCtx.fillStyle = color;
        rCtx.beginPath();
        rCtx.arc(rX, rY, size, 0, Math.PI * 2);
        rCtx.fill();
    });

    rCtx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const camOffset = { x: cx + camera.current.x, y: cy + camera.current.y };

    // Draw Grid (Optimization: Only draw visible?)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Draw Floor Grid
    for (let x = 0; x <= CONFIG.mapWidth; x++) {
        const p1 = worldToIso({ x, y: 0 }, camOffset);
        const p2 = worldToIso({ x, y: CONFIG.mapHeight }, camOffset);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }
    for (let y = 0; y <= CONFIG.mapHeight; y++) {
        const p1 = worldToIso({ x: 0, y }, camOffset);
        const p2 = worldToIso({ x: CONFIG.mapWidth, y }, camOffset);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // Sort entities by Y-depth (painter's algo for isometric)
    const allRenderables = [...entities.current, ...particles.current].sort((a, b) => {
        return (a.pos.x + a.pos.y) - (b.pos.x + b.pos.y);
    });

    allRenderables.forEach(e => {
        if (e.type === EntityType.PARTICLE) drawParticle(ctx, e as Particle, camOffset);
        else if (e.type === EntityType.PROJECTILE) drawProjectile(ctx, e, camOffset);
        else if (e.type === EntityType.SMART_BOMB) drawSmartBomb(ctx, e, camOffset);
        else drawEntity(ctx, e, camOffset);
    });
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, e: Entity, offset: Vector2) => {
    const screenPos = worldToIso(e.pos, offset);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(screenPos.x, screenPos.y, e.width * 20, e.height * 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Height offset for "3D" feel
    const zOffset = e.type === EntityType.OBSTACLE ? 30 : 10;
    
    // Determine Color (Apply Glow)
    let mainColor = e.color;
    let sideColor1 = adjustColor(e.color, -40);
    let sideColor2 = adjustColor(e.color, -60);
    
    // Simple flash white effect
    if (e.glow && e.glow > 0) {
        // Overlay white with alpha
        const intensity = e.glow;
        mainColor = mixColor(mainColor, '#ffffff', intensity);
        sideColor1 = mixColor(sideColor1, '#ffffff', intensity);
        sideColor2 = mixColor(sideColor2, '#ffffff', intensity);
    }

    // Draw Body
    ctx.fillStyle = mainColor;
    // Top Face
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y - zOffset - 10);
    ctx.lineTo(screenPos.x + 20 * e.width, screenPos.y - zOffset);
    ctx.lineTo(screenPos.x, screenPos.y - zOffset + 10);
    ctx.lineTo(screenPos.x - 20 * e.width, screenPos.y - zOffset);
    ctx.closePath();
    ctx.fill();
    
    // Side Faces
    ctx.fillStyle = sideColor1;
    ctx.beginPath();
    ctx.moveTo(screenPos.x - 20 * e.width, screenPos.y - zOffset);
    ctx.lineTo(screenPos.x, screenPos.y - zOffset + 10);
    ctx.lineTo(screenPos.x, screenPos.y + 10);
    ctx.lineTo(screenPos.x - 20 * e.width, screenPos.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = sideColor2;
    ctx.beginPath();
    ctx.moveTo(screenPos.x + 20 * e.width, screenPos.y - zOffset);
    ctx.lineTo(screenPos.x, screenPos.y - zOffset + 10);
    ctx.lineTo(screenPos.x, screenPos.y + 10);
    ctx.lineTo(screenPos.x + 20 * e.width, screenPos.y);
    ctx.closePath();
    ctx.fill();

    // Turret (if applicable)
    if (e.type !== EntityType.OBSTACLE) {
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y - zOffset - 5);
        ctx.rotate(e.turretRotation || 0);
        
        let turretColor1 = adjustColor(e.color, 40);
        let turretColor2 = adjustColor(e.color, 20);
        if (e.glow && e.glow > 0) {
             turretColor1 = mixColor(turretColor1, '#ffffff', e.glow);
             turretColor2 = mixColor(turretColor2, '#ffffff', e.glow);
        }

        ctx.fillStyle = turretColor1;
        ctx.fillRect(-5, -5, 25, 10); // Barrel
        ctx.fillStyle = turretColor2;
        ctx.fillRect(-10, -10, 20, 20); // Head
        ctx.restore();

        // Health Bar (In-world)
        if (e.hp < e.maxHp) {
            const hpPct = e.hp / e.maxHp;
            ctx.fillStyle = 'red';
            ctx.fillRect(screenPos.x - 20, screenPos.y - zOffset - 30, 40, 4);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(screenPos.x - 20, screenPos.y - zOffset - 30, 40 * hpPct, 4);
        }
    }
  };

  const drawSmartBomb = (ctx: CanvasRenderingContext2D, e: Entity, offset: Vector2) => {
      const screenPos = worldToIso(e.pos, offset);
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y - 20);
      ctx.rotate(e.rotation);
      
      // Glow
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 10;

      // Body
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(10, 0); // Nose
      ctx.lineTo(-5, 5);
      ctx.lineTo(-5, -5);
      ctx.closePath();
      ctx.fill();
      
      // Engine pulse
      ctx.fillStyle = '#fff';
      ctx.fillRect(-5, -2, 2, 4);

      ctx.restore();
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, e: Entity, offset: Vector2) => {
    const screenPos = worldToIso(e.pos, offset);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y - 20, 4, 0, Math.PI * 2); // -20 Z height
    ctx.fill();
    
    // Trail
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y - 20);
    const tailX = screenPos.x - e.vel.x * 2; 
    const tailY = (screenPos.y - 20) - e.vel.y; 
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle, offset: Vector2) => {
    const screenPos = worldToIso(p.pos, offset);
    const lifePct = p.life / p.maxLife;
    ctx.globalAlpha = lifePct;
    ctx.fillStyle = p.color;
    const size = p.scale * 10 * lifePct;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y - 10, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // Helper to darken/lighten hex
  const adjustColor = (color: string, amount: number) => {
      // Very basic hex manipulator, assumes #RRGGBB or rgb()
      if(color.startsWith('#') && color.length === 7) {
          const num = parseInt(color.slice(1), 16);
          let r = (num >> 16) + amount;
          let g = ((num >> 8) & 0x00FF) + amount;
          let b = (num & 0x0000FF) + amount;
          r = clamp(r, 0, 255);
          g = clamp(g, 0, 255);
          b = clamp(b, 0, 255);
          return `rgb(${r},${g},${b})`;
      }
      return color;
  };
  
  // Helper to mix color with white
  const mixColor = (color: string, target: string, amount: number) => {
      // Simplification: returns target if amount > 0.5, else original.
      if (amount > 0.3) return target;
      return color;
  };

  return <canvas ref={canvasRef} className="block w-full h-full" />;
};

export default GameCanvas;