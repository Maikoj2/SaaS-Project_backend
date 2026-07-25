export const courtRoutes = {
    CREATE_COURT: '/create-court',
    GET_COURTS: '/get-courts',
    GET_AVAILABLE_COURTS: '/get-available-courts',
    GET_COURT_BY_ID: '/get-court-by-id/:courtId',
    UPDATE_COURT: '/update-court/:courtId',
    DELETE_COURT: '/delete-court/:courtId',
    ATTACH_COURTS_TO_CHAMPIONSHIP: '/attach-courts-to-championship/:championshipId',
    DETACH_COURTS_FROM_CHAMPIONSHIP: '/detach-courts-from-championship/:championshipId',
    MARK_COURT_AS_OCCUPIED: '/mark-court-as-occupied/:courtId',
    MARK_COURT_AS_RESERVED: '/mark-court-as-reserved/:courtId',
};