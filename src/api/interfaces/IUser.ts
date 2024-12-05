export interface IUser {
    name: string;
    lastName?: string;
    nie?: string;
    stepper: any[];
    email: string;
    password: string;
    role: 'admin' | 'organizer' | 'referee' | 'team_member' | 'viewer';
    verification?: string;
    verified: boolean;
    tag: any[];
    avatar?: string;
    description?: string;
    nameBusiness?: string;
    phone?: string;
    address?: object;
    loginAttempts: number;
    blockExpires: Date;
    socialNetwork: any[];
    referredCode: string;
    dummy: boolean;
}

export interface IUserMethods {
    comparePassword(passwordAttempt: string, cb: (err: Error | null, isMatch?: boolean) => void): void;
} 