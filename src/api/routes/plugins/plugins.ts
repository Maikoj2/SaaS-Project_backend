import { Router, RequestHandler } from 'express';
import { origin } from '../../middlewares';
import trimRequest from 'trim-request';
import { auth } from '../../middlewares/auth.middleware';
import { PluginsController } from '../../controllers/plugins/plugins.controller';
import { PluginsRoute } from '../../constants/apiRoutes/plugins/pluginsRoutes';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware';
import { AuthPermission } from '../../constants/permissions';

const router: Router = Router();
const pluginsController = new PluginsController();
// const validator = new PluginsValidator();

// Get all plugins
router.get(PluginsRoute.PLUGINS,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        auth as RequestHandler,
        permissionAuthorization([AuthPermission.PLUGIN_MANAGE]) as RequestHandler,
        trimRequest.all as RequestHandler
    ],
    pluginsController.getItems as RequestHandler
);

// // Get single plugin
// router.get(`${PluginsRoute.PLUGINS}/:id`,
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
// router.post(PluginsRoute.PLUGINS,
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
// router.post(`${PluginsRoute.PLUGINS}/:id/active`,
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
// router.patch(`${PluginsRoute.PLUGINS}/:id`,
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
// router.delete(`${PluginsRoute.PLUGINS}/:id/disabled`,
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
// router.delete(`${PluginsRoute.PLUGINS}/:id`,
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
// router.get(`${PluginsRoute.PLUGINS}/:id/events/:action`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         requireAuth as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.actionsPlugin as RequestHandler
//     ],
//     controller.actionForPlugin
// );

// router.post(`${PluginsRoute.PLUGINS}/:id/events/:action`,
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
// router.post(`${PluginsRoute.PLUGINS}/public/:id/events/:action`,
//     [
//         origin.checkDomain as RequestHandler,
//         origin.checkTenant as RequestHandler,
//         trimRequest.all as RequestHandler,
//         validator.actionsPlugin as RequestHandler
//     ],
//     controller.actionForPublic
// );

export default router;
