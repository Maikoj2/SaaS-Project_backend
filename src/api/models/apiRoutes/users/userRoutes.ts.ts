const usersWithId = '/:id';
export const UsersRoute = {
    USERS: '/',
    USERS_BY_LINK: '/linkInvitation/:code',
    GET_USER_BY_ID: usersWithId,
    UPDATE_USER: usersWithId,
    DELETE_USER: usersWithId
}