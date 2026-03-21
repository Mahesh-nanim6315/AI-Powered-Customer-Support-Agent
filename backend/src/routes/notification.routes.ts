import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { allowRoles } from "../middlewares/role.middleware";
import { NotificationController } from "../controllers/notification.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", allowRoles("CUSTOMER"), NotificationController.getNotifications);
router.get("/unread-count", allowRoles("CUSTOMER"), NotificationController.getUnreadCount);
router.get("/stats", allowRoles("CUSTOMER"), NotificationController.getNotificationStats);
router.patch("/:notificationId/read", allowRoles("CUSTOMER"), NotificationController.markAsRead);
router.post("/read-all", allowRoles("CUSTOMER"), NotificationController.markAllAsRead);
router.delete("/:notificationId", allowRoles("CUSTOMER"), NotificationController.deleteNotification);

router.post("/", allowRoles("ADMIN"), NotificationController.createNotification);

export default router;
