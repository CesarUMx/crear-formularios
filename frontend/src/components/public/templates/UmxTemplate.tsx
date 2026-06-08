import type { FormTemplate } from '../../../lib/templates';
import type { PublicForm } from '../../../lib/publicFormService';
import { API_URL } from '../../../lib/config';

const BACKEND_URL = API_URL.replace('/api', '');

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

interface UmxTemplateProps {
  form: PublicForm;
  template: FormTemplate;
  children: React.ReactNode;
}

export default function UmxTemplate({ form, template, children }: UmxTemplateProps) {
  const primaryOrange = template.primaryColor;    // #FF4D00
  const secondaryBlue = template.secondaryColor;  // #0E5088

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: template.fontFamily, backgroundColor: template.backgroundColor, color: template.textColor }}
    >
      {/* Google Fonts – Poppins */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
      />

      {/* Main header */}
      <header
        className="w-full shadow-md"
        style={{ backgroundColor: primaryOrange }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center">
          <img
            src="/images/Logo Uni_Blanco.png"
            alt="Universidad Mondragón México"
            className="h-20 w-auto object-contain"
          />
        </div>
      </header>

      {/* Cover image or page hero */}
      {form.coverImage ? (
        <div className="w-full h-52 sm:h-72 overflow-hidden relative">
          <img
            src={resolveImageUrl(form.coverImage)}
            alt="Portada"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, transparent 40%, ${secondaryBlue}cc 100%)` }}
          />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                {form.title}
              </h1>
              {form.description && (
                <p className="mt-1 text-white/90 text-sm sm:text-base drop-shadow-sm">
                  {form.description}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Hero without cover */
        <div
          className="w-full py-12 px-6"
          style={{ background: `linear-gradient(135deg, ${secondaryBlue} 0%, #1a6fad 100%)` }}
        >
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-3 text-white/85 text-base sm:text-lg max-w-2xl">
                {form.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Orange accent divider */}
      <div className="h-1.5 w-full" style={{ backgroundColor: primaryOrange }} />

      {/* Form body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Form content */}
        <div className="space-y-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="mt-12 py-6 px-6 text-center text-sm text-white/80"
        style={{ backgroundColor: secondaryBlue }}
      >
        <p className="font-medium text-white">Universidad Mondragón México</p>
        <p className="mt-1">Anillo Vial III Poniente no. 172 &nbsp;·&nbsp; (442) 40 210 00</p>
        <p className="mt-1">
          <a
            href="mailto:comunicacion@mondragonmexico.edu.mx"
            className="hover:text-white underline underline-offset-2"
          >
            comunicacion@mondragonmexico.edu.mx
          </a>
        </p>
      </footer>
    </div>
  );
}
