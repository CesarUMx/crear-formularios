import type { FormTemplate } from '../../../lib/templates';
import type { PublicForm } from '../../../lib/publicFormService';

interface AcademicTemplateProps {
  form: PublicForm;
  template: FormTemplate;
  children: React.ReactNode;
}

export default function AcademicTemplate({ form, template, children }: AcademicTemplateProps) {
  return (
    <div className="min-h-screen bg-white">

      <section className="relative overflow-hidden bg-[#0E5088] text-white">
        <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-5" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {form.title}
            </h1>
            <p className="mt-6 text-xl text-white/90 text-balance leading-relaxed">Una invitación a construir juntos</p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl">
            <p className="text-lg leading-relaxed text-white/90 text-pretty">
              Participar en un Proyecto Fin de Semestre es abrir las puertas de su organización a una nueva generación de
              talento, creatividad y compromiso.
            </p>

            <p className="mt-6 text-lg leading-relaxed text-white/90 text-pretty">
              Cada reto que ustedes propongan será una oportunidad para que nuestros estudiantes aprendan a resolver
              problemas con empatía, rigor y visión de futuro, mientras su empresa o institución recibe miradas frescas,
              ideas innovadoras y posibles soluciones de alto valor.
            </p>

            <p className="mt-6 text-lg leading-relaxed text-white/90 text-pretty">
              Esta colaboración no sólo fortalece la vinculación universidad–empresa, sino que contribuye directamente a
              formar profesionistas que transforman su entorno con sentido humano, pensamiento crítico y responsabilidad
              social.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center mb-16">
          <p className="text-2xl font-semibold text-[#0E5088] text-balance leading-relaxed">
            Un proyecto académico, una alianza de impacto real.
          </p>
          <p className="mt-4 text-2xl font-semibold text-[#0E5088] text-balance leading-relaxed">
            Juntos, convertimos los desafíos de hoy en las soluciones del mañana.
          </p>
        </div>

        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#0E5088] sm:text-4xl">Video</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Conozca más sobre nuestra visión de colaboración universidad-empresa
            </p>
          </div>

          <div className="mt-12 aspect-video w-full overflow-hidden rounded-lg bg-muted shadow-xl">
            {/* Placeholder for video - replace with actual video embed */}
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0E5088] to-[#0E5088]/80">
              <div className="text-center text-white">
                <svg className="mx-auto h-20 w-20 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <p className="mt-4 text-sm opacity-80">Video</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-muted/30 py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#0E5088] sm:text-4xl text-balance">
            Proponga su Proyecto
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-balance">
            Complete el siguiente formulario para que podamos entender sus necesidades y asignar el equipo ideal
          </p>
        </div>


      {/* Contenido del formulario */}
      <div className="mt-12 space-y-8">
        {children}
      </div>

      <div className="mt-12 rounded-lg bg-[#0E5088]/5 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Tiene preguntas sobre el proceso? Contáctenos en{" "}
            <a href="mailto:vinculacion@mondragonmexico.edu.mx" className="font-medium text-[#0E5088] hover:underline">
              vinculacion@mondragonmexico.edu.mx
            </a>
          </p>
        </div>
      </div>
    </section>

      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-width mx-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-lg font-semibold text-green-800 text-center">¡Gracias por completar este formulario!</p>
            </div>

            <div className="text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-balance">
                ¿Qué sigue después de registrar su proyecto?
              </h2>

              <div className="prose prose-lg mx-auto text-left space-y-6 text-muted-foreground">
                <p className="text-pretty leading-relaxed">
                  El equipo académico de la Universidad Mondragón México revisará la información para determinar su
                  viabilidad y alineación con los Proyectos Fin de Semestre (PFS) del periodo en curso.
                </p>

                <p className="text-pretty leading-relaxed">
                  En un plazo breve, nos comunicaremos con ustedes para confirmar la recepción del registro, aclarar
                  cualquier detalle y notificar si el proyecto puede ser integrado en este semestre.
                </p>

                <p className="text-pretty leading-relaxed">
                  En caso de que la propuesta no pueda abordarse de inmediato, quedará registrada en nuestro banco de
                  proyectos para ser considerada en futuras ediciones, proyectos de formación ejecutiva o Programa
                  Aula-empresa.
                </p>

                <p className="text-pretty leading-relaxed">
                  Agradecemos profundamente su disposición para colaborar con nuestra comunidad universitaria.
                </p>

                <p className="text-pretty leading-relaxed">
                  Su participación es clave para acercar la realidad del entorno profesional al aula, y juntos, construir
                  soluciones innovadoras y de impacto.
                </p>
              </div>

              <div className="pt-8">
                <blockquote className="text-2xl md:text-3xl font-semibold text-primary text-balance italic">
                  "Cada reto que comparten es una oportunidad para que nuestros estudiantes aprendan, creen y
                  transformen."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
