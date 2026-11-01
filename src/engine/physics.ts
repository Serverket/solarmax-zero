import type { Planet, Ship, Spark, Laser, GameStats, FactionId } from '../types/game';
import { FACTIONS } from '../utils/levels';
import { sound } from '../utils/sound';

export interface PhysicsEngineState {
  planets: Planet[];
  ships: Ship[];
  sparks: Spark[];
  lasers: Laser[];
  stats: GameStats;
  screenShake: number;
}

const BASE_SHIP_SPEED = 180;
const SHIP_ORBIT_SPEED = 1.0;
const LASER_SPEED = 500;
const CELL_SIZE = 40; // For spatial hashing
const GRID_OFFSET = 500;

function getCellKey(cx: number, cy: number): number {
  return ((cx + GRID_OFFSET) << 12) | ((cy + GRID_OFFSET) & 0xFFF);
}

export function updatePhysics(
  state: PhysicsEngineState,
  dt: number,
  _sendPercentage: number = 0.5,
  speedMultiplier: number = 1.0
): PhysicsEngineState {
  const sdt = dt * speedMultiplier;
  const { planets, ships, sparks, lasers } = state;
  const stats = state.stats || { shipsDestroyed: 0, planetsCaptured: 0, shipsProduced: 0 };

  const nextPlanets = planets.map(p => ({ ...p }));
  const nextSparks: Spark[] = [];
  const nextLasers: Laser[] = [];
  const nextShips: Ship[] = [];
  let destroyed = stats.shipsDestroyed;
  let captured = stats.planetsCaptured;
  let produced = stats.shipsProduced;
  let screenShake = Math.max(0, state.screenShake - sdt * 15);

  const shipsByPlanet: Record<string, Ship[]> = {}; // for orbiting ships
  const grid = new Map<number, Ship[]>(); // integer-keyed spatial hash grid (0 string allocations)

  // Populate grid for collision/flocking
  for (let i = 0; i < ships.length; i++) {
    const s = ships[i];
    if (s.vx === 99999 || s.vx === 88888) continue;
    const cx = (s.x / CELL_SIZE) | 0;
    const cy = (s.y / CELL_SIZE) | 0;
    const key = getCellKey(cx, cy);
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(s);
  }

  // Reset combat flag
  nextPlanets.forEach(p => { p.inCombat = false; });

  // Calculate global faction totals
  const factionTotals: Record<string, number> = {};
  ships.forEach(s => {
    factionTotals[s.faction] = (factionTotals[s.faction] || 0) + 1;
  });
  nextPlanets.forEach(p => {
    if (p.owner !== 'neutral') {
      factionTotals[p.owner] = (factionTotals[p.owner] || 0) + p.ships;
    }
  });

  const isMothershipLevel = nextPlanets.some(p => p.type === 'mothership');
  const globalShipLimit = isMothershipLevel ? 1000 : 700;

  // 1. Planet production, BFG superweapon & turrets
  nextPlanets.forEach(planet => {
    planet.pulsePhase += sdt * 2;

    // Decrement EMP timer if active (disables production and defense)
    if (planet.empTimer && planet.empTimer > 0) {
      planet.empTimer = Math.max(0, planet.empTimer - sdt);
    }
    const isEmpActive = (planet.empTimer || 0) > 0;

    // BFG Superweapon Charging, Warmup & Cooldown
    if (planet.type === 'bfg') {
      if (planet.bfgWarmupTimer && planet.bfgWarmupTimer > 0) {
        planet.bfgWarmupTimer = Math.max(0, planet.bfgWarmupTimer - sdt);
        if (planet.bfgWarmupTimer === 0 && planet.bfgWarmupTarget) {
          const targetPlanet = nextPlanets.find(p => p.id === planet.bfgWarmupTarget?.targetPlanetId);
          if (targetPlanet) {
            const { inFlightVaporized } = executeBfgFire(planet, targetPlanet, ships, nextSparks);
            destroyed += inFlightVaporized;
            screenShake = Math.min(screenShake + 16, 22);
          }
          planet.bfgWarmupTarget = undefined;
          planet.bfgWarmupTimer = undefined;
        }
      }

      if (planet.bfgFiringTimer && planet.bfgFiringTimer > 0) {
        planet.bfgFiringTimer = Math.max(0, planet.bfgFiringTimer - sdt);
        if (planet.bfgFiringTimer === 0) {
          planet.bfgBeamTarget = undefined;
        }
      }

      if (planet.owner !== 'neutral') {
        if (planet.bfgCooldown && planet.bfgCooldown > 0) {
          planet.bfgCooldown = Math.max(0, planet.bfgCooldown - sdt);
        } else if (!planet.inCombat && (!planet.bfgWarmupTimer || planet.bfgWarmupTimer <= 0)) {
          const oldCharge = planet.bfgCharge || 0;
          let newCharge = Math.min(18, oldCharge + sdt);
          if (newCharge >= 17.95) newCharge = 18;
          planet.bfgCharge = newCharge;
          if (oldCharge < 18 && newCharge >= 18) {
            sound.playBfgReady();
          }
        }
      } else {
        planet.bfgCharge = 0;
        planet.bfgCooldown = 0;
        planet.bfgWarmupTimer = undefined;
        planet.bfgWarmupTarget = undefined;
      }
    }

    if (planet.owner !== 'neutral' && planet.type !== 'turret' && planet.type !== 'portal' && planet.type !== 'bfg' && !isEmpActive) {
      const isMothership = planet.type === 'mothership';
      const prodMult = isMothership ? 2.5 : 1;
      
      const shipAdd = planet.productionRate * prodMult * sdt;
      const factionTotal = factionTotals[planet.owner] || 0;
      if (factionTotal < globalShipLimit) {
        const oldShips = planet.ships;
        planet.ships += shipAdd;
        produced += Math.floor(planet.ships) - Math.floor(oldShips);
        factionTotals[planet.owner] += shipAdd; // prevent overshooting in same frame
      }
    }

    if (planet.type === 'turret' && planet.owner !== 'neutral' && !isEmpActive) {
      planet.turretCooldown = (planet.turretCooldown || 0) - sdt;
      const range = planet.turretRange || 200;

      // Find closest enemy with zero allocations
      let target: Ship | null = null;
      let closestDistSq = range * range;

      for (let i = 0; i < ships.length; i++) {
        const s = ships[i];
        if (s.vx === 99999 || s.vx === 88888 || s.faction === planet.owner) continue;
        const dx = s.x - planet.x;
        const dy = s.y - planet.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= closestDistSq) {
          closestDistSq = distSq;
          target = s;
        }
      }

      if (target) {
        planet.inCombat = true;
        planet.targetLockId = target.id;

        const tx = target.x;
        const ty = target.y;
        const desiredAngle = Math.atan2(ty - planet.y, tx - planet.x);
        
        if (planet.turretAngle === undefined) planet.turretAngle = desiredAngle;
        
        // Rotate towards target
        let diff = desiredAngle - planet.turretAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        const rotSpeed = 4.0 * sdt;
        if (Math.abs(diff) < rotSpeed) {
          planet.turretAngle = desiredAngle;
          // Fire!
          if (planet.turretCooldown <= 0) {
            planet.turretCooldown = 0.8;
            sound.playLaser();
            
            const startX = planet.x + Math.cos(planet.turretAngle) * planet.radius;
            const startY = planet.y + Math.sin(planet.turretAngle) * planet.radius;
            
            nextLasers.push({
              id: `laser-${Date.now()}-${Math.random()}`,
              x: startX,
              y: startY,
              vx: Math.cos(planet.turretAngle) * LASER_SPEED * 1.5,
              vy: Math.sin(planet.turretAngle) * LASER_SPEED * 1.5,
              targetId: target.id,
              color: FACTIONS[planet.owner].color,
              life: 0.45, maxLife: 0.45
            });
            
            screenShake = Math.min(screenShake + 1.5, 12);
            
            // Recoil sparks
            for(let i=0; i<4; i++) {
               nextSparks.push({
                 x: startX, y: startY,
                 vx: Math.cos(planet.turretAngle - Math.PI + (Math.random()-0.5)) * 50,
                 vy: Math.sin(planet.turretAngle - Math.PI + (Math.random()-0.5)) * 50,
                 color: '#ffaa00',
                 life: 0.25, maxLife: 0.25, size: 1.5
               });
            }
          }
        } else {
          planet.turretAngle += Math.sign(diff) * rotSpeed;
        }
      } else {
        planet.targetLockId = undefined;
        if (planet.turretAngle !== undefined) {
           planet.turretAngle += sdt * 0.5; // Idle rotation
        }
      }
    }
  });

  // 2. Ship movement
  ships.forEach(ship => {
    if (ship.vx === 88888) {
      // Peaceful garrison landing - completely silent, no sound or explosion
      return;
    }
    if (ship.vx === 99999) {
       destroyed++;
       sound.playLaser(); // or small boom
       for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 20 + Math.random() * 50;
          nextSparks.push({
            x: ship.x, y: ship.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            color: FACTIONS[ship.faction].color,
            life: 0.35, maxLife: 0.35, size: 2
          });
       }
       return;
    }

    const target = nextPlanets.find(p => p.id === ship.targetPlanetId);
    if (!target) return;

    if (ship.state === 'transit') {
      const dx = target.x - ship.x;
      const dy = target.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let orbitDist = target.radius + 15 + Math.random() * 15;
      
      // If warping through a friendly portal, fly straight into the core
      const canWarp = target.type === 'portal' && target.owner === ship.faction && target.portalTargetId;
      if (canWarp) {
         orbitDist = 5;
      }

      if (dist <= orbitDist) {
        if (canWarp) {
           // Find the linked portal
           const destPortal = nextPlanets.find(p => p.id === target.portalTargetId);
           if (destPortal) {
              // Warp flash at ENTRY
              for(let i=0; i<8; i++) {
                 nextSparks.push({
                    x: ship.x, y: ship.y,
                    vx: (Math.random()-0.5)*150, vy: (Math.random()-0.5)*150,
                    color: '#00ffff', life: 0.4, maxLife: 0.4, size: 3
                 });
              }
              // ENTRY Shockwave ring
              nextSparks.push({
                 x: ship.x, y: ship.y, vx: 0, vy: 0,
                 color: '#00ffff', life: 0.6, maxLife: 0.6, size: 40, type: 'shockwave'
              });

              // Teleport
              ship.x = destPortal.x;
              ship.y = destPortal.y;
              
              if (ship.finalTargetId) {
                 ship.targetPlanetId = ship.finalTargetId;
                 ship.finalTargetId = undefined;
                 // Leave state as 'transit' so it flies to finalTargetId
              } else {
                 // It was sent directly to the portal. It should emerge and stay at the destination portal.
                 ship.targetPlanetId = destPortal.id;
                 ship.state = 'orbit';
                 ship.orbitAngle = Math.random() * Math.PI * 2;
                 ship.orbitRadius = destPortal.radius + 15 + Math.random() * 15;
                 ship.orbitDirection = Math.random() > 0.5 ? 1 : -1;
              }
              
              // Warp flash at EXIT
              for(let i=0; i<8; i++) {
                 nextSparks.push({
                    x: ship.x, y: ship.y,
                    vx: (Math.random()-0.5)*150, vy: (Math.random()-0.5)*150,
                    color: '#00ffff', life: 0.4, maxLife: 0.4, size: 3
                 });
              }
              // EXIT Shockwave ring
              nextSparks.push({
                 x: ship.x, y: ship.y, vx: 0, vy: 0,
                 color: '#00ffff', life: 0.6, maxLife: 0.6, size: 40, type: 'shockwave'
              });
           } else {
              // Fallback if portal is broken
              ship.state = 'orbit';
              ship.orbitAngle = Math.atan2(ship.y - target.y, ship.x - target.x);
              ship.orbitRadius = orbitDist;
              ship.orbitDirection = Math.random() > 0.5 ? 1 : -1;
           }
        } else {
           // Standard planet arrival, or enemy portal arrival (can't warp through enemy portal)
           ship.state = 'orbit';
           ship.orbitAngle = Math.atan2(ship.y - target.y, ship.x - target.x);
           ship.orbitRadius = orbitDist;
           ship.orbitDirection = Math.random() > 0.5 ? 1 : -1;
        }
      } else {
        // Separation logic using spatial grid (only check same cell and adjacent with 0 string allocations)
        let sepX = 0, sepY = 0;
        let count = 0;
        
        const cx = (ship.x / CELL_SIZE) | 0;
        const cy = (ship.y / CELL_SIZE) | 0;
        for (let di = -1; di <= 1; di++) {
          const rowKey = (cx + di + GRID_OFFSET) << 12;
          for (let dj = -1; dj <= 1; dj++) {
            const key = rowKey | ((cy + dj + GRID_OFFSET) & 0xFFF);
            const cell = grid.get(key);
            if (cell) {
              const cellLen = cell.length;
              for (let k = 0; k < cellLen; k++) {
                const other = cell[k];
                if (other.id !== ship.id && other.state === 'transit' && other.faction === ship.faction && other.targetPlanetId === ship.targetPlanetId) {
                  const odx = ship.x - other.x;
                  const ody = ship.y - other.y;
                  const odistSq = odx * odx + ody * ody;
                  if (odistSq < 150 && odistSq > 0.1) { // 12 px approx
                    const odist = Math.sqrt(odistSq);
                    sepX += (odx / odist) * (15 - odist); // weight by closeness
                    sepY += (ody / odist) * (15 - odist);
                    count++;
                  }
                }
              }
            }
          }
        }

        const dirX = dx / dist;
        const dirY = dy / dist;
        const curveAmt = (ship.curveOffset || 0) * Math.sin((dist / 400) * Math.PI) * 0.01;
        
        let tvx = (dirX - dirY * curveAmt) * BASE_SHIP_SPEED;
        let tvy = (dirY + dirX * curveAmt) * BASE_SHIP_SPEED;
        
        if (count > 0) {
           tvx += sepX * 15;
           tvy += sepY * 15;
        }
        
        // Normalize speed
        const speed = Math.sqrt(tvx*tvx + tvy*tvy);
        if (speed > BASE_SHIP_SPEED) {
           tvx = (tvx/speed) * BASE_SHIP_SPEED;
           tvy = (tvy/speed) * BASE_SHIP_SPEED;
        }

        const steer = Math.min(1, sdt * 5);
        ship.vx += (tvx - ship.vx) * steer;
        ship.vy += (tvy - ship.vy) * steer;
        ship.x += ship.vx * sdt;
        ship.y += ship.vy * sdt;
      }
    } else if (ship.state === 'orbit') {
       // Orbit movement (smooth interpolation)
       ship.orbitAngle = (ship.orbitAngle || 0) + (SHIP_ORBIT_SPEED * (ship.orbitDirection || 1) * sdt);
       const targetX = target.x + Math.cos(ship.orbitAngle) * (ship.orbitRadius || target.radius + 15);
       const targetY = target.y + Math.sin(ship.orbitAngle) * (ship.orbitRadius || target.radius + 15);
       
       const ox = ship.x;
       const oy = ship.y;
       
       ship.x += (targetX - ship.x) * sdt * 6;
       ship.y += (targetY - ship.y) * sdt * 6;
       
       // Update vx/vy just for visual orientation
       if (sdt > 0) {
          ship.vx = (ship.x - ox) / sdt;
          ship.vy = (ship.y - oy) / sdt;
       }
       
       if (!shipsByPlanet[target.id]) shipsByPlanet[target.id] = [];
       shipsByPlanet[target.id].push(ship);
    }
    
    // Portal warp check
    if (ship.warpCooldown) {
       ship.warpCooldown -= sdt;
       if (ship.warpCooldown <= 0) ship.warpCooldown = 0;
    }

    if (ship.state === 'orbit' && target.type === 'portal' && target.portalTargetId && (!ship.warpCooldown || ship.warpCooldown <= 0)) {
       const dest = nextPlanets.find(p => p.id === target.portalTargetId);
       if (dest && target.owner === ship.faction) {
           ship.targetPlanetId = ship.finalTargetId || dest.id;
           ship.state = ship.finalTargetId ? 'transit' : 'orbit';
           ship.orbitAngle = Math.random() * Math.PI * 2;
           ship.orbitRadius = dest.radius + 15 + Math.random() * 15;
           ship.orbitDirection = Math.random() > 0.5 ? 1 : -1;
           ship.x = dest.x + Math.cos(ship.orbitAngle) * ship.orbitRadius;
           ship.y = dest.y + Math.sin(ship.orbitAngle) * ship.orbitRadius;
           ship.finalTargetId = undefined;
           ship.warpCooldown = 3.0; // 3 seconds before can warp again
           
           for (let i = 0; i < 6; i++) {
             const a = Math.random() * Math.PI * 2;
             const sp = 30 + Math.random() * 40;
             nextSparks.push({
               x: dest.x, y: dest.y,
               vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
               color: '#88ddff',
               life: 0.3, maxLife: 0.3, size: 2
             });
           }
       }
    }

    ship.cooldown = (ship.cooldown || 0) - sdt;
    nextShips.push(ship);
  });

  // 3. Lasers (True Projectiles) & Collision Detection
  // Build fast O(1) lookup table for ships targeted by lasers
  const shipMap = new Map<string, Ship>();
  for (let i = 0; i < nextShips.length; i++) {
     shipMap.set(nextShips[i].id, nextShips[i]);
  }

  lasers.forEach(l => {
     l.life -= sdt;
     if (l.life <= 0) return;
     
     // Homing logic for lasers to ensure they hit moving ships
     let lvx = l.vx;
     let lvy = l.vy;
     let hit = false;
     
     if (l.targetId) {
        const targetShip = shipMap.get(l.targetId);
        if (targetShip && targetShip.vx !== 99999 && targetShip.vx !== 88888) {
           const dx = targetShip.x - l.x;
           const dy = targetShip.y - l.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < 12) {
              targetShip.vx = 99999; // destroy
              hit = true;
           } else {
              // steer towards target
              const speed = Math.sqrt(lvx*lvx + lvy*lvy);
              const tx = (dx/dist) * speed;
              const ty = (dy/dist) * speed;
              lvx += (tx - lvx) * sdt * 10;
              lvy += (ty - lvy) * sdt * 10;
           }
        } else {
           // Target destroyed or lost: dissipate rapidly to prevent cosmic clutter
           l.life = Math.min(l.life, 0.08);
        }
     } else if (l.targetPlanetId) {
        const p = nextPlanets.find(pl => pl.id === l.targetPlanetId);
        if (p) {
           const dx = p.x - l.x;
           const dy = p.y - l.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < p.radius) {
              hit = true;
              p.ships = Math.max(0, p.ships - 1);
              destroyed++;
              for(let i=0; i<4; i++) {
                 nextSparks.push({
                    x: l.x, y: l.y,
                    vx: (Math.random()-0.5)*40 - l.vx * 0.1, 
                    vy: (Math.random()-0.5)*40 - l.vy * 0.1,
                    color: '#ffffff',
                    life: 0.2, maxLife: 0.2, size: 1
                 });
              }
           }
        }
     }
     
     if (hit) {
        l.life = 0; // consumed
     } else {
        l.x += lvx * sdt;
        l.y += lvy * sdt;
        l.vx = lvx;
        l.vy = lvy;
        nextLasers.push(l);
     }
  });

  // 4. Combat logic (Ships firing lasers)
  Object.keys(shipsByPlanet).forEach(planetId => {
     const planet = nextPlanets.find(p => p.id === planetId);
     if (!planet) return;
     
     const orbiters = shipsByPlanet[planetId];
     
     // Determine if contested with zero allocations
     let hasCombat = false;
     let firstFaction: FactionId | null = null;
     for (let i = 0; i < orbiters.length; i++) {
        const f = orbiters[i].faction;
        if (!firstFaction) {
           firstFaction = f;
        } else if (firstFaction !== f) {
           hasCombat = true;
           break;
        }
     }
     if (!hasCombat && firstFaction && firstFaction !== planet.owner) {
        hasCombat = true;
     }
     if (hasCombat) {
        planet.inCombat = true;
     }

     for (let i = 0; i < orbiters.length; i++) {
        const ship = orbiters[i];
        if (ship.vx === 99999 || ship.vx === 88888) continue;
        if ((ship.cooldown || 0) <= 0) {
           // Find target with zero closure allocations
           let enemy: Ship | null = null;
           for (let j = 0; j < orbiters.length; j++) {
              const o = orbiters[j];
              if (o.faction !== ship.faction && o.vx !== 99999 && o.vx !== 88888) {
                 enemy = o;
                 break;
              }
           }
           if (enemy) {
              ship.cooldown = 0.5 + Math.random() * 0.5;
              const angle = Math.atan2(enemy.y - ship.y, enemy.x - ship.x);
              nextLasers.push({
                 id: `laser-${Date.now()}-${Math.random()}`,
                 x: ship.x, y: ship.y,
                 vx: Math.cos(angle) * LASER_SPEED,
                 vy: Math.sin(angle) * LASER_SPEED,
                 targetId: enemy.id,
                 color: FACTIONS[ship.faction].color,
                 life: 0.35, maxLife: 0.35
              });
              sound.playLaser();
           }
        }
     }
   });

  // 5. Capture & Ship transfer
  nextPlanets.forEach(planet => {
    const orbiters = shipsByPlanet[planet.id] || [];
    
    // Accumulator for smooth absorption (10 ships per second)
    planet.absorbAccum = (planet.absorbAccum || 0) + sdt * 10;
    const absorbCount = Math.floor(planet.absorbAccum);
    
    if (absorbCount > 0) {
       planet.absorbAccum -= absorbCount;
       
       for (let i = 0; i < absorbCount; i++) {
          let absorbed = false;

          // 1. If owned and friendly orbiters, land them (zero allocations)
          if (planet.owner !== 'neutral') {
             for (let j = 0; j < orbiters.length; j++) {
                const s = orbiters[j];
                if (s.faction === planet.owner && s.vx !== 99999 && s.vx !== 88888) {
                   s.vx = 88888; // mark as peacefully landed (silent)
                   planet.ships++;
                   absorbed = true;
                   
                   // Landing sparks (visual feedback for absorption)
                   for (let k = 0; k < 2; k++) {
                      nextSparks.push({
                         x: planet.x, y: planet.y,
                         vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
                         color: 'rgba(255, 255, 255, 0.8)',
                         life: 0.2, maxLife: 0.2, size: 1.5
                      });
                   }
                   break;
                }
             }
          }

          // 2. Kamikaze enemies into garrison (1-for-1 trade) (zero allocations)
          if (!absorbed && planet.ships > 0) {
             for (let j = 0; j < orbiters.length; j++) {
                const s = orbiters[j];
                if (s.faction !== planet.owner && s.vx !== 99999 && s.vx !== 88888) {
                   s.vx = 99999; // kamikaze (casualty stat stays intact)
                   planet.ships = Math.max(0, planet.ships - 1);
                   absorbed = true;
                   
                   // Kamikaze sparks
                   for (let k = 0; k < 3; k++) {
                      nextSparks.push({
                         x: planet.x, y: planet.y,
                         vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
                         color: FACTIONS[s.faction].color,
                         life: 0.3, maxLife: 0.3, size: 2
                      });
                   }
                   break;
                }
             }
          }

          if (!absorbed) break; // Nothing left to absorb
       }
    }

    // Determine enemy factions and single dominant capturing faction with zero allocations
    let capturingF: FactionId | null = null;
    let multipleEnemyFactions = false;
    let capOrbitersCount = 0;

    for (let i = 0; i < orbiters.length; i++) {
       const s = orbiters[i];
       if (s.vx !== 99999 && s.vx !== 88888 && s.faction !== planet.owner) {
          if (!capturingF) {
             capturingF = s.faction;
             capOrbitersCount = 1;
          } else if (capturingF === s.faction) {
             capOrbitersCount++;
          } else {
             multipleEnemyFactions = true;
          }
       }
    }

    if (planet.ships <= 0 && capturingF && !multipleEnemyFactions) {
       if (planet.capturingFaction !== capturingF) {
          planet.capturingFaction = capturingF;
          planet.captureProgress = 0;
          if (planet.owner !== 'neutral') {
             planet.owner = 'neutral';
          }
       }
       
       if (capOrbitersCount > 0) {
          const capMult = planet.type === 'bfg' ? 0.025 : 0.05;
          const capSpeed = capOrbitersCount * capMult * sdt;
          planet.captureProgress += capSpeed;
          if (planet.captureProgress >= 1) {
             planet.owner = capturingF;
             planet.capturingFaction = null;
             planet.captureProgress = 0;
             if (planet.type === 'bfg') {
                planet.bfgCharge = 0;
                planet.bfgCooldown = 0;
             }
             captured++;
             sound.playCapture();
             screenShake = Math.min(screenShake + (planet.type === 'bfg' ? 8 : 4), 18);
             for (let i = 0; i < 20; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 40 + Math.random() * 60;
                nextSparks.push({
                   x: planet.x, y: planet.y,
                   vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                   color: FACTIONS[planet.owner].color,
                   life: 0.6, maxLife: 0.6, size: 2.5
                });
             }
             
             // WARP ALL SHIPS IMMEDIATELY AFTER CAPTURE
             if (planet.type === 'portal' && planet.portalTargetId) {
                const destPortal = nextPlanets.find(p => p.id === planet.portalTargetId);
                if (destPortal) {
                   for (let i = 0; i < orbiters.length; i++) {
                      const s = orbiters[i];
                      if (s.faction === capturingF && s.vx !== 99999 && s.vx !== 88888) {
                         s.x = destPortal.x;
                         s.y = destPortal.y;
                         s.targetPlanetId = destPortal.id;
                         s.orbitRadius = destPortal.radius + 15 + Math.random() * 15;
                         s.orbitAngle = Math.random() * Math.PI * 2;
                         
                         for (let k = 0; k < 3; k++) {
                            nextSparks.push({
                               x: destPortal.x, y: destPortal.y,
                               vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
                               color: '#00ffff', life: 0.4, maxLife: 0.4, size: 3
                            });
                         }
                      }
                   }
                   
                   // Shockwaves at both ends
                   nextSparks.push({
                      x: planet.x, y: planet.y, vx: 0, vy: 0,
                      color: '#00ffff', life: 0.6, maxLife: 0.6, size: 40, type: 'shockwave'
                   });
                   nextSparks.push({
                      x: destPortal.x, y: destPortal.y, vx: 0, vy: 0,
                      color: '#00ffff', life: 0.6, maxLife: 0.6, size: 40, type: 'shockwave'
                   });
                }
             }
          }
       }
    } else {
       // Decay capture progress if no capturing ships or multiple enemies (2x faster for BFG)
       const decaySpeed = planet.type === 'bfg' ? 0.2 : 0.1;
       planet.captureProgress = Math.max(0, planet.captureProgress - sdt * decaySpeed);
       if (planet.captureProgress === 0) planet.capturingFaction = null;
    }
  });

  // Update existing Sparks and merge with newly generated sparks
  const updatedSparks: Spark[] = [];
  sparks.forEach(sp => {
    sp.life -= sdt;
    if (sp.life > 0) {
      sp.x += sp.vx * sdt;
      sp.y += sp.vy * sdt;
      sp.vx *= 0.9;
      sp.vy *= 0.9;
      updatedSparks.push(sp);
    }
  });

  // Limit total sparks and lasers to ensure silky-smooth 60+ FPS
  const MAX_SPARKS = 120;
  const combinedSparks = updatedSparks.concat(nextSparks);
  const allSparks = combinedSparks.length > MAX_SPARKS 
    ? combinedSparks.slice(combinedSparks.length - MAX_SPARKS) 
    : combinedSparks;

  const MAX_LASERS = 50;
  const allLasers = nextLasers.length > MAX_LASERS
    ? nextLasers.slice(nextLasers.length - MAX_LASERS)
    : nextLasers;

  return {
    planets: nextPlanets,
    ships: nextShips.filter(s => s.vx !== 99999 && s.vx !== 88888),
    sparks: allSparks,
    lasers: allLasers,
    screenShake,
    stats: {
      ...stats,
      shipsProduced: produced,
      shipsDestroyed: destroyed,
      planetsCaptured: captured
    }
  };
}

