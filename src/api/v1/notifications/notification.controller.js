import notificationService from "./notification.service.js";

async function getNotificationByTags(req, res) {
  if (!req.query.tags) res.status(404).json({ message: "Not found, tags is required" });
  const notifications = await notificationService.getNotificationByTags(req.query.tags);
  res.status(200).json(notifications);
}

async function getCustomerNotificationByLineId(req, res) {
  const nofitifications = await notificationService.getCustomerNotificationByLineId(req.params.line_user_id);
  res.status(200).json(nofitifications);
}

export default { getNotificationByTags, getCustomerNotificationByLineId };
