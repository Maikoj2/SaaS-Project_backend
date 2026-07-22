export const RegistrationRoutes = {
    REGISTRATION_LINK: '/invitation-link/registration/:code',
    REGISTRATION_WEBHOOK: '/tenant/:tenantId/championship/:id/registration/webhook',
    REGISTRATION_STATUS: '/:id',
    REGISTRATION_WEBHOOK_SUCCESS: '/championships/registration/webhook/success',
    REGISTRATION_WEBHOOK_PENDING: '/championships/registration/webhook/pending',
    REGISTRATION_WEBHOOK_FAILURE: '/championships/registration/webhook/failure',
    REGISTRATION_PUBLIC_TEAM_WITH_PLAYERS: '/public/:code/team'
}