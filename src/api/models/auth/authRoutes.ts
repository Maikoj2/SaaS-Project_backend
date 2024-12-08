export enum AuthRoute {
    VERIFY = '/verify',
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
