// LociForceLayout.ts
// Owns: the physics that arranges topics in the room by how their ideas connect. Pure functions,
// no scene access. A port of d3-force's simulation (https://github.com/d3/d3-force, ISC licence,
// Mike Bostock): the same link springs, many-body repulsion, positioning pull and alpha cooling,
// and the same phyllotaxis start. Exact O(n²) repulsion instead of d3's Barnes–Hut quadtree,
// since a palace has at most 8 topics. Ported rather than imported because d3's timer needs a
// browser; here the controller steps it.
//
// Nodes are topics; a link's weight is how many threads join the two topics' thoughts, so
// strongly linked topics end up close and unrelated ones drift apart. The result is every tick's
// positions (to play back as motion) in d3's units (a link rests at ~LINK_DISTANCE apart).

export interface LayoutLink { source: number; target: number; weight: number }

export interface LayoutFrames {
  /** frames[tick][node] = [x, y], d3 units. frames[0] is the start, the last frame is settled. */
  frames: [number, number][][]
  /** Links per node (for depth: hubs sit nearer). */
  degree: number[]
}

export const LINK_DISTANCE = 30
const CHARGE = -120 // many-body strength (negative = repel)
const POSITION_STRENGTH = 0.06 // pull toward the centre, keeps unlinked topics in view
const VELOCITY_DECAY = 0.4
const ALPHA_MIN = 0.001
const TICKS = 300
const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / TICKS) // d3: cools to alphaMin in 300 ticks

/** Topic links from thought threads: one weighted link per pair of topics that share threads. */
export function topicLinks(topicIds: string[], thoughtTopic: Map<string, string>, threads: {from: string; to: string}[]): LayoutLink[] {
  const index = new Map<string, number>()
  topicIds.forEach((id, i) => index.set(id, i))
  const w = new Map<string, LayoutLink>()
  for (const th of threads) {
    const a = index.get(thoughtTopic.get(th.from) ?? "")
    const b = index.get(thoughtTopic.get(th.to) ?? "")
    if (a === undefined || b === undefined || a === b) continue
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const l = w.get(key)
    if (l) l.weight++
    else w.set(key, {source: Math.min(a, b), target: Math.max(a, b), weight: 1})
  }
  return Array.from(w.values())
}

/** Run the simulation to rest and return every tick. Deterministic (no randomness). */
export function simulate(n: number, links: LayoutLink[]): LayoutFrames {
  const x: number[] = [], y: number[] = [], vx: number[] = [], vy: number[] = []
  // d3's start: a phyllotaxis spiral, so the result is the same every run.
  const initAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const r = 10 * Math.sqrt(0.5 + i), a = i * initAngle
    x.push(r * Math.cos(a)); y.push(r * Math.sin(a)); vx.push(0); vy.push(0)
  }
  const degree = new Array(n).fill(0)
  links.forEach((l) => { degree[l.source]++; degree[l.target]++ })
  // d3's default link strength (1/min(degree)) makes single links in a dense palace too weak to
  // pull; instead every link pulls, more with each thread (tuned so distance falls as weight rises).
  // Bias by degree as in d3. Heavier links also rest closer.
  const strength = links.map((l) => Math.min(1, 0.4 + 0.15 * l.weight))
  const restLen = links.map((l) => LINK_DISTANCE / Math.sqrt(l.weight))
  const bias = links.map((l) => degree[l.source] / (degree[l.source] + degree[l.target]))

  const frames: [number, number][][] = [x.map((xi, i) => [xi, y[i]] as [number, number])]
  let alpha = 1
  for (let tick = 0; tick < TICKS; tick++) {
    alpha += (0 - alpha) * ALPHA_DECAY

    links.forEach((l, k) => {
      const s = l.source, t = l.target
      let dx = x[t] + vx[t] - x[s] - vx[s]
      let dy = y[t] + vy[t] - y[s] - vy[s]
      if (dx === 0 && dy === 0) dx = 1e-6 // d3's jiggle, made deterministic
      let len = Math.sqrt(dx * dx + dy * dy)
      len = (len - restLen[k]) / len * alpha * strength[k]
      dx *= len; dy *= len
      vx[t] -= dx * bias[k]; vy[t] -= dy * bias[k]
      vx[s] += dx * (1 - bias[k]); vy[s] += dy * (1 - bias[k])
    })

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        let dx = x[j] - x[i], dy = y[j] - y[i]
        if (dx === 0 && dy === 0) dx = 1e-6 * (j - i)
        let l2 = dx * dx + dy * dy
        if (l2 < 1) l2 = Math.sqrt(l2) // d3: distanceMin² = 1
        const w = CHARGE * alpha / l2
        vx[i] += dx * w; vy[i] += dy * w
      }
      vx[i] += -x[i] * POSITION_STRENGTH * alpha
      vy[i] += -y[i] * POSITION_STRENGTH * alpha
    }

    for (let i = 0; i < n; i++) {
      vx[i] *= 1 - VELOCITY_DECAY; vy[i] *= 1 - VELOCITY_DECAY
      x[i] += vx[i]; y[i] += vy[i]
    }
    frames.push(x.map((xi, i) => [xi, y[i]] as [number, number]))
  }
  return {frames, degree}
}

/**
 * Push points (degrees: [yaw, elevation]) apart until every pair is at least `minDeg` apart,
 * inside the box. Returns new points; the input is untouched.
 */
export function separate(points: [number, number][], minDeg: number, maxYaw: number, minElev: number, maxElev: number): [number, number][] {
  const p = points.map((q) => [q[0], q[1]] as [number, number])
  for (let iter = 0; iter < 200; iter++) {
    let moved = false
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        let dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1]
        let d = Math.sqrt(dx * dx + dy * dy)
        if (d >= minDeg) continue
        if (d < 1e-3) { dx = 1; dy = 0; d = 1 } // same point: split sideways
        const push = (minDeg - d) / 2 + 0.01
        p[i][0] -= dx / d * push; p[i][1] -= dy / d * push
        p[j][0] += dx / d * push; p[j][1] += dy / d * push
        moved = true
      }
    }
    for (const q of p) {
      q[0] = Math.max(-maxYaw, Math.min(maxYaw, q[0]))
      q[1] = Math.max(minElev, Math.min(maxElev, q[1]))
    }
    if (!moved) break
  }
  return p
}
