import type { Pedigri } from "@/src/lib/pedigree"

const W = 62
const H = 30
const ROW_Y = [26, 104, 182]
const GEN_X: Record<string, [number, number]> = {
  // [generación, x]
  "F-02": [0, 45],
  "F-01": [0, 135],
  "F-04": [0, 225],
  "F-03": [0, 315],
  "A-11": [1, 45],
  "A-12": [1, 135],
  "A-13": [1, 225],
  "A-14": [1, 315],
  "B-21": [2, 95],
  "B-22": [2, 265],
}

function ancestrosYSelf(p: Pedigri, id: string, acc = new Set<string>()) {
  acc.add(id)
  const ind = p[id]
  if (ind.madre) ancestrosYSelf(p, ind.madre, acc)
  if (ind.padre) ancestrosYSelf(p, ind.padre, acc)
  return acc
}

export function PedigreeDiagram({
  pedigri,
  hembra,
  macho,
}: {
  pedigri: Pedigri
  hembra: string
  macho: string
}) {
  const linajeH = ancestrosYSelf(pedigri, hembra)
  const linajeM = ancestrosYSelf(pedigri, macho)
  const comunes = new Set(Array.from(linajeH).filter((x) => linajeM.has(x)))
  const enLinaje = new Set(Array.from(linajeH).concat(Array.from(linajeM)))

  // Un nodo está "en la ruta" si tiene un ancestro común (o es uno) y es parte del linaje.
  const enRuta = (id: string) =>
    enLinaje.has(id) && Array.from(ancestrosYSelf(pedigri, id)).some((a) => comunes.has(a))

  const ids = Object.keys(pedigri)
  const pos = (id: string) => ({ x: GEN_X[id][1], y: ROW_Y[GEN_X[id][0]] })

  const aristas = ids.flatMap((id) =>
    ([pedigri[id].madre, pedigri[id].padre].filter(Boolean) as string[]).map((padre) => ({
      padre,
      hijo: id,
      activa: enRuta(padre) && enLinaje.has(id),
    }))
  )
  // Primero las inactivas para que las activas queden encima.
  aristas.sort((a, b) => Number(a.activa) - Number(b.activa))

  return (
    <svg
      viewBox="0 0 360 208"
      className="w-full h-auto"
      aria-hidden="true"
      focusable="false"
    >
      {aristas.map(({ padre, hijo, activa }) => {
        const a = pos(padre)
        const b = pos(hijo)
        const y1 = a.y + H / 2
        const y2 = b.y - H / 2
        const ym = (y1 + y2) / 2
        return (
          <path
            key={`${padre}-${hijo}`}
            d={`M${a.x} ${y1} C${a.x} ${ym}, ${b.x} ${ym}, ${b.x} ${y2}`}
            fill="none"
            className={`transition-[stroke] duration-200 motion-reduce:transition-none ${
              activa ? "stroke-accent" : "stroke-border"
            }`}
            strokeWidth={activa ? 1.75 : 1}
          />
        )
      })}

      {ids.map((id) => {
        const { x, y } = pos(id)
        const ind = pedigri[id]
        const seleccionado = id === hembra || id === macho
        const comun = comunes.has(id)
        const ruta = enRuta(id)

        let rect = "fill-bg-card stroke-border"
        let texto = "fill-text-secondary"
        if (ruta) {
          rect = "fill-bg-card stroke-accent"
          texto = "fill-accent"
        }
        if (seleccionado) {
          rect = "fill-accent-bg stroke-accent"
          texto = "fill-accent"
        }
        if (comun) {
          rect = "fill-accent stroke-accent"
          texto = "fill-accent-text"
        }

        return (
          <g key={id}>
            <rect
              x={x - W / 2}
              y={y - H / 2}
              width={W}
              height={H}
              rx={ind.sexo === "F" ? H / 2 : 4}
              strokeWidth={seleccionado ? 1.5 : 1}
              className={`transition-[fill,stroke] duration-200 motion-reduce:transition-none ${rect}`}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              className={`font-mono text-[12px] transition-[fill] duration-200 motion-reduce:transition-none ${texto}`}
            >
              {id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
