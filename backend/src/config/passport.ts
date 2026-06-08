import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No se pudo obtener el email de Google'), undefined);
        }

        // Buscar por googleId primero, luego por email
        let user = await prisma.user.findFirst({
          where: { OR: [{ googleId: profile.id }, { email }] },
        });

        if (user) {
          if (!user.isActive) {
            return done(new Error('Usuario desactivado. Contacta al administrador.'), undefined);
          }
          // Vincular googleId si aún no está vinculado
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id, lastLogin: new Date() },
            });
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() },
            });
          }
        } else {
          // Crear usuario nuevo con Google
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || email,
              googleId: profile.id,
              role: 'ADMIN',
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
    )
  );
}

// Serialización mínima para el flujo OAuth (no se usa para sesiones de usuario)
passport.serializeUser((user: any, done) => done(null, user.id));

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
