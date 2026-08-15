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

function getCell(x: number, y: number) {
  return `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
}

export function updatePhysics(
  state: PhysicsEngineState,
  dt: number,
  _sendPercentage: number,
  speedMultiplier: number
): PhysicsEngineState {
  const sdt = dt * speedMultiplier;
  const { planets, ships, sparks, lasers, stats } = state;

  const nextPlanets = planets.map(p => ({ ...p }));
  const nextSparks = [...sparks];
  const nextLasers: Laser[] = [];
  const nextShips: Ship[] = [];
  let destroyed = stats.shipsDestroyed;
  let captured = stats.planetsCaptured;
  let produced = stats.shipsProduced;
  let screenShake = Math.max(0, state.screenShake - sdt * 15);

  const shipsByPlanet: Record<string, Ship[]> = {}; // for orbiting ships
  const grid: Record<string, Ship[]> = {}; // for spatial hashing

  // Populate grid for collision/flocking
  ships.forEach(s => {
    if (s.vx === 99999) return;
    const key = getCell(s.x, s.y);
    if (!grid[key]) grid[key] = [];
    grid[key].push(s);
  });

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

  // 1. Planet production & turrets
  nextPlanets.forEach(planet => {
    planet.pulsePhase += sdt * 2;

    if (planet.owner !== 'neutral' && planet.type !== 'turret' && planet.type !== 'portal') {
      const isMothership = planet.type === 'mothership';
      const prodMult = isMothership ? 2.5 : 1;
      
      const shipAdd = planet.productionRate * prodMult * sdt;
      const factionTotal = factionTotals[planet.owner] || 0;
      if (factionTotal < 700) {
        const oldShips = planet.ships;
        planet.ships += shipAdd;
        produced += Math.floor(planet.ships) - Math.floor(oldShips);
        factionTotals[planet.owner] += shipAdd; // prevent overshooting in same frame
      }
    }

    if (planet.type === 'turret' && planet.owner !== 'neutral') {
      planet.turretCooldown = (planet.turretCooldown || 0) - sdt;
      const range = planet.turretRange || 200;

      // Find enemies
      const enemiesNear = ships.filter(s => {
        if (s.vx === 99999 || s.faction === planet.owner) return false;
        const dx = s.x - planet.x;
        const dy = s.y - planet.y;
        return (dx * dx + dy * dy) <= range * range;
      });

      if (enemiesNear.length > 0) {
        planet.inCombat = true;
        // Lock onto closest
        enemiesNear.sort((a, b) => {
          const d1 = (a.x - planet.x)**2 + (a.y - planet.y)**2;
          const d2 = (b.x - planet.x)**2 + (b.y - planet.y)**2;
          return d1 - d2;
        });
        const target = enemiesNear[0];
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
              life: 1.0, maxLife: 1.0
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
        // Separation logic using spatial grid (only check same cell and adjacent)
        let sepX = 0, sepY = 0;
        let count = 0;
        
        const cx = Math.floor(ship.x / CELL_SIZE);
        const cy = Math.floor(ship.y / CELL_SIZE);
        for(let i=-1; i<=1; i++) {
          for(let j=-1; j<=1; j++) {
            const key = `${cx+i},${cy+j}`;
            if (grid[key]) {
              grid[key].forEach(other => {
                 if (other.id !== ship.id && other.state === 'transit' && other.faction === ship.faction && other.targetPlanetId === ship.targetPlanetId) {
                    const odx = ship.x - other.x;
                    const ody = ship.y - other.y;
                    const odistSq = odx*odx + ody*ody;
                    if (odistSq < 150 && odistSq > 0.1) { // 12 px approx
                       const odist = Math.sqrt(odistSq);
                       sepX += (odx / odist) * (15 - odist); // weight by closeness
                       sepY += (ody / odist) * (15 - odist);
                       count++;
                    }
                 }
              });
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
  lasers.forEach(l => {
     l.life -= sdt;
     if (l.life <= 0) return;
     
     // Homing logic for lasers to ensure they hit moving ships
     let lvx = l.vx;
     let lvy = l.vy;
     let hit = false;
     
     if (l.targetId) {
        const targetShip = nextShips.find(s => s.id === l.targetId);
        if (targetShip && targetShip.vx !== 99999) {
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
     
     // Faction groupings
     const factions = [...new Set(orbiters.map(s => s.faction))];
     if (factions.length > 1 || (factions.length > 0 && factions[0] !== planet.owner)) {
        planet.inCombat = true;
     }

     orbiters.forEach(ship => {
        if (ship.vx === 99999) return;
        if ((ship.cooldown || 0) <= 0) {
           // Find target
           let enemy = orbiters.find(o => o.faction !== ship.faction && o.vx !== 99999);
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
                 life: 0.8, maxLife: 0.8
              });
              sound.playLaser();
           }
        }
     });


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

          // 1. If owned and friendly orbiters, land them
          if (planet.owner !== 'neutral') {
             const friendlies = orbiters.filter(s => s.faction === planet.owner && s.vx !== 99999);
             if (friendlies.length > 0) {
                friendlies[0].vx = 99999; // mark for deletion
                destroyed--; // refund the casualty stat
                planet.ships++;
                absorbed = true;
                
                // Landing sparks (visual feedback for absorption)
                for(let k=0; k<2; k++) {
                   nextSparks.push({
                      x: planet.x, y: planet.y,
                      vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40,
                      color: 'rgba(255, 255, 255, 0.8)',
                      life: 0.2, maxLife: 0.2, size: 1.5
                   });
                }
             }
          }

          // 2. Kamikaze enemies into garrison (1-for-1 trade)
          if (!absorbed && planet.ships > 0) {
             const enemies = orbiters.filter(s => s.faction !== planet.owner && s.vx !== 99999);
             if (enemies.length > 0) {
                enemies[0].vx = 99999; // kamikaze (casualty stat stays intact)
                planet.ships = Math.max(0, planet.ships - 1);
                absorbed = true;
                
                // Kamikaze sparks
                for(let k=0; k<3; k++) {
                   nextSparks.push({
                      x: planet.x, y: planet.y,
                      vx: (Math.random()-0.5)*80, vy: (Math.random()-0.5)*80,
                      color: FACTIONS[enemies[0].faction].color,
                      life: 0.3, maxLife: 0.3, size: 2
                   });
                }
             }
          }

          if (!absorbed) break; // Nothing left to absorb
       }
    }

    const enemyFactions = [...new Set(orbiters.map(s => s.faction).filter(f => f !== planet.owner))];
    if (planet.ships <= 0 && enemyFactions.length > 0) {
       // Only allow capture if only one enemy faction is present, or one is clearly dominating (simplified: must be 1)
       if (enemyFactions.length === 1) {
           const capturingF = enemyFactions[0];
           if (planet.capturingFaction !== capturingF) {
              planet.capturingFaction = capturingF;
              planet.captureProgress = 0;
              if (planet.owner !== 'neutral') {
                 planet.owner = 'neutral';
              }
           }
           
           const capOrbiters = orbiters.filter(s => s.faction === capturingF && s.vx !== 99999);
           if (capOrbiters.length > 0) {
              const capSpeed = capOrbiters.length * 0.05 * sdt;
              planet.captureProgress += capSpeed;
              if (planet.captureProgress >= 1) {
                 planet.owner = capturingF;
                 planet.capturingFaction = null;
                 planet.captureProgress = 0;
                 captured++;
                 sound.playCapture();
                 screenShake = Math.min(screenShake + 4, 15);
                 for(let i=0; i<20; i++) {
                     const a = Math.random() * Math.PI*2;
                     const sp = 40 + Math.random() * 60;
                     nextSparks.push({
                        x: planet.x, y: planet.y,
                        vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
                        color: FACTIONS[planet.owner].color,
                        life: 0.6, maxLife: 0.6, size: 2.5
                     });
                 }
                 
                 // WARP ALL SHIPS IMMEDIATELY AFTER CAPTURE
                 if (planet.type === 'portal' && planet.portalTargetId) {
                    const destPortal = nextPlanets.find(p => p.id === planet.portalTargetId);
                    if (destPortal) {
                       const capOrbiters = orbiters.filter(s => s.faction === capturingF && s.vx !== 99999);
                       capOrbiters.forEach(s => {
                          s.x = destPortal.x;
                          s.y = destPortal.y;
                          s.targetPlanetId = destPortal.id;
                          s.orbitRadius = destPortal.radius + 15 + Math.random() * 15;
                          s.orbitAngle = Math.random() * Math.PI * 2;
                          
                          for(let i=0; i<3; i++) {
                             nextSparks.push({
                                x: destPortal.x, y: destPortal.y,
                                vx: (Math.random()-0.5)*150, vy: (Math.random()-0.5)*150,
                                color: '#00ffff', life: 0.4, maxLife: 0.4, size: 3
                             });
                          }
                       });
                       
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
           // Contested: progress decays
           planet.captureProgress = Math.max(0, planet.captureProgress - sdt * 0.1);
           if (planet.captureProgress === 0) planet.capturingFaction = null;
       }
    } else {
       // Decay capture progress if no capturing ships or defenders respawned
       planet.captureProgress = Math.max(0, planet.captureProgress - sdt * 0.1);
       if (planet.captureProgress === 0) planet.capturingFaction = null;
    }
  });

  // Update Sparks
  const allSparks = sparks.concat(nextSparks).filter(sp => {
    sp.life -= sdt;
    if (sp.life > 0) {
      sp.x += sp.vx * sdt;
      sp.y += sp.vy * sdt;
      sp.vx *= 0.9;
      sp.vy *= 0.9;
      return true;
    }
    return false;
  });

  return {
    planets: nextPlanets,
    ships: nextShips.filter(s => s.vx !== 99999),
    sparks: allSparks,
    lasers: nextLasers,
    screenShake,
    stats: {
      ...stats,
      shipsProduced: produced,
      shipsDestroyed: destroyed,
      planetsCaptured: captured
    }
  };
}

export function launchFleets(
  sourcePlanetIds: string[],
  targetPlanetId: string,
  state: PhysicsEngineState,
  sendRatio: number
): PhysicsEngineState {
  const target = state.planets.find(p => p.id === targetPlanetId);
  if (!target) return state;

  const nextPlanets = state.planets.map(p => ({ ...p }));
  const newShips: Ship[] = [...state.ships];
  let totalLaunched = 0;

  sourcePlanetIds.forEach(sourceId => {
    const source = nextPlanets.find(p => p.id === sourceId);
    if (!source || source.id === targetPlanetId || source.ships < 1) return;

    const countToLaunch = Math.max(1, Math.floor(source.ships * sendRatio));
    source.ships -= countToLaunch;
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
        faction: source.owner,
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
    ships: newShips
  };
}

export function runAIDecisions(state: PhysicsEngineState, _sendRatio: number): PhysicsEngineState {
  const aiFactions: FactionId[] = ['ai1', 'ai2', 'ai3', 'ai4'];
  let updatedState = { ...state };

  aiFactions.forEach(aiFaction => {
    const aiPlanets = updatedState.planets.filter(p => p.owner === aiFaction);
    if (aiPlanets.length === 0) return;

    const totalShips = aiPlanets.reduce((sum, p) => sum + p.ships, 0);
    if (totalShips < 5) return;

    // Aggressive AI: attack with any planet that has advantage
    aiPlanets.forEach(source => {
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
        updatedState = launchFleets([source.id], bt.id, updatedState, ratio);
      }
    });

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
          updatedState = launchFleets([back.id], closest.id, updatedState, 0.5);
        }
      });
    }
  });

  return updatedState;
}
