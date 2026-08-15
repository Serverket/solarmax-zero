# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-13 (Project Rename: Solarmax Zero)
### Added
- **True Projectile Lasers**: Lasers now travel with real velocity and hit detection, featuring homing capabilities.
- **Planetary Garrison Defense**: Garrisoned ships actively fire defensive planetary lasers at orbiting enemies in a 1-to-1 ratio.
- **O(N) Spatial Hashing**: Implemented a scalable flocking algorithm that supports thousands of ships without performance degradation.
- **Visual Galaxy Map**: Redesigned Campaign tab with dynamic SVG minimaps, constellation styling, and slider interactions.
- **Interactive Audio System**: Integrated HTML5 Audio Engine and WebAudio Sound Engine.
- **Stellardrone OST**: Included full ambient soundtrack by Stellardrone (CC-BY-3.0) with "Now Playing" HUD overlay.
- **Smooth Orbit Interpolation**: Ships slide elegantly into orbit parameters instead of snapping to coordinates.
- **Dynamic Capture Decay**: Contested planets now gradually decay capture progress rather than instantly resetting.
- **Glassmorphism UI**: Added Sci-Fi premium UI treatments with `glow-cyan` text and frosted glass panels.
- **Screen Shake**: Added camera shake on impacts, destructions, and planet captures.

### Changed
- Project name transitioned to **Solarmax Zero**.
- Restructured AI to prioritize neutral planets, player threats, and backline reinforcement.
- Render loop optimized with HTML5 Canvas contextual state management.
- Ships render as directional vector triangles indicating momentum.

## [0.1.0] - Previous Iteration
- Initial game prototype using simple distance-based destruction.
- Dots for ships, basic lines for layout.