export function startBfgWarmup(
  bfgPlanet: Planet,
  targetPlanet: Planet
): void {
  bfgPlanet.bfgCharge = 0;
  bfgPlanet.bfgCooldown = 20;
  bfgPlanet.bfgWarmupTimer = 0.65;
  bfgPlanet.bfgWarmupTarget = { x: targetPlanet.x, y: targetPlanet.y, targetPlanetId: targetPlanet.id };
  bfgPlanet.turretAngle = Math.atan2(targetPlanet.y - bfgPlanet.y, targetPlanet.x - bfgPlanet.x);
  sound.playBfgWarmup();
}

export function executeBfgFire(
  bfgPlanet: Planet,
  targetPlanet: Planet,
  ships: Ship[],
  sparks: Spark[]
): { inFlightVaporized: number } {
  bfgPlanet.bfgCharge = 0;
  bfgPlanet.bfgCooldown = 20;
  bfgPlanet.bfgFiringTimer = 0.85;
  bfgPlanet.bfgBeamTarget = { x: targetPlanet.x, y: targetPlanet.y, targetPlanetId: targetPlanet.id };
  bfgPlanet.bfgWarmupTimer = undefined;
  bfgPlanet.bfgWarmupTarget = undefined;
  bfgPlanet.turretAngle = Math.atan2(targetPlanet.y - bfgPlanet.y, targetPlanet.x - bfgPlanet.x);

  sound.playBfgFire();

  // 1. Vaporize 85% of target planet garrison
  const startingTargetShips = targetPlanet.ships;
  targetPlanet.ships = Math.max(0, Math.floor(startingTargetShips * 0.15));

  // 2. 10s EMP paralysis on target planet (freezes production and turrets)
  targetPlanet.empTimer = 10;

  // 3. Vaporize in-flight enemy ships crossing the beam line
  const x1 = bfgPlanet.x, y1 = bfgPlanet.y;
  const x2 = targetPlanet.x, y2 = targetPlanet.y;
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  let inFlightVaporized = 0;
  if (lenSq > 0) {
    ships.forEach(ship => {
      if (ship.vx === 99999 || ship.vx === 88888 || ship.faction === bfgPlanet.owner) return;
      let t = ((ship.x - x1) * dx + (ship.y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      const distSq = (ship.x - projX) ** 2 + (ship.y - projY) ** 2;

      if (distSq < 28 * 28) {
        ship.vx = 99999;
        inFlightVaporized++;
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 40 + Math.random() * 80;
          sparks.push({
            x: ship.x,
            y: ship.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            color: '#00f0ff',
            life: 0.45,
            maxLife: 0.45,
            size: 2.5
          });
        }
      }
    });
  }

  // 4. Shockwaves and sparks at impact epicenter
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 120;
    sparks.push({
      x: targetPlanet.x,
      y: targetPlanet.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      color: FACTIONS[bfgPlanet.owner]?.color || '#00f0ff',
      life: 0.7,
      maxLife: 0.7,
      size: 3
    });
  }
  sparks.push({
    x: targetPlanet.x,
    y: targetPlanet.y,
    vx: 0,
    vy: 0,
    color: '#ffffff',
    life: 0.8,
    maxLife: 0.8,
    size: targetPlanet.radius * 2.2,
    type: 'shockwave'
  });

  return { inFlightVaporized };
}

