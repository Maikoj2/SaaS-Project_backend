import { AuthRole } from "./apiRoutes";

export enum AuthPermission {
    // championship
    CHAMPIONSHIP_CREATE = 'championship:create',
    CHAMPIONSHIP_READ = 'championship:read',
    CHAMPIONSHIP_UPDATE = 'championship:update',
    CHAMPIONSHIP_DELETE = 'championship:delete',
    CHAMPIONSHIP_REGISTER_TEAM = 'championship:register-team',

    // users
    USER_CREATE = 'user:create',
    USER_READ = 'user:read',
    USER_UPDATE = 'user:update',
    USER_DELETE = 'user:delete',
    USER_READ_DETAIL = 'user:read-detail',

    // teams
    TEAM_READ = 'team:read',
    TEAM_CREATE = 'team:create',
    TEAM_UPDATE = 'team:update',
    TEAM_DELETE = 'team:delete',

    // players
    PLAYER_READ = 'player:read',
    PLAYER_CREATE = 'player:create',
    PLAYER_UPDATE = 'player:update',
    PLAYER_DELETE = 'player:delete',
    PLAYER_REGISTER = 'player:register',

    // game formats
    GAME_FORMAT_CREATE = 'game-format:create',
    GAME_FORMAT_READ = 'game-format:read',
    GAME_FORMAT_UPDATE = 'game-format:update',
    GAME_FORMAT_DELETE = 'game-format:delete',

    // court
    COURT_CREATE = 'court:create',
    COURT_READ = 'court:read',
    COURT_UPDATE = 'court:update',
    COURT_DELETE = 'court:delete',

    // invitation links
    INVITATION_LINK_CREATE = 'invitation-link:create',
    INVITATION_LINK_READ = 'invitation-link:read',
    INVITATION_LINK_MANAGE = 'invitation-link:manage',

    // group distribution
    GROUP_DISTRIBUTION_CREATE = 'group-distribution:create',
    GROUP_DISTRIBUTION_READ = 'group-distribution:read',
    GROUP_DISTRIBUTION_UPDATE = 'group-distribution:update',
    GROUP_DISTRIBUTION_DELETE = 'group-distribution:delete',

    // match
    MATCH_CREATE = 'match:create',
    MATCH_RESULT_REGISTER = 'match:result-register',
    MATCH_READ = 'match:read',
    MATCH_UPDATE = 'match:update',
    MATCH_DELETE = 'match:delete',

    // elimination bracket
    ELIMINATION_BRACKET_CREATE = 'elimination-bracket:create',
    ELIMINATION_BRACKET_READ = 'elimination-bracket:read',
    ELIMINATION_BRACKET_UPDATE = 'elimination-bracket:update',
    ELIMINATION_BRACKET_DELETE = 'elimination-bracket:delete',

    // group
    GROUP_CREATE = 'group:create',
    GROUP_READ = 'group:read',
    GROUP_UPDATE = 'group:update',
    GROUP_DELETE = 'group:delete',

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
        AuthPermission.CHAMPIONSHIP_REGISTER_TEAM,
        AuthPermission.GAME_FORMAT_READ,
        AuthPermission.INVITATION_LINK_CREATE,
        AuthPermission.INVITATION_LINK_READ,
        AuthPermission.INVITATION_LINK_MANAGE,
        AuthPermission.GROUP_DISTRIBUTION_CREATE,
        AuthPermission.GROUP_DISTRIBUTION_READ,
        AuthPermission.GROUP_DISTRIBUTION_UPDATE,
        AuthPermission.GROUP_DISTRIBUTION_DELETE,
        AuthPermission.GROUP_CREATE,
        AuthPermission.GROUP_READ,
        AuthPermission.COURT_CREATE,
        AuthPermission.COURT_READ,
        AuthPermission.COURT_UPDATE,
        AuthPermission.COURT_DELETE,
        AuthPermission.GROUP_UPDATE,
        AuthPermission.GROUP_DELETE,
        AuthPermission.MATCH_CREATE,
        AuthPermission.MATCH_READ,
        AuthPermission.TEAM_READ,
        AuthPermission.PLAYER_READ,
        AuthPermission.PLAYER_CREATE,
        AuthPermission.PLAYER_UPDATE,
        AuthPermission.MATCH_UPDATE,
        AuthPermission.MATCH_DELETE,
        AuthPermission.ELIMINATION_BRACKET_CREATE,
        AuthPermission.ELIMINATION_BRACKET_READ,
        AuthPermission.ELIMINATION_BRACKET_UPDATE,
        AuthPermission.ELIMINATION_BRACKET_DELETE,
        AuthPermission.PROFILE_READ,
        AuthPermission.PROFILE_UPDATE,
        AuthPermission.USER_READ,
        AuthPermission.USER_READ_DETAIL,
        AuthPermission.GAME_FORMAT_CREATE,
        AuthPermission.GAME_FORMAT_READ,
        AuthPermission.GAME_FORMAT_UPDATE,
        AuthPermission.GAME_FORMAT_DELETE,
    ],
    [AuthRole.REFEREE]: [
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.PROFILE_READ,
        AuthPermission.PROFILE_UPDATE,
        AuthPermission.GROUP_DISTRIBUTION_READ,
        AuthPermission.GROUP_READ,
        AuthPermission.COURT_READ,
        AuthPermission.TEAM_READ,
        AuthPermission.MATCH_RESULT_REGISTER,
        AuthPermission.MATCH_READ,
        AuthPermission.PLAYER_READ,
        AuthPermission.ELIMINATION_BRACKET_READ,
        AuthPermission.GAME_FORMAT_READ,

    ],
    [AuthRole.TEAM_MEMBER]: [
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.PROFILE_READ,
        AuthPermission.PROFILE_UPDATE,
        AuthPermission.USER_READ_DETAIL,
        AuthPermission.GROUP_DISTRIBUTION_READ,
        AuthPermission.GROUP_READ,
        AuthPermission.COURT_READ,
        AuthPermission.MATCH_READ,
        AuthPermission.PLAYER_READ,
        AuthPermission.PLAYER_REGISTER,
        AuthPermission.ELIMINATION_BRACKET_READ,
        AuthPermission.GAME_FORMAT_READ,
    ],
    [AuthRole.VIEWER]: [
        AuthPermission.CHAMPIONSHIP_READ,
        AuthPermission.PROFILE_READ,
        AuthPermission.GROUP_DISTRIBUTION_READ,
        AuthPermission.GROUP_READ,
        AuthPermission.COURT_READ,
        AuthPermission.MATCH_READ,
        AuthPermission.ELIMINATION_BRACKET_READ,
        AuthPermission.GAME_FORMAT_READ,
    ]
}