export interface UserDTO {
    _id: string;
    name: string;
    email: string;
    role: string;
    verified: boolean;
    avatar?: string;
    settings?: any;
}

export interface RegisterDTO {
    name: string;
    email: string;
    password: string;
    tenant: string;
    userReferred?: string;
    locale?: string;
}

export interface AuthResponse {
    session: string;
    user: UserDTO;
    settings: any;
}