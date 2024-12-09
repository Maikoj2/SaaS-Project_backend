import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../../models/mongoose/user';
import { env } from '../env.config';
import { Logger } from '../logger/WinstonLogger';
import { decrypt } from '../../utils';

const logger = new Logger();

const opts = {
    jwtFromRequest: (req: Request) => {
        try {
            const encryptedToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
            if (!encryptedToken) return null;

            // Decrypt and parse the tokens
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            // Return the access token
            return tokens.accessToken;
        } catch (error) {
            logger.error('Error processing token:', error);
            return null;
        }
    },
    secretOrKey: env.JWT_SECRET,
    passReqToCallback: true as true
};

passport.use(
    new JwtStrategy(opts, async (req, jwt_payload, done) => {
        try {
            const user = await User.findById(jwt_payload.userId)
                .select('-password');

            if (user) {
                return done(null, user);
            }
            return done(null, false);
        } catch (error) {
            return done(error, false);
        }
    })
);

export const requireAuth = passport.authenticate('jwt', { session: false });

// Middleware para manejar errores de autenticación
export const handleAuthError = (err: any, req: any, res: any, next: any) => {
    if (err.name === 'AuthenticationError' || err.name === 'AuthError') {
        logger.warn('Error de autenticación:', err);
        
        return res.status(401).json({
            status: 'error',
            code: err.code || 'AUTH_ERROR',
            message: err.message || 'Error de autenticación',
            shouldRefresh: err.message?.includes('expirado') || false
        });
    }
    next(err);
};