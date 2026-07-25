export const playerRoutes = {
    PLAYER_BY_LINK: 'public/linkInvitation/:code/player',
    CREATE_PLAYER_MANUALLY: '/championships/:championshipId/players/manual',
    GET_PLAYERS_BY_CHAMPIONSHIP: '/championships/:championshipId/players',
    GET_PLAYER_BY_CHAMPIONSHIP: '/championships/:championshipId/players/:playerId',
    UPDATE_PLAYER_BY_CHAMPIONSHIP: '/championships/:championshipId/players/:playerId',
}