export function fireBfgPlanet(
  bfgPlanetId: string,
  targetPlanetId: string,
  state: PhysicsEngineState
): PhysicsEngineState {
  const nextPlanets = state.planets.map(p => ({ ...p }));
  const bfg = nextPlanets.find(p => p.id === bfgPlanetId);
  const target = nextPlanets.find(p => p.id === targetPlanetId);
  if (!bfg || !target || bfg.type !== 'bfg' || (bfg.bfgCharge || 0) < 18 || (bfg.bfgWarmupTimer && bfg.bfgWarmupTimer > 0)) {
    return state;
  }

  startBfgWarmup(bfg, target);

  return {
    ...state,
    planets: nextPlanets,
    screenShake: Math.min(state.screenShake + 4, 10)
  };
}

export function launchFleets(
  sourcePlanetIds: string[],
  targetPlanetId: string,
  state: PhysicsEngineState,
  sendRatio: number,
  overrideFaction?: FactionId
): PhysicsEngineState {
  const nextPlanets = state.planets.map(p => ({ ...p }));
  const target = nextPlanets.find(p => p.id === targetPlanetId);
  if (!target) return state;

  const newShips: Ship[] = [...state.ships];
  const newSparks: Spark[] = [...state.sparks];
  let totalLaunched = 0;
  let bfgFired = false;

  sourcePlanetIds.forEach(sourceId => {
    const source = nextPlanets.find(p => p.id === sourceId);
    if (!source || source.id === targetPlanetId) return;

    // Check if this source is a ready BFG superweapon!
    if (source.type === 'bfg' && (source.bfgCharge || 0) >= 18 && (!source.bfgWarmupTimer || source.bfgWarmupTimer <= 0)) {
      startBfgWarmup(source, target);
      bfgFired = true;
    }

    if (source.ships < 1 && !overrideFaction) return;

    const availableShips = Math.max(1, source.ships);
    const countToLaunch = Math.max(1, Math.floor(availableShips * sendRatio));
    source.ships = Math.max(0, source.ships - countToLaunch);
    totalLaunched += countToLaunch;

    let actualTarget = target;
    let finalTargetId: string | undefined = undefined;

    // Portal routing check
    const alliedPortals = nextPlanets.filter(p => p.type === 'portal' && p.owner === source.owner && p.portalTargetId);
    if (alliedPortals.length > 0 && target.type !== 'portal') {
       const directDist = Math.sqrt((target.x - source.x)**2 + (target.y - source.y)**2);
       let bestPortalRoute = null;
       let bestPortalDist = directDist;
       
       alliedPortals.forEach(portal => {
          const destPortal = nextPlanets.find(p => p.id === portal.portalTargetId);
          if (destPortal) {
             const distToPortal = Math.sqrt((portal.x - source.x)**2 + (portal.y - source.y)**2);
             const distFromDestToTarget = Math.sqrt((target.x - destPortal.x)**2 + (target.y - destPortal.y)**2);
             const routeDist = distToPortal + distFromDestToTarget + 100; // 100 distance penalty for warping
             
             if (routeDist < bestPortalDist) {
                bestPortalDist = routeDist;
                bestPortalRoute = portal;
             }
          }
       });
       
       if (bestPortalRoute) {
          actualTarget = bestPortalRoute;
          finalTargetId = target.id;
       }
    }

    for (let i = 0; i < countToLaunch; i++) {
      const baseAngle = Math.atan2(actualTarget.y - source.y, actualTarget.x - source.x);
      const spreadAngle = baseAngle + (Math.random() - 0.5) * 1.0;
      const offsetRadius = source.radius * 0.8;
      const startX = source.x + Math.cos(spreadAngle) * offsetRadius;
      const startY = source.y + Math.sin(spreadAngle) * offsetRadius;

      newShips.push({
        id: `ship-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        faction: overrideFaction || source.owner,
        x: startX,
        y: startY,
        vx: Math.cos(spreadAngle) * 60,
        vy: Math.sin(spreadAngle) * 60,
        state: 'transit',
        sourcePlanetId: source.id,
        targetPlanetId: actualTarget.id,
        finalTargetId,
        curveOffset: (Math.random() - 0.5) * 80, // wider spread
        cooldown: Math.random() * 0.5
      });
    }
  });

  if (totalLaunched > 0) {
    sound.playLaunch();
  }

  return {
    ...state,
    planets: nextPlanets,
    ships: newShips.filter(s => s.vx !== 99999 && s.vx !== 88888),
    sparks: newSparks,
    screenShake: bfgFired ? Math.min(state.screenShake + 4, 10) : state.screenShake
  };
}

export function runAIDecisions(
  state: PhysicsEngineState, 
  _sendRatio: number, 
  activeHumanFactions: FactionId[] = ['player'],
  onAILaunch?: (sourceIds: string[], targetId: string, ratio: number, faction: FactionId) => void
): PhysicsEngineState {
  const aiFactions: FactionId[] = ['ai1', 'ai2', 'ai3', 'ai4'].filter(f => !activeHumanFactions.includes(f as FactionId)) as FactionId[];
  let updatedState = { ...state };

  aiFactions.forEach(aiFaction => {
    const aiPlanets = updatedState.planets.filter(p => p.owner === aiFaction);
    if (aiPlanets.length === 0) return;

    const totalShips = aiPlanets.reduce((sum, p) => sum + p.ships, 0);
    if (totalShips < 5) return;

    // Aggressive AI: attack with any planet that has advantage
    aiPlanets.forEach(source => {
      if (source.type === 'bfg') return; // BFG superweapons use dedicated strategic firing logic below
      if (source.ships < 3) return;
      if (Math.random() > 0.3) return; // Not every tick

      const potentialTargets = updatedState.planets.filter(p => p.id !== source.id);
      if (potentialTargets.length === 0) return;

      // Priority 1: Nearby vulnerable enemy planets (low ships)
      let bestTarget: Planet | null = null;
      let bestScore = -Infinity;

      potentialTargets.forEach(target => {
        if (target.owner === aiFaction) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        let effectiveDist = Math.sqrt(dx * dx + dy * dy);
        
        // Portal routing logic for AI distance
        const alliedPortals = updatedState.planets.filter(p => p.type === 'portal' && p.owner === aiFaction && p.portalTargetId);
        if (alliedPortals.length > 0 && target.type !== 'portal') {
           alliedPortals.forEach(portal => {
              const destPortal = updatedState.planets.find(p => p.id === portal.portalTargetId);
              if (destPortal) {
                 const distToPortal = Math.sqrt((portal.x - source.x)**2 + (portal.y - source.y)**2);
                 const distFromDestToTarget = Math.sqrt((target.x - destPortal.x)**2 + (target.y - destPortal.y)**2);
                 const routeDist = distToPortal + distFromDestToTarget + 100; // warp penalty
                 if (routeDist < effectiveDist) effectiveDist = routeDist;
              }
           });
        }

        let score = 0;
        if (target.owner === 'neutral') score += 60; // prioritize neutral expansion
        if (target.type === 'bfg' && target.owner === 'neutral') score += 100; // massive strategic objective: secure neutral BFG!
        if (target.type === 'mothership') score += 80; // massive priority for motherships
        if (target.ships < source.ships * 0.4) score += 40;
        if (target.ships < source.ships * 0.8) score += 20;
        score -= effectiveDist * 0.04;
        
        // Bonus for attacking player
        if (target.owner === 'player') score += 15;
        
        // Penalty if target is heavily defended
        if (target.ships > source.ships * 1.5) score -= 50;

        if (score > bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      });

      const bt = bestTarget as Planet | null;
      if (bt) {
        const ratio = bt.owner === 'neutral' ? 0.5 : 0.8; // commit more to non-neutral
        if (onAILaunch) {
          onAILaunch([source.id], bt.id, ratio, aiFaction);
        } else {
          updatedState = launchFleets([source.id], bt.id, updatedState, ratio);
        }
      }
    });

    // Autonomous AI BFG Superweapon Trigger
    const readyBfg = aiPlanets.find(p => p.type === 'bfg' && (p.bfgCharge || 0) >= 18);
    if (readyBfg) {
      const hostilePlanets = updatedState.planets.filter(p => p.owner !== aiFaction && p.owner !== 'neutral');
      if (hostilePlanets.length > 0) {
        hostilePlanets.sort((a, b) => {
          const valA = (a.owner === 'player' ? 60 : 0) + a.ships;
          const valB = (b.owner === 'player' ? 60 : 0) + b.ships;
          return valB - valA;
        });
        const targetToObliterate = hostilePlanets[0];
        updatedState = fireBfgPlanet(readyBfg.id, targetToObliterate.id, updatedState);
      }
    }

    // Reinforcement: send ships from back planets to front
    const frontPlanets = aiPlanets.filter(p => {
      return updatedState.planets.some(target => {
        if (target.owner === aiFaction || target.owner === 'neutral') return false;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        return Math.sqrt(dx * dx + dy * dy) < 400; // increased range for definition of 'front'
      });
    });

    if (frontPlanets.length > 0) {
      const backPlanets = aiPlanets.filter(p => !frontPlanets.includes(p) && p.ships > 10);
      backPlanets.forEach(back => {
        if (Math.random() < 0.4) {
          const closest = frontPlanets.reduce((closest, front) => {
            const d1 = Math.sqrt((front.x - back.x) ** 2 + (front.y - back.y) ** 2);
            const d2 = Math.sqrt((closest.x - back.x) ** 2 + (closest.y - back.y) ** 2);
            return d1 < d2 ? front : closest;
          });
          if (onAILaunch) {
            onAILaunch([back.id], closest.id, 0.5, aiFaction);
          } else {
            updatedState = launchFleets([back.id], closest.id, updatedState, 0.5);
          }
        }
      });
    }
  });

  return updatedState;
}
