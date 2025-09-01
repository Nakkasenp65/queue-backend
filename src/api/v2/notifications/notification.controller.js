import notificationService from "./notification.service.js";

const createNotification = async (req, res) => {
  const payload = req.body;
  const notification = await notificationService.createNotification(payload);
  res.status(201).json({ id: notification });
};

export default { createNotification };
