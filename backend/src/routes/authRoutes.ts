import express, { Request, Response } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import passport from '../config/passport.js';
import { generateToken } from '../utils/jwt.js';

const router: import("express").Router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:4321'}/?error=google_auth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = generateToken(user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// Rutas protegidas (requieren autenticación)
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.post('/logout', requireAuth, logout);

export default router;
