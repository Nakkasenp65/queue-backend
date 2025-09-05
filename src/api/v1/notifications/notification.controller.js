import notificationService from "./notification.service.js";

async function getNotificationByTags(req, res) {
  const { tags } = req.query;
  if (!req.query.tags) res.status(404).json({ message: "Not found, tags is required" });
  const notifications = await notificationService.getNotificationByTags(tags);
  res.status(200).json(notifications);
}

async function getCustomerNotificationByLineId(req, res) {
  const { line_user_id } = req.params;
  const nofitifications = await notificationService.getCustomerNotificationByLineId(line_user_id);
  res.status(200).json(nofitifications);
}

export default { getNotificationByTags, getCustomerNotificationByLineId };
