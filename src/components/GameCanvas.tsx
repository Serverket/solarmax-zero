import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Planet, Ship, Spark, Laser, FactionId } from '../types/game';
import { FACTIONS } from '../utils/levels';
import { sound } from '../utils/sound';

interface GameCanvasProps {
  planets: Planet[];
  ships: Ship[];
  sparks: Spark[];
  lasers: Laser[];
  screenShake: number;
  selectedPlanetIds: string[];
  onSelectPlanets: (ids: string[]) => void;
  onLaunchFleets: (sourceIds: string[], targetId: string) => void;
  isEditorMode?: boolean;
  onEditorClick?: (planetId: string | null, x: number, y: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  planets,
  ships,
  sparks,
  lasers,
  screenShake,
  selectedPlanetIds,
  onSelectPlanets,
  onLaunchFleets,
  isEditorMode = false,
  onEditorClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPlanetId, setHoveredPlanetId] = useState<string | null>(null);
  const [snappedPlanetId, setSnappedPlanetId] = useState<string | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false);

  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number; tw: number }[]>([]);
  const shipSpritesRef = useRef<Record<string, HTMLCanvasElement>>({});
  const planetTexturesRef = useRef<Record<string, HTMLCanvasElement>>({});

  useEffect(() => {
    // Generate ship sprites
    const factions: FactionId[] = ['player', 'ai1', 'ai2', 'ai3', 'ai4', 'neutral'];
    const sprites: Record<string, HTMLCanvasElement> = {};
    
    factions.forEach(f => {
       const c = document.createElement('canvas');
       c.width = 40;
       c.height = 40;
       const ctx = c.getContext('2d');
       if (ctx) {
          ctx.translate(20, 20); // center
          ctx.fillStyle = FACTIONS[f].color;
          ctx.beginPath();
          if (f === 'player') {
            ctx.moveTo(8, 0); ctx.lineTo(-2, 4); ctx.lineTo(-2, 2); ctx.lineTo(-5, 3);
            ctx.lineTo(-3, 0); ctx.lineTo(-5, -3); ctx.lineTo(-2, -2); ctx.lineTo(-2, -4);
          } else if (f === 'ai1') {
            ctx.moveTo(6, 4); ctx.lineTo(1, 1); ctx.lineTo(3, 0); ctx.lineTo(1, -1);
            ctx.lineTo(6, -4); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5);
          } else if (f === 'ai2') {
            ctx.moveTo(6, 0); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.lineTo(-5, 2);
            ctx.lineTo(-4, 0); ctx.lineTo(-5, -2); ctx.lineTo(-3, -4); ctx.lineTo(3, -4);
          } else {
            ctx.moveTo(5, 0); ctx.lineTo(2, 1.5); ctx.lineTo(0, 5); ctx.lineTo(-2, 1.5);
            ctx.lineTo(-5, 0); ctx.lineTo(-2, -1.5); ctx.lineTo(0, -5); ctx.lineTo(2, -1.5);
          }
          ctx.closePath();
          ctx.fill();
          
          // Metallic overlay for ships
          ctx.globalCompositeOperation = 'source-atop';
          for (let i = 0; i < 40; i++) {
             for (let j = 0; j < 40; j++) {
                if (Math.random() > 0.6) {
                   ctx.fillStyle = `rgba(255,255,255,0.15)`;
                   ctx.fillRect(i - 20, j - 20, 1, 1);
                }
             }
          }
          ctx.globalCompositeOperation = 'source-over';

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.stroke();
       }
       sprites[f] = c;
    });
    shipSpritesRef.current = sprites;

    // Procedural Planet Texture (Seamless, no equator lines)
    const procCanvas = document.createElement('canvas');
    procCanvas.width = 512;
    procCanvas.height = 512;
    const pCtx = procCanvas.getContext('2d');
    if (pCtx) {
       pCtx.fillStyle = '#999999';
       pCtx.fillRect(0, 0, 512, 512);
       // Add smooth craters/noise
       for(let i=0; i<3000; i++) {
          pCtx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.08})`;
          pCtx.beginPath();
          pCtx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 8, 0, Math.PI * 2);
          pCtx.fill();
       }
       for(let i=0; i<1500; i++) {
          pCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
          pCtx.beginPath();
          pCtx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 5, 0, Math.PI * 2);
          pCtx.fill();
       }
    }
    
    const loadedImages: Record<string, HTMLCanvasElement> = {
       small: procCanvas,
       medium: procCanvas,
       large: procCanvas
    };
    planetTexturesRef.current = loadedImages;

    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        tw: Math.random() * 2 + 0.5,
      });
    }
    starsRef.current = stars;
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      const touch = e.touches.length > 0 ? e.touches[0] : e.changedTouches[0];
      if (touch) {
        clientX = touch.clientX;
        clientY = touch.clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    // Calculate true scale ignoring CSS object-contain letterboxing
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    
    const visualWidth = canvas.width * scale;
    const visualHeight = canvas.height * scale;
    
    const offsetX = (rect.width - visualWidth) / 2;
    const offsetY = (rect.height - visualHeight) / 2;
    
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }, []);

  const getPlanetAt = useCallback((x: number, y: number, pad = 12): Planet | null => {
    let closest: Planet | null = null;
    let minD = Infinity;
    planets.forEach(p => {
      const dist = Math.hypot(p.x - x, p.y - y);
      // Generous minimum margin for easy tapping on small screens/planets
      if (dist <= Math.max(25, p.radius + pad) && dist < minD) {
        minD = dist;
        closest = p;
      }
    });
    return closest;
  }, [planets]);

  const getClosestSnapPlanet = useCallback((x: number, y: number, edgeSnapDist = 50): Planet | null => {
    let closest: Planet | null = null;
    let minEdgeDist = edgeSnapDist;
    planets.forEach(p => {
      const dist = Math.hypot(p.x - x, p.y - y);
      const edgeDist = Math.max(0, dist - p.radius);
      if (edgeDist < minEdgeDist) {
        minEdgeDist = edgeDist;
        closest = p;
      }
    });
    return closest;
  }, [planets]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);
    const clickedPlanet = getPlanetAt(coords.x, coords.y, 8);

    if (isEditorMode && onEditorClick) {
      onEditorClick(clickedPlanet ? clickedPlanet.id : null, coords.x, coords.y);
      return;
    }

    setDragStart(coords);
    setDragCurrent(coords);

    if (clickedPlanet) {
      if (clickedPlanet.owner === 'player') {
        sound.playSelect();
        if (e.shiftKey) {
          if (selectedPlanetIds.includes(clickedPlanet.id)) {
            onSelectPlanets(selectedPlanetIds.filter(id => id !== clickedPlanet.id));
          } else {
            onSelectPlanets([...selectedPlanetIds, clickedPlanet.id]);
          }
        } else {
          if (!selectedPlanetIds.includes(clickedPlanet.id)) {
            onSelectPlanets([clickedPlanet.id]);
          }
        }
        setIsBoxSelecting(false);
      } else {
        if (selectedPlanetIds.length > 0) {
          onLaunchFleets(selectedPlanetIds, clickedPlanet.id);
        } else {
          onSelectPlanets([]);
        }
        setIsBoxSelecting(false);
      }
    } else {
      setIsBoxSelecting(true);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isEditorMode) return;
    const coords = getCanvasCoords(e);
    setDragCurrent(coords);

    const hovered = getPlanetAt(coords.x, coords.y, 8);
    setHoveredPlanetId(hovered ? hovered.id : null);

    if (selectedPlanetIds.length > 0) {
      const snapped = getClosestSnapPlanet(coords.x, coords.y);
      setSnappedPlanetId(snapped ? snapped.id : null);
    } else {
      setSnappedPlanetId(null);
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (isEditorMode) return;
    if (!dragStart || !dragCurrent) return;

    const endCoords = getCanvasCoords(e);
    const candidateTarget = getClosestSnapPlanet(endCoords.x, endCoords.y) || getPlanetAt(endCoords.x, endCoords.y, 8);

    if (isBoxSelecting && dragStart) {
      const minX = Math.min(dragStart.x, endCoords.x);
      const maxX = Math.max(dragStart.x, endCoords.x);
      const minY = Math.min(dragStart.y, endCoords.y);
      const maxY = Math.max(dragStart.y, endCoords.y);
      const isDrag = Math.abs(endCoords.x - dragStart.x) > 10 || Math.abs(endCoords.y - dragStart.y) > 10;

      if (isDrag) {
        const selected = planets
          .filter(p => {
             if (p.owner !== 'player') return false;
             const px = Math.max(minX, Math.min(p.x, maxX));
             const py = Math.max(minY, Math.min(p.y, maxY));
             return Math.hypot(p.x - px, p.y - py) <= p.radius;
          })
          .map(p => p.id);
        onSelectPlanets(selected);
      } else {
        onSelectPlanets([]);
      }
    } else if (selectedPlanetIds.length > 0 && candidateTarget) {
      // Prevent launching fleets from a planet to itself if it's the only one selected
      if (!(selectedPlanetIds.length === 1 && selectedPlanetIds[0] === candidateTarget.id)) {
        onLaunchFleets(selectedPlanetIds, candidateTarget.id);
      }
    }

    setDragStart(null);
    setDragCurrent(null);
    setSnappedPlanetId(null);
    setIsBoxSelecting(false);
  };

  const handleDoubleClick = () => {
    const playerPlanetIds = planets.filter(p => p.owner === 'player').map(p => p.id);
    onSelectPlanets(playerPlanetIds);
    sound.playSelect();
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const t = Date.now() * 0.001;

      ctx.save();

      // Screen shake
      if (screenShake > 0) {
        const sx = (Math.random() - 0.5) * screenShake * 2;
        const sy = (Math.random() - 0.5) * screenShake * 2;
        ctx.translate(sx, sy);
      }

      // Background - clean dark space
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(-20, -20, width + 40, height + 40);

      // Subtle radial gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, 'rgba(15, 18, 35, 0.6)');
      bgGrad.addColorStop(1, 'rgba(5, 5, 12, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-20, -20, width + 40, height + 40);

      // Stars
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach(star => {
        ctx.globalAlpha = star.alpha * (0.5 + 0.5 * Math.sin(t * star.tw));
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Portal connections
      planets.forEach(p => {
        if (p.type === 'portal' && p.portalTargetId) {
          const tp = planets.find(x => x.id === p.portalTargetId);
          if (tp) {
            ctx.save();
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = -t * 30;
            ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(tp.x, tp.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      });

      // Planets
      planets.forEach(planet => {
        const faction = FACTIONS[planet.owner];
        const isSelected = selectedPlanetIds.includes(planet.id);
        const isHovered = hoveredPlanetId === planet.id;
        const isSnapped = snappedPlanetId === planet.id;

        // PRE-CALCULATE 3D ORBITERS
        const orbiters: any[] = [];
        if (planet.owner !== 'neutral' || planet.ships > 0) {
           const garrisonCount = Math.min(150, Math.floor(planet.ships));
           if (garrisonCount > 0) {
              // 3D Elliptical radii (Jupiter Belt style)
              const baseRx = planet.radius * 1.8; // Very wide horizontally
              const baseRy = planet.radius * 0.15; // Highly squashed vertically
              // Clear tilt so the ring angle is obvious
              const tilt = Math.PI * 0.12; // ~21 degrees
              
              for (let i = 0; i < garrisonCount; i++) {
                 const angleOffset = i * 2.39996;
                 const orbitSpeed = (1.5 - (i % 3) * 0.2) * 0.6;
                 const direction = (i % 2 === 0) ? 1 : -1;
                 const angle = angleOffset + t * orbitSpeed * direction;
                 
                 // Belt thickness (spreads ships radially to form a thick planetary ring)
                 const ringWidth = planet.radius * 0.7; // Very thick belt
                 const beltOffset = ((i * 13) % ringWidth) - (ringWidth / 2); 
                 
                 const rx = baseRx + beltOffset;
                 const ry = baseRy + (beltOffset * 0.15); // Keeps the Y-axis squashed
                 
                 const rawX = Math.cos(angle) * rx;
                 const rawY = Math.sin(angle) * ry;
                 
                 // Apply tilt
                 const rotatedX = rawX * Math.cos(tilt) - rawY * Math.sin(tilt);
                 const rotatedY = rawX * Math.sin(tilt) + rawY * Math.cos(tilt);
                 
                 const sx = planet.x + rotatedX;
                 const sy = planet.y + rotatedY;
                 const z = Math.sin(angle); // Z depth
                 
                 // Tangent angle for ship rotation
                 const dx = -Math.sin(angle) * rx * direction;
                 const dy = Math.cos(angle) * ry * direction;
                 const shipAngle = Math.atan2(dy, dx) + tilt;
                 
                 orbiters.push({ sx, sy, z, shipAngle, scale: 0.8 + z * 0.2, alpha: 0.7 + z * 0.3 });
              }
              // Sort by depth
              orbiters.sort((a, b) => a.z - b.z);
           }
        }
        
        const backOrbiters = orbiters.filter(o => o.z < 0);
        const frontOrbiters = orbiters.filter(o => o.z >= 0);
        const shipCnv = shipSpritesRef.current[planet.owner];

        // 1. Draw BACK orbiters (behind the planet)
        if (shipCnv && backOrbiters.length > 0) {
           backOrbiters.forEach(orb => {
              ctx.save();
              ctx.translate(orb.sx, orb.sy);
              ctx.rotate(orb.shipAngle);
              ctx.scale(orb.scale, orb.scale);
              ctx.globalAlpha = orb.alpha * 0.5; // Dimmer in the back shadow
              ctx.drawImage(shipCnv, -10, -10, 20, 20);
              ctx.restore();
           });
        }

        // Base glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = faction.color;
        
        // Planet body
        const grad = ctx.createRadialGradient(
          planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, planet.radius * 0.1,
          planet.x, planet.y, planet.radius
        );
        grad.addColorStop(0, faction.color);
        grad.addColorStop(0.7, faction.color);
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');

        ctx.fillStyle = grad;
        if (planet.type === 'mothership') {
          // Epic Scary Mothership Design V2 - "The Abyssal Engine"
          
          // 1. Black Hole / Event Horizon Aura
          ctx.save();
          const aura = ctx.createRadialGradient(planet.x, planet.y, planet.radius * 0.4, planet.x, planet.y, planet.radius * 2.2);
          aura.addColorStop(0, '#000000');
          aura.addColorStop(0.3, faction.color);
          aura.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 2. The Abyssal Core (Vantablack void)
          ctx.fillStyle = '#050505';
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius * 0.85, 0, Math.PI * 2);
          ctx.fill();
          
          // 3. Fractured Energy Crust (Procedural jagged polygons)
          ctx.fillStyle = '#111111';
          ctx.strokeStyle = faction.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 12; i++) {
             const angle = (i * Math.PI) / 6 - t * 0.1;
             const r = planet.radius * (0.6 + 0.25 * Math.abs(Math.sin(i * 3 + t * 2)));
             const px = planet.x + Math.cos(angle) * r;
             const py = planet.y + Math.sin(angle) * r;
             if (i === 0) ctx.moveTo(px, py);
             else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 4. Counter-rotating Saw Blades
          ctx.strokeStyle = faction.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 24; i++) {
             const angle = (i * Math.PI) / 12 + t * 1.2;
             const rOuter = planet.radius * 1.15;
             const rInner = planet.radius * 0.95;
             const px1 = planet.x + Math.cos(angle) * rInner;
             const py1 = planet.y + Math.sin(angle) * rInner;
             const px2 = planet.x + Math.cos(angle + 0.1) * rOuter;
             const py2 = planet.y + Math.sin(angle + 0.1) * rOuter;
             ctx.moveTo(px1, py1);
             ctx.lineTo(px2, py2);
          }
          ctx.stroke();

          // 5. The All-Seeing Eye (Pulsing intensely)
          const eyePulse = 0.8 + 0.2 * Math.sin(t * 15);
          ctx.fillStyle = faction.color;
          ctx.shadowColor = faction.color;
          ctx.shadowBlur = 15 * eyePulse;
          ctx.beginPath();
          ctx.ellipse(planet.x, planet.y, planet.radius * 0.15 * eyePulse, planet.radius * 0.35 * eyePulse, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
          
          // 6. Orbital Energy Halos
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 5);
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius * 1.5, t * 2 + (i * Math.PI * 2 / 3), t * 2 + (i * Math.PI * 2 / 3) + Math.PI / 3);
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
        } else {
          // Standard planet, Turret, or Portal bodies
          let pt = 'small';
          if (planet.radius >= 20 && planet.radius < 35) pt = 'medium';
          if (planet.radius >= 35) pt = 'large';
          
          const tex = planetTexturesRef.current[pt];
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
          ctx.clip(); // Clip to the planet radius
          
             if (tex) {
             // Draw the procedural texture
             ctx.drawImage(
                tex, 
                0, 0, 512, 512, 
                planet.x - planet.radius, planet.y - planet.radius, planet.radius * 2, planet.radius * 2
             );
             
             // Tint faction color foolproof method
             ctx.globalCompositeOperation = 'source-atop';
             ctx.globalAlpha = 0.55;
             ctx.fillStyle = faction.color;
             ctx.fillRect(planet.x - planet.radius, planet.y - planet.radius, planet.radius * 2, planet.radius * 2);
             ctx.globalAlpha = 1.0;
             
             // 3D Inner Shadow (Lighting depth)
             ctx.globalCompositeOperation = 'source-atop';
             const shadowGrad = ctx.createRadialGradient(
               planet.x - planet.radius * 0.4, 
               planet.y - planet.radius * 0.4, 
               0, 
               planet.x, 
               planet.y, 
               planet.radius
             );
             shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
             shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
             shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
             
             ctx.fillStyle = shadowGrad;
             ctx.fillRect(planet.x - planet.radius, planet.y - planet.radius, planet.radius * 2, planet.radius * 2);
             
             ctx.globalCompositeOperation = 'source-over';
          } else {
             // Fallback
             ctx.fillStyle = grad;
             ctx.fill();
          }
          ctx.restore();
          
          // Outer stroke
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.shadowBlur = 0; // reset

        // Turret drawing
        if (planet.type === 'turret') {
          // Turret base ring
          ctx.strokeStyle = faction.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          
          // Turret articulated cannon
          if (planet.owner !== 'neutral' && planet.turretAngle !== undefined) {
             ctx.save();
             ctx.translate(planet.x, planet.y);
             ctx.rotate(planet.turretAngle);
             
             // Base mount
             ctx.fillStyle = '#ffffff';
             ctx.beginPath();
             ctx.arc(planet.radius - 2, 0, 4, 0, Math.PI * 2);
             ctx.fill();

             // Long barrel
             ctx.fillStyle = faction.color;
             ctx.fillRect(planet.radius - 2, -2, 16, 4);
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(planet.radius + 12, -3, 4, 6);

             // Laser sight line
             if (planet.targetLockId) {
               ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + 0.3 * Math.sin(t * 20)})`;
               ctx.lineWidth = 1;
               ctx.beginPath();
               ctx.moveTo(planet.radius + 16, 0);
               ctx.lineTo(200, 0);
               ctx.stroke();
             }

             ctx.restore();
          }

          // Lock on bracket on target
          if (planet.targetLockId) {
             const target = ships.find(s => s.id === planet.targetLockId);
             if (target) {
                ctx.save();
                ctx.translate(target.x, target.y);
                const sPulse = 0.5 + 0.5 * Math.sin(t * 15);
                ctx.scale(1 + sPulse * 0.2, 1 + sPulse * 0.2);
                ctx.strokeStyle = faction.color;
                ctx.lineWidth = 1.5;
                const bs = 8;
                // draw 4 corners
                ctx.beginPath();
                ctx.moveTo(-bs, -bs + 4); ctx.lineTo(-bs, -bs); ctx.lineTo(-bs + 4, -bs);
                ctx.moveTo(bs, -bs + 4); ctx.lineTo(bs, -bs); ctx.lineTo(bs - 4, -bs);
                ctx.moveTo(-bs, bs - 4); ctx.lineTo(-bs, bs); ctx.lineTo(-bs + 4, bs);
                ctx.moveTo(bs, bs - 4); ctx.lineTo(bs, bs); ctx.lineTo(bs - 4, bs);
                ctx.stroke();
                ctx.restore();
             }
          }

          ctx.globalAlpha = 1.0;

          // Range circle
          if (planet.owner !== 'neutral') {
            ctx.strokeStyle = faction.color;
            ctx.globalAlpha = 0.08;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.turretRange || 200, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }

        // Portal singularity
        if (planet.type === 'portal') {
          ctx.save();
          ctx.translate(planet.x, planet.y);
          
          // Event Horizon
          ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, planet.radius + 4, t * 2, t * 2 + Math.PI * 1.5);
          ctx.stroke();

          // Swirling singularity
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
             ctx.beginPath();
             const rAngle = t * 3 + (i * Math.PI / 2);
             const sx = Math.cos(rAngle) * (planet.radius * 0.5);
             const sy = Math.sin(rAngle) * (planet.radius * 0.5);
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(Math.cos(rAngle + 1) * planet.radius, Math.sin(rAngle + 1) * planet.radius, sx, sy);
             ctx.stroke();
          }
          ctx.restore();
        }

        // Capture progress bar
        if (planet.captureProgress > 0 && planet.capturingFaction) {
          const capFaction = FACTIONS[planet.capturingFaction];
          ctx.strokeStyle = capFaction.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(
            planet.x, planet.y, planet.radius + 8,
            -Math.PI / 2, -Math.PI / 2 + planet.captureProgress * Math.PI * 2
          );
          ctx.stroke();
        }

        // Combat indicator
        if (planet.inCombat) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 10);
          ctx.strokeStyle = `rgba(255, 100, 100, ${0.4 + pulse * 0.4})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius + 12 + pulse * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -t * 20;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Hover ring
        if (isHovered && !isSelected) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Snap indicator
        if (isSnapped) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius + 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw FRONT orbiting garrison ships
        if (shipCnv && frontOrbiters.length > 0) {
           frontOrbiters.forEach(orb => {
              ctx.save();
              ctx.translate(orb.sx, orb.sy);
              ctx.rotate(orb.shipAngle);
              ctx.scale(orb.scale, orb.scale);
              ctx.globalAlpha = orb.alpha;
              ctx.drawImage(shipCnv, -10, -10, 20, 20);
              ctx.restore();
           });
        }

        // Ship count number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // tiny drop shadow for text
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(Math.floor(planet.ships).toString(), planet.x, planet.y);
        ctx.shadowBlur = 0;
      });

      // Ships (Triangles)
      ships.forEach(ship => {
        const sprite = shipSpritesRef.current[ship.faction];
        if (!sprite) return;
        
        let angle = 0;
        if (ship.state === 'transit' || ship.state === 'orbit') {
           angle = Math.atan2(ship.vy, ship.vx);
        }

        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(angle);
        
        ctx.drawImage(sprite, -20, -20);
        
        // engine glow
        if (ship.state === 'transit') {
           ctx.fillStyle = '#ffffff';
           ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 30);
           ctx.beginPath();
           // we are still translated and rotated here, so -4, 0 is the back of the ship
           ctx.arc(-4, 0, 1.5, 0, Math.PI * 2);
           ctx.fill();
        }
        
        ctx.restore();
      });
      
      // Lasers
      lasers.forEach(l => {
         const alpha = l.life / l.maxLife;
         ctx.save();
         ctx.strokeStyle = l.color;
         ctx.lineWidth = 2;
         ctx.globalAlpha = alpha;
         ctx.shadowColor = l.color;
         ctx.shadowBlur = 8;
         ctx.beginPath();
         const speed = Math.sqrt(l.vx*l.vx + l.vy*l.vy) || 1;
         const len = 12;
         const dx = (l.vx / speed) * len;
         const dy = (l.vy / speed) * len;
         ctx.moveTo(l.x - dx, l.y - dy);
         ctx.lineTo(l.x + dx, l.y + dy);
         ctx.stroke();
         
         // core
         ctx.strokeStyle = '#ffffff';
         ctx.lineWidth = 1;
         ctx.stroke();
         ctx.restore();
      });

      // Sparks
      sparks.forEach(sp => {
        const alpha = sp.life / sp.maxLife;
        ctx.globalAlpha = alpha;
        
        if (sp.type === 'shockwave') {
           ctx.strokeStyle = sp.color;
           ctx.lineWidth = 4 * alpha;
           ctx.shadowColor = sp.color;
           ctx.shadowBlur = 10;
           ctx.beginPath();
           const size = sp.size || 40;
           // expands outward as it ages (alpha goes 1 -> 0, so 1 - alpha goes 0 -> 1)
           ctx.arc(sp.x, sp.y, size * (1 - alpha), 0, Math.PI * 2);
           ctx.stroke();
        } else {
           ctx.fillStyle = sp.color;
           ctx.shadowColor = sp.color;
           ctx.shadowBlur = 5;
           ctx.beginPath();
           const size = sp.size || 1.5;
           ctx.arc(sp.x, sp.y, size * alpha + 0.5, 0, Math.PI * 2);
           ctx.fill();
        }
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1.0;

      // Drag line
      if (dragStart && dragCurrent) {
        if (isBoxSelecting) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -t * 10;
          const x = Math.min(dragStart.x, dragCurrent.x);
          const y = Math.min(dragStart.y, dragCurrent.y);
          const w = Math.abs(dragCurrent.x - dragStart.x);
          const h = Math.abs(dragCurrent.y - dragStart.y);
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
          ctx.restore();
        } else if (selectedPlanetIds.length > 0) {
          const snapped = snappedPlanetId ? planets.find(p => p.id === snappedPlanetId) : null;
          const tx = snapped ? snapped.x : dragCurrent.x;
          const ty = snapped ? snapped.y : dragCurrent.y;

          selectedPlanetIds.forEach(sid => {
            const sp = planets.find(p => p.id === sid);
            if (!sp) return;

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = -t * 20;
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            
            // arrow head at end
            const dx = tx - sp.x;
            const dy = ty - sp.y;
            const angle = Math.atan2(dy, dx);
            ctx.translate(tx, ty);
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(0, 0);
            ctx.lineTo(-10, 5);
            ctx.fill();
            
            ctx.restore();
          });
        }
      }

      ctx.restore(); // restore from screen shake
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [planets, ships, sparks, lasers, screenShake, selectedPlanetIds, hoveredPlanetId, snappedPlanetId, dragStart, dragCurrent, isBoxSelecting]);

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={800}
      className="w-full h-full object-contain touch-none cursor-crosshair"
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    />
  );
};
