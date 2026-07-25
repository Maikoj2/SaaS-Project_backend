export const teamRoutes = {
    CREATE_TEAM_BY_LINK: '/linkInvitation/:code',
    CREATE_TEAM: "",
    REMOVE_TEAM: '/teams/:teamId',
    GET_TEAMS_BY_CHAMPIONSHIP: '/championships/:championshipId/teams',
    GET_TEAM_BY_ID: '/championships/:championshipId/teams/:teamId',
    CREATE_TEAM_MANUALLY: '/championships/:championshipId/teams',
    UPDATE_TEAM_MANUALLY: '/championships/:championshipId/teams/:teamId',
    ADD_PLAYER_TO_TEAM: '/championships/:championshipId/teams/:teamId/players',
    REMOVE_PLAYER_FROM_TEAM: '/championships/:championshipId/teams/:teamId/players/:playerId',
    REPLACE_PLAYER_IN_TEAM: '/championships/:championshipId/teams/:teamId/players/replace',
}