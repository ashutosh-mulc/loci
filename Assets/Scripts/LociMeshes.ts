// LociMeshes.ts
// Owns: code-authored geometry for Loci (orbs, dots, star shapes, wireframe stand-ins).
// Pure functions that return RenderMesh. No scene access, no state.
// Every mesh is built at its real size in cm; callers never scale to fix size.


class MeshAccumulator {
  positions: number[] = []
  normals: number[] = []
  indices: number[] = []

  vertex(p: vec3, n: vec3): number {
    const index = this.positions.length / 3
    this.positions.push(p.x, p.y, p.z)
    this.normals.push(n.x, n.y, n.z)
    return index
  }

  tri(a: number, b: number, c: number): void {
    this.indices.push(a, b, c)
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.indices.push(a, b, c, a, c, d)
  }

  build(): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3, normalized: true},
      {name: "texture0", components: 2},
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const verts: number[] = []
    const count = this.positions.length / 3
    for (let i = 0; i < count; i++) {
      verts.push(
        this.positions[i * 3], this.positions[i * 3 + 1], this.positions[i * 3 + 2],
        this.normals[i * 3], this.normals[i * 3 + 1], this.normals[i * 3 + 2],
        0, 0,
      )
    }
    mb.appendVerticesInterleaved(verts)
    mb.appendIndices(this.indices)
    mb.updateMesh()
    return mb.getMesh()
  }
}

/** UV sphere centred at the origin. */
export function sphereMesh(radius: number, segments: number = 18, rings: number = 12): RenderMesh {
  const acc = new MeshAccumulator()
  for (let r = 0; r <= rings; r++) {
    const phi = (Math.PI * r) / rings
    for (let s = 0; s <= segments; s++) {
      const theta = (2 * Math.PI * s) / segments
      const n = new vec3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
      acc.vertex(n.uniformScale(radius), n)
    }
  }
  const row = segments + 1
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * row + s
      const b = a + row
      acc.tri(a, a + 1, b)
      acc.tri(a + 1, b + 1, b)
    }
  }
  return acc.build()
}

/** Extrude a closed 2D outline (XY plane) into a prism of the given depth, double-faced. */
function prismFromOutline(acc: MeshAccumulator, outline: vec2[], depth: number): void {
  const half = depth / 2
  const n = outline.length
  // Front (+Z) and back (-Z) fans around the centroid.
  const front = new vec3(0, 0, 1)
  const back = new vec3(0, 0, -1)
  const cf = acc.vertex(new vec3(0, 0, half), front)
  const cb = acc.vertex(new vec3(0, 0, -half), back)
  const fIdx: number[] = []
  const bIdx: number[] = []
  for (const p of outline) {
    fIdx.push(acc.vertex(new vec3(p.x, p.y, half), front))
    bIdx.push(acc.vertex(new vec3(p.x, p.y, -half), back))
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    acc.tri(cf, fIdx[i], fIdx[j])
    acc.tri(cf, fIdx[j], fIdx[i])
    acc.tri(cb, bIdx[j], bIdx[i])
    acc.tri(cb, bIdx[i], bIdx[j])
    // Sides
    const side = new vec3(outline[i].x + outline[j].x, outline[i].y + outline[j].y, 0).normalize()
    const a = acc.vertex(new vec3(outline[i].x, outline[i].y, half), side)
    const b = acc.vertex(new vec3(outline[j].x, outline[j].y, half), side)
    const c = acc.vertex(new vec3(outline[j].x, outline[j].y, -half), side)
    const d = acc.vertex(new vec3(outline[i].x, outline[i].y, -half), side)
    acc.quad(a, b, c, d)
    acc.quad(a, d, c, b)
  }
}

