import { useState } from 'react';
import { authService } from '../../lib/auth';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
//import AnimatedCharacters from './AnimatedCharacters';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  //const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login({ email, password });
      window.location.href = '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Columna izquierda */}
      <div
        className="w-full lg:w-[46%] flex items-center justify-center px-6 sm:px-8 lg:px-16 xl:px-20"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center lg:justify-center mb-8">
            <img
              src="/images/logo_login.svg"
              alt="Evaluo Logo"
              className="w-80 h-auto object-contain"
              onError={(e) => {
                console.error('Error loading logo');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Encabezado */}
          <div className="mb-8 text-center lg:text-center">
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ color: '#0F172A' }}
            >
              Iniciar sesión
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-6" style={{ color: '#64748B' }}>
              Accede a tu plataforma de formularios, evaluación y analítica inteligente.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Formulario */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: '#334155' }}
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="block w-full rounded-xl border bg-white pl-12 pr-4 py-3 text-sm outline-none transition focus:ring-2"
                  style={{
                    borderColor: '#E5E7EB',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: '#334155' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border bg-white pl-12 pr-4 py-3 text-sm outline-none transition focus:ring-2"
                  style={{
                    borderColor: '#E5E7EB',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: loading
                  ? '#60A5FA'
                  : 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                boxShadow: '0 10px 24px rgba(37, 99, 235, 0.22)',
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Pie */}
          <div className="mt-8 text-center lg:text-left">
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              Plataforma segura para formularios, exámenes y monitoreo institucional.
            </p>
          </div>
        </div>
      </div>

      {/* Columna derecha */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden items-center justify-center">

        {/* Fondo degradado */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #2563EB 0%, #1E40AF 60%, #312E81 100%)',
          }}
        />

        {/* Glow moderno */}
        <div className="absolute top-[-80px] left-[-40px] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-40px] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />

        {/* Contenido */}
        <div className="relative z-10 text-center text-white px-10 max-w-lg">

          <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
            Captura, evalúa y analiza
          </h2>

          <p className="mt-4 text-lg text-blue-100">
            Todo en una sola plataforma.
          </p>

        </div>

        {/* Elementos flotantes sutiles */}
        <div className="absolute w-full h-full pointer-events-none">

          {/* Círculos suaves */}
          <div className="absolute top-[20%] left-[30%] w-3 h-3 bg-white/30 rounded-full" />
          <div className="absolute top-[40%] left-[60%] w-2 h-2 bg-white/30 rounded-full" />
          <div className="absolute top-[70%] left-[45%] w-2 h-2 bg-white/20 rounded-full" />

        </div>

      </div>
    </div>
  );
}
