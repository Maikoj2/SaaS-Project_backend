import express, { Express, Request, RequestHandler, Response } from 'express';
import { origin } from '../../middlewares';
// import { ApiResponse } from '../../responses';
import { PluginsRoute } from '../../models/apiRoutes/plugins/pluginsRoutes';
import { handleAuthError, requireAuth } from '../../config/passport/passport';
import { ApiResponse } from '../../responses';
import trimRequest from 'trim-request';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes';
import { auth } from '../../middlewares/auth.middleware';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware';
import { PluginsController } from '../../controllers/plugins/plugins.controller';

const app: Express = express();
const pluginsController = new PluginsController();
// const validator = new PluginsValidator();

// Get all plugins
app.get(PluginsRoute.PLUGINS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        requireAuth as RequestHandler,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER
        ]) as RequestHandler,
        trimRequest.all as RequestHandler
    ],
    pluginsController.getItems as RequestHandler
);

// // Get single plugin
// app.get(`${PluginsRoute.PLUGINS}/:id`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         AuthController.roleAuthorization(['admin', 'manager']) as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.getItem as RequestHandler
//     ],
//     controller.getItem
// );

// // Create plugin
// app.post(PluginsRoute.PLUGINS,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         AuthController.roleAuthorization(['admin']) as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.createItem as RequestHandler
//     ],
//     controller.createItem
// );

// // Activate plugin
// app.post(`${PluginsRoute.PLUGINS}/:id/active`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         AuthController.roleAuthorization(['admin']) as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.activeItem as RequestHandler
//     ],
//     controller.activeItem
// );

// // Update plugin
// app.patch(`${PluginsRoute.PLUGINS}/:id`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         AuthController.roleAuthorization(['admin', 'manager']) as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.updateItem as RequestHandler
//     ],
//     controller.updateItem
// );

// // Disable plugin
// app.delete(`${PluginsRoute.PLUGINS}/:id/disabled`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         AuthController.roleAuthorization(['admin', 'manager']) as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.deleteItem as RequestHandler
//     ],
//     controller.disabledItem
// );

// // Delete plugin
// app.delete(`${PluginsRoute.PLUGINS}/:id`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         AuthController.roleAuthorization(['admin', 'manager']) as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.deleteItem as RequestHandler
//     ],
//     controller.deleteItem
// );

// // Plugin events
// app.get(`${PluginsRoute.PLUGINS}/:id/events/:action`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.actionsPlugin as RequestHandler
//     ],
//     controller.actionForPlugin
// );

// app.post(`${PluginsRoute.PLUGINS}/:id/events/:action`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.actionsPlugin as RequestHandler
//     ],
//     controller.actionForPlugin
// );

// // Public plugin route
// app.post(`${PluginsRoute.PLUGINS}/public/:id/events/:action`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.actionsPlugin as RequestHandler
//     ],
//     controller.actionForPublic
// );

export default app;