/** Solid five-point star facing +Z. `outerRadius` is half the tip-to-tip size. */
export function starMesh(outerRadius: number, depth: number): RenderMesh {
  const acc = new MeshAccumulator()
  const inner = outerRadius * 0.45
  const outline: vec2[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerRadius : inner
    const a = Math.PI / 2 + (i * Math.PI) / 5
    outline.push(new vec2(Math.cos(a) * r, Math.sin(a) * r))
  }
  prismFromOutline(acc, outline, depth)
  return acc.build()
}

/** Flat ring (annulus) facing +Z, double-faced. */
export function ringMesh(outerRadius: number, innerRadius: number, depth: number, segments: number = 28): RenderMesh {
  const acc = new MeshAccumulator()
  const half = depth / 2
  for (const z of [half, -half]) {
    const n = new vec3(0, 0, z > 0 ? 1 : -1)
    const start = acc.positions.length / 3
    for (let s = 0; s <= segments; s++) {
      const a = (2 * Math.PI * s) / segments
      acc.vertex(new vec3(Math.cos(a) * outerRadius, Math.sin(a) * outerRadius, z), n)
      acc.vertex(new vec3(Math.cos(a) * innerRadius, Math.sin(a) * innerRadius, z), n)
    }
    for (let s = 0; s < segments; s++) {
      const o0 = start + s * 2
      const i0 = o0 + 1
      const o1 = o0 + 2
      const i1 = o0 + 3
      acc.quad(o0, o1, i1, i0)
      acc.quad(o0, i0, i1, o1)
    }
  }
  return acc.build()
}

/** Append a thin square strut between two points. */
function addStrut(acc: MeshAccumulator, a: vec3, b: vec3, thickness: number): void {
  const dir = b.sub(a)
  const len = dir.length
  if (len < 0.0001) return
  const d = dir.uniformScale(1 / len)
  const helper = Math.abs(d.y) < 0.9 ? new vec3(0, 1, 0) : new vec3(1, 0, 0)
  const u = d.cross(helper).normalize().uniformScale(thickness / 2)
  const v = d.cross(u).normalize().uniformScale(thickness / 2)
  const corners = [u.add(v), u.sub(v), u.uniformScale(-1).sub(v), u.uniformScale(-1).add(v)]
  const ia: number[] = []
  const ib: number[] = []
  for (const c of corners) {
    const n = c.normalize()
    ia.push(acc.vertex(a.add(c), n))
    ib.push(acc.vertex(b.add(c), n))
  }
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    acc.quad(ia[i], ia[j], ib[j], ib[i]) // one winding: thread materials are two-sided
  }
}

/** Flat disc in the XY plane facing +Z (counter-clockwise from the front). */
export function discMesh(radius: number, segments: number = 32): RenderMesh {
  const acc = new MeshAccumulator()
  const n = new vec3(0, 0, 1)
  const c = acc.vertex(vec3.zero(), n)
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments
    acc.vertex(new vec3(Math.cos(a) * radius, Math.sin(a) * radius, 0), n)
  }
  for (let i = 0; i < segments; i++) acc.tri(c, 1 + i, 1 + ((i + 1) % segments))
  return acc.build()
}

/** A unit square in the XY plane (side `size`, facing +Z) with UVs, for textured sprites. */
export function spriteMesh(size: number): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3, normalized: true},
    {name: "texture0", components: 2},
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  const h = size / 2
  mb.appendVerticesInterleaved([
    -h, -h, 0, 0, 0, 1, 0, 0,
    h, -h, 0, 0, 0, 1, 1, 0,
    h, h, 0, 0, 0, 1, 1, 1,
    -h, h, 0, 0, 0, 1, 0, 1,
  ])
  mb.appendIndices([0, 1, 2, 0, 2, 3])
  mb.updateMesh()
  return mb.getMesh()
}

/** Thin straight lines (one strut each), e.g. thread lines between stars. */
export function linesMesh(segments: [vec3, vec3][], thickness: number): RenderMesh {
  const acc = new MeshAccumulator()
  for (const s of segments) addStrut(acc, s[0], s[1], thickness)
  return acc.build()
}
