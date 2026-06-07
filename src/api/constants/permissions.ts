import { AuthRole } from "./apiRoutes";

export enum AuthPermission {
    // championship
    CHAMPIONSHIP_CREATE = 'championship:create',
    CHAMPIONSHIP_READ = 'championship:read',
    CHAMPIONSHIP_UPDATE = 'championship:update',
    CHAMPIONSHIP_DELETE = 'championship:delete',
    // users
    USER_CREATE = 'user:create',
    USER_READ = 'user:read',
    USER_UPDATE = 'user:update',
    USER_DELETE = 'user:delete',
    USER_READ_DETAIL = 'user:read-detail',
    // game formats
    GAME_FORMAT_CREATE = 'game-format:create',
    GAME_FORMAT_READ = 'game-format:read',
    // invitation links
    INVITATION_LINK_CREATE = 'invitation-link:create',
    INVITATION_LINK_READ = 'invitation-link:read',
    INVITATION_LINK_MANAGE = 'invitation-link:manage',
    // profile
    PROFILE_READ = 'profile:read',
    PROFILE_UPDATE = 'profile:update',
    // plugins
    PLUGIN_MANAGE = 'plugin:manage'
}

export const RolePermissions: Record<AuthRole, AuthPermission[]> = {
    [AuthRole.ADMIN]: Object.values(AuthPermission), // El Administrador tiene acceso a todo
    [AuthRole.ORGANIZER]: [
        AuthPermission.CHAMPIONSHIP_CREATE,
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.CHAMPIONSHIP_UPDATE,
        AuthPermission.GAME_FORMAT_READ,
        AuthPermission.INVITATION_LINK_CREATE,
        AuthPermission.INVITATION_LINK_READ,
        AuthPermission.INVITATION_LINK_MANAGE,
        AuthPermission.PROFILE_READ,
        AuthPermission.PROFILE_UPDATE,
        AuthPermission.USER_READ,
        AuthPermission.USER_READ_DETAIL
    ],
    [AuthRole.REFEREE]: [
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.PROFILE_READ,
        AuthPermission.PROFILE_UPDATE,

    ],
    [AuthRole.TEAM_MEMBER]: [
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.PROFILE_READ,
        AuthPermission.PROFILE_UPDATE,
        AuthPermission.USER_READ_DETAIL
    ],
    [AuthRole.VIEWER]: [
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.PROFILE_READ,
    ]
}