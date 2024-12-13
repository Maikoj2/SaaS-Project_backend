export enum AuthRoute {
    VERIFY = '/verify/:tenant/:verificationCode',
    REGISTER = '/register',
    LOGIN = '/login',
    FORGOT = '/forgot-password',
    RESET = '/reset-password',
    TOKEN = '/token',
    CHECK = '/check',
    REFRESH = '/refresh-token'
} 
export enum AuthRole {
    ADMIN = 'admin',
    ORGANIZER = 'organizer',
    REFEREE = 'referee',
    TEAM_MEMBER = 'team_member',
    VIEWER = 'viewer'
}

export enum AuthSocialRoute {
    GOOGLE = '/google',
    FACEBOOK = '/facebook',
    APPLE = '/apple',
    MICROSOFT = '/microsoft',
    GITHUB = '/github'
}
