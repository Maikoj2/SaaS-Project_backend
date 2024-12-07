import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../../models/mongoose/user';
import { env } from '../env.config';
import { Logger } from '../logger/WinstonLogger';
import { TokenService } from '../../services/token.service';

const logger = new Logger();
const tokenService = new TokenService();

const opts = {
    jwtFromRequest: (req: Request) => {
        try {
            const encryptedToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
            if (!encryptedToken) {
                return null;
            }

            // Desencriptar el token
            const decryptedToken = tokenService.decrypt(encryptedToken);

            return decryptedToken;
        } catch (error) {
            logger.error('Error procesando token:', error);
            return null;
        }
    },
    secretOrKey: env.JWT_SECRET,
    passReqToCallback: true as true
};

passport.use(
    new JwtStrategy(opts, async (req, jwt_payload, done) => {
        try {


            if (!jwt_payload.data?._id) {
                return done(null, false);
            }

            const user = await User.findById(jwt_payload.data._id)
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

export const requireAuth = passport.authenticate('jwt', {
    session: false
});

// Middleware para manejar errores de autenticación
export const handleAuthError = (err: any, req: any, res: any, next: any) => {
    if (err.name === 'AuthenticationError') {
        logger.warn('Error de autenticación:', err);
        return res.status(401).json({
            success: false,
            error: 'No autorizado'
        });
    }
    next(err);
};