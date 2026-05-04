"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Download, Plus, Minus } from "lucide-react"
import { useRefugio } from "@/src/context/refugio-context"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string
  codigo: string
  nombre: string | null
  sexo: "macho" | "hembra" | "indeterminado" | null
  estado: "vivo" | "fallecido" | "transferido" | "egresado"
  morfotipo: string | null
  estanque: string | null
  unknown?: boolean
}

interface TreeData {
  root: TreeNode
  madre: TreeNode | null
  padre: TreeNode | null
  abuela_m: TreeNode | null
  abuelo_m: TreeNode | null
  abuela_p: TreeNode | null
  abuelo_p: TreeNode | null
  hijos: TreeNode[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NW = 120   // node width
const NH = 64    // node height
const NHW = NW / 2
const NHH = NH / 2

// Generation Y centers (node center)
const GEN_Y = {
  gp: 88,      // grandparents
  p: 248,      // parents
  root: 408,   // root individual
  child: 540,  // children
}

// X positions: canvas logical width ~900, center ~430
const X = {
  abuela_m: 80,
  abuelo_m: 250,
  abuela_p: 490,
  abuelo_p: 660,
  madre: 165,
  padre: 575,
  root: 370,
}

function childX(i: number, total: number): number {
  const spread = Math.min((total - 1) * 150, 600)
  return X.root - spread / 2 + (total > 1 ? i * (spread / (total - 1)) : 0)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEX_DOT: Record<string, string> = { macho: "#1e3a8a", hembra: "#991b1b", indeterminado: "#9a958f" }
const SEX_LABEL: Record<string, string> = { macho: "Macho", hembra: "Hembra", indeterminado: "S/D" }
const ESTADO_PILL: Record<string, { label: string; bg: string; text: string }> = {
  vivo: { label: "Vivo", bg: "#f0fdf4", text: "#15803d" },
  fallecido: { label: "Fallecido", bg: "#fef2f2", text: "#991b1b" },
  transferido: { label: "Transferido", bg: "#f3f2ef", text: "#9a958f" },
  egresado: { label: "Egresado", bg: "#f3f2ef", text: "#9a958f" },
}

function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2
  return `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`
}

// ── Node component (rendered as foreignObject) ────────────────────────────────

function NodeCard({ node, cx, cy, isRoot, onClick }: {
  node: TreeNode; cx: number; cy: number; isRoot?: boolean
  onClick: (node: TreeNode, x: number, y: number) => void
}) {
  const x = cx - NHW
  const y = cy - NHH

  if (node.unknown) {
    return (
      <g>
        <rect x={x} y={y} width={NW} height={NH} rx={8}
          fill="#f9f9f7" stroke="#e5e2dc" strokeWidth={1} strokeDasharray="4 3" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#9a958f"
          fontFamily="var(--font-dm-sans), DM Sans, sans-serif" fontSize={11} fontStyle="italic">
          Desconocido
        </text>
      </g>
    )
  }

  const bg = isRoot ? "#e2f0ee" : "#ffffff"
  const borderColor = isRoot ? "#1a6560" : "#e5e2dc"
  const borderWidth = isRoot ? 2 : 0.5
  const dotColor = node.sexo ? SEX_DOT[node.sexo] : "#9a958f"
  const sexLabel = node.sexo ? SEX_LABEL[node.sexo] : "S/D"
  const estado = ESTADO_PILL[node.estado] ?? ESTADO_PILL.vivo

  return (
    <g style={{ cursor: "pointer" }} onClick={() => onClick(node, cx, cy)}>
      <rect x={x} y={y} width={NW} height={NH} rx={8}
        fill={bg} stroke={borderColor} strokeWidth={borderWidth} />

      {/* Code */}
      <text x={cx} y={y + 20} textAnchor="middle" fill="#1a6560" fontWeight={500} fontSize={13}
        fontFamily="var(--font-dm-mono), DM Mono, monospace">
        {node.codigo}
      </text>

      {/* Sex dot + label */}
      <circle cx={cx - 22} cy={y + 35} r={3} fill={dotColor} />
      <text x={cx - 15} y={y + 39} fill="#9a958f" fontSize={10}
        fontFamily="var(--font-dm-sans), DM Sans, sans-serif">
        {sexLabel}
      </text>

      {/* Estado pill */}
      <rect x={cx - 22} y={y + 47} width={44} height={12} rx={6}
        fill={estado.bg} />
      <text x={cx} y={y + 57} textAnchor="middle" fill={estado.text} fontSize={9}
        fontFamily="var(--font-dm-sans), DM Sans, sans-serif" fontWeight={500}>
        {estado.label}
      </text>
    </g>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ node, svgX, svgY, onClose }: { node: TreeNode; svgX: number; svgY: number; onClose: () => void }) {
  const router = useRouter()

  if (node.unknown) return null

  return (
    <div
      style={{
        position: "fixed",
        left: svgX + 10,
        top: svgY - 10,
        backgroundColor: "#0d0d0d", borderRadius: 8, padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(13,13,13,0.14)",
        zIndex: 100, minWidth: 160, pointerEvents: "auto",
      }}
    >
      <div style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 13, fontWeight: 500, color: "#f9f9f7" }}>
        {node.codigo}
      </div>
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 3 }}>
        {[node.sexo ? SEX_LABEL[node.sexo] : null, node.morfotipo].filter(Boolean).join(" · ") || "—"}
      </div>
      {node.estanque && (
        <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#9a958f", marginTop: 1 }}>
          {node.estanque} · {ESTADO_PILL[node.estado]?.label ?? node.estado}
        </div>
      )}
      <button
        type="button"
        onClick={() => { onClose(); router.push(`/dashboard/inventario/${node.id}`) }}
        style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, color: "#1a6560", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6 }}
      >
        Ver detalle →
      </button>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{
      position: "absolute", bottom: 20, left: 20,
      backgroundColor: "#ffffff", border: "0.5px solid #e5e2dc", borderRadius: 8, padding: "10px 14px",
      zIndex: 10,
    }}>
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 11, fontWeight: 500, color: "#0d0d0d", marginBottom: 8 }}>
        Leyenda
      </div>
      {[
        { render: <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#e2f0ee", border: "2px solid #1a6560" }} />, label: "Individuo raíz" },
        { render: <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#1e3a8a" }} />, label: "Macho" },
        { render: <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#991b1b" }} />, label: "Hembra" },
        { render: <div style={{ width: 12, height: 10, borderRadius: 2, border: "1px dashed #e5e2dc", backgroundColor: "#f9f9f7" }} />, label: "Ancestro desconocido" },
        { render: <div style={{ width: 20, height: 2, backgroundColor: "#fca5a5", borderRadius: 1 }} />, label: "Riesgo genético" },
      ].map(({ render, label }) => (
        <div key={label} className="flex items-center" style={{ gap: 8, marginBottom: 5 }}>
          <div style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{render}</div>
          <span style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 10, color: "#3c3a36" }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArbolPage() {
  const { ajolote_id } = useParams() as { ajolote_id: string }
  const { activeRefugioId } = useRefugio()

  const [treeData, setTreeData] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [tooltip, setTooltip] = useState<{ node: TreeNode; svgX: number; svgY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const toNode = useCallback((a: Record<string, unknown>): TreeNode => ({
    id: a.id as string,
    codigo: a.codigo as string,
    nombre: (a.nombre as string) ?? null,
    sexo: (a.sexo as TreeNode["sexo"]) ?? null,
    estado: (a.estado as TreeNode["estado"]) ?? "vivo",
    morfotipo: (a.morfotipo as string) ?? null,
    estanque: (a.estanques as { nombre: string } | null)?.nombre ?? null,
  }), [])

  const load = useCallback(async () => {
    if (!activeRefugioId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/refugios/${activeRefugioId}/ajolotes/${ajolote_id}`)
      if (!res.ok) return
      const { data: root } = await res.json()

      const unknownNode = (role: string): TreeNode => ({
        id: `unknown-${role}`, codigo: "?", nombre: null, sexo: null,
        estado: "vivo", morfotipo: null, estanque: null, unknown: true,
      })

      // Fetch grandparents
      const [madreDetail, padreDetail] = await Promise.all([
        root.madre?.id ? fetch(`/api/refugios/${activeRefugioId}/ajolotes/${root.madre.id}`).then(r => r.json()).then(d => d.data) : null,
        root.padre?.id ? fetch(`/api/refugios/${activeRefugioId}/ajolotes/${root.padre.id}`).then(r => r.json()).then(d => d.data) : null,
      ])

      setTreeData({
        root: toNode(root),
        madre: root.madre ? toNode(root.madre) : null,
        padre: root.padre ? toNode(root.padre) : null,
        abuela_m: madreDetail?.madre ? toNode(madreDetail.madre) : (root.madre ? unknownNode("abuela_m") : null),
        abuelo_m: madreDetail?.padre ? toNode(madreDetail.padre) : (root.madre ? unknownNode("abuelo_m") : null),
        abuela_p: padreDetail?.madre ? toNode(padreDetail.madre) : (root.padre ? unknownNode("abuela_p") : null),
        abuelo_p: padreDetail?.padre ? toNode(padreDetail.padre) : (root.padre ? unknownNode("abuelo_p") : null),
        hijos: (root.hijos ?? []).map((h: Record<string, unknown>) => toNode(h)),
      })
    } finally {
      setLoading(false)
    }
  }, [activeRefugioId, ajolote_id, toNode])

  useEffect(() => { load() }, [load])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setScale(s => Math.min(2, Math.max(0.4, s - e.deltaY * 0.001)))
  }

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as Element).closest("g[style*='cursor: pointer']")) return
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  function handleMouseUp() { setDragging(false) }

  function handleNodeClick(node: TreeNode, cx: number, cy: number) {
    if (node.unknown) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const screenX = rect.left + (cx * scale + offset.x) + rect.width / 2
    const screenY = rect.top + (cy * scale + offset.y)
    setTooltip(prev => prev?.node.id === node.id ? null : { node, svgX: screenX, svgY: screenY })
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
        <div style={{ height: "calc(100vh - 120px)", backgroundColor: "#f9f9f7", borderRadius: 10, border: "0.5px solid #e5e2dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 13, color: "#9a958f" }}>Construyendo árbol genealógico…</div>
        </div>
      </div>
    )
  }

  if (!treeData) return null

  const td = treeData
  const totalChildren = td.hijos.length

  // Canvas logical size (centers the content)

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <Link href="/dashboard/inventario" style={{ fontSize: 12, color: "#9a958f", textDecoration: "none" }}>Inventario</Link>
          <span style={{ fontSize: 12, color: "#9a958f" }}>/</span>
          <Link href={`/dashboard/inventario/${ajolote_id}`} style={{ fontSize: 12, color: "#9a958f", textDecoration: "none" }}>{td.root.codigo}</Link>
          <span style={{ fontSize: 12, color: "#9a958f" }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#0d0d0d" }}>Árbol genealógico</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "0.5px solid #e5e2dc", backgroundColor: "#ffffff", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "#3c3a36", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} />Exportar PNG
          </button>
          <div className="flex items-center" style={{ border: "0.5px solid #e5e2dc", borderRadius: 8, overflow: "hidden", backgroundColor: "#ffffff" }}>
            <button type="button" onClick={() => setScale(s => Math.max(0.4, s - 0.1))}
              style={{ width: 34, height: 34, border: "none", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Minus size={13} color="#3c3a36" />
            </button>
            <span style={{ fontFamily: "var(--font-dm-mono), DM Mono, monospace", fontSize: 12, color: "#0d0d0d", minWidth: 40, textAlign: "center", borderLeft: "0.5px solid #e5e2dc", borderRight: "0.5px solid #e5e2dc", lineHeight: "34px" }}>
              {Math.round(scale * 100)}%
            </span>
            <button type="button" onClick={() => setScale(s => Math.min(2, s + 0.1))}
              style={{ width: 34, height: 34, border: "none", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={13} color="#3c3a36" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{ position: "relative", height: "calc(100vh - 160px)", borderRadius: 10, border: "0.5px solid #e5e2dc", overflow: "hidden", backgroundColor: "#f9f9f7", cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setTooltip(null)}
      >
        <svg
          ref={svgRef}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}
          onWheel={handleWheel}
        >
          <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}
            style={{ transformOrigin: "center center" }}>
            {/* Offset to center tree in canvas */}
            <g transform={`translate(${0},${20})`}>

              {/* ── CONNECTORS ── */}
              <g stroke="#e5e2dc" strokeWidth={1.5} fill="none">
                {/* Grandparents → Mother */}
                {td.abuela_m && td.madre && (
                  <path d={bezier(X.abuela_m, GEN_Y.gp + NHH, X.madre, GEN_Y.p - NHH)} />
                )}
                {td.abuelo_m && td.madre && (
                  <path d={bezier(X.abuelo_m, GEN_Y.gp + NHH, X.madre, GEN_Y.p - NHH)} />
                )}
                {/* Grandparents → Father */}
                {td.abuela_p && td.padre && (
                  <path d={bezier(X.abuela_p, GEN_Y.gp + NHH, X.padre, GEN_Y.p - NHH)} />
                )}
                {td.abuelo_p && td.padre && (
                  <path d={bezier(X.abuelo_p, GEN_Y.gp + NHH, X.padre, GEN_Y.p - NHH)} />
                )}
                {/* Mother → Root */}
                {td.madre && (
                  <path d={bezier(X.madre, GEN_Y.p + NHH, X.root, GEN_Y.root - NHH)} />
                )}
                {/* Father → Root */}
                {td.padre && (
                  <path d={bezier(X.padre, GEN_Y.p + NHH, X.root, GEN_Y.root - NHH)} />
                )}
                {/* Root → Children */}
                {td.hijos.map((h, i) => (
                  <path key={h.id} d={bezier(X.root, GEN_Y.root + NHH, childX(i, totalChildren), GEN_Y.child - NHH)} />
                ))}
              </g>

              {/* ── NODES ── */}
              {/* Grandparents */}
              {td.abuela_m && <NodeCard node={td.abuela_m} cx={X.abuela_m} cy={GEN_Y.gp} onClick={handleNodeClick} />}
              {td.abuelo_m && <NodeCard node={td.abuelo_m} cx={X.abuelo_m} cy={GEN_Y.gp} onClick={handleNodeClick} />}
              {td.abuela_p && <NodeCard node={td.abuela_p} cx={X.abuela_p} cy={GEN_Y.gp} onClick={handleNodeClick} />}
              {td.abuelo_p && <NodeCard node={td.abuelo_p} cx={X.abuelo_p} cy={GEN_Y.gp} onClick={handleNodeClick} />}

              {/* Parents */}
              {td.madre && <NodeCard node={td.madre} cx={X.madre} cy={GEN_Y.p} onClick={handleNodeClick} />}
              {td.padre && <NodeCard node={td.padre} cx={X.padre} cy={GEN_Y.p} onClick={handleNodeClick} />}

              {/* Root */}
              <NodeCard node={td.root} cx={X.root} cy={GEN_Y.root} isRoot onClick={handleNodeClick} />

              {/* Children */}
              {td.hijos.map((h, i) => (
                <NodeCard key={h.id} node={h} cx={childX(i, totalChildren)} cy={GEN_Y.child} onClick={handleNodeClick} />
              ))}

            </g>
          </g>
        </svg>

        <Legend />

        {/* Tooltip */}
        {tooltip && (
          <Tooltip node={tooltip.node} svgX={tooltip.svgX} svgY={tooltip.svgY} onClose={() => setTooltip(null)} />
        )}
      </div>
    </div>
  )
}
