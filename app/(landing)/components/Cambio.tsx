import { Reveal } from "./Reveal"

const filas = [
  {
    tarea: "Registro diario",
    antes: "Parámetros del agua y observaciones repartidos entre libreta, fotos y mensajes.",
    ahora: "Cada medición queda en un solo registro, con fecha, estanque y quién la capturó.",
  },
  {
    tarea: "Parentesco de una cruza",
    antes: "Se revisa de memoria o en una hoja de cálculo que nadie actualiza.",
    ahora: "Cada ejemplar conserva a su madre y a su padre. El coeficiente de cualquier pareja se calcula al momento.",
  },
  {
    tarea: "Reporte de la UMA",
    antes: "Hay que juntar meses de registros y armarlos a mano antes de entregarlos.",
    ahora: "El reporte se genera con los registros que ya capturaste.",
  },
]

export function Cambio() {
  return (
    <section id="producto" className="border-t-[0.5px] border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-inner">
        <Reveal>
          <h2 className="max-w-[640px] text-balance text-[clamp(24px,3.4vw,36px)] font-medium leading-[1.15] text-text-primary">
            Del cuaderno al reporte, sin volver a copiar los datos.
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="mt-10 sm:mt-14">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Cómo cambia cada tarea con Axo</caption>
            <thead className="hidden md:table-header-group">
              <tr className="border-b-[0.5px] border-border">
                <th scope="col" className="w-[24%] pb-3 pr-6 text-label text-text-secondary">Tarea</th>
                <th scope="col" className="w-[36%] pb-3 pr-6 text-label text-text-secondary">Hoy</th>
                <th scope="col" className="pb-3 text-label text-accent">Con Axo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.tarea}
                  className="block border-b-[0.5px] border-border py-5 md:table-row md:py-0"
                >
                  <th scope="row" className="block pb-2 text-h3 text-text-primary md:table-cell md:py-6 md:pr-6 md:align-top">
                    {f.tarea}
                  </th>
                  <td className="block pb-2 text-body-l text-text-secondary md:table-cell md:py-6 md:pr-6 md:align-top">
                    <span className="mr-2 text-label text-text-secondary md:hidden">Hoy:</span>
                    {f.antes}
                  </td>
                  <td className="block text-body-l text-text-primary md:table-cell md:py-6 md:align-top">
                    <span className="mr-2 text-label text-accent md:hidden">Con Axo:</span>
                    {f.ahora}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  )
}
