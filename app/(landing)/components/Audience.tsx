import { Reveal } from "./Reveal"

const grupos = [
  {
    titulo: "Laboratorios y grupos de investigación",
    texto: "Datos capturados con el mismo criterio todos los días y exportables para el análisis.",
  },
  {
    titulo: "UMAs registradas",
    texto: "Bitácoras con fecha y responsable, y el reporte armado a partir de ellas.",
  },
  {
    titulo: "Proyectos de rescate",
    texto: "Inventario y estado de salud de cada ejemplar sin una plataforma pesada.",
  },
  {
    titulo: "Criaderos",
    texto: "Linaje por ejemplar para decidir las cruzas con el coeficiente a la vista.",
  },
]

export function Audience() {
  return (
    <section id="audiencia" className="border-t-[0.5px] border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-inner grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <Reveal>
          <h2 className="text-balance text-[clamp(24px,3.4vw,36px)] font-medium leading-[1.15] text-text-primary">
            Para quien lleva un refugio, sin importar su tamaño.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <dl className="border-t-[0.5px] border-border">
            {grupos.map((g) => (
              <div
                key={g.titulo}
                className="grid grid-cols-1 gap-1 border-b-[0.5px] border-border py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6"
              >
                <dt className="text-h3 text-text-primary">{g.titulo}</dt>
                <dd className="text-body-l text-text-secondary">{g.texto}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
