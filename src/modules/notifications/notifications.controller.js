const notificationsService = require('./notifications.service');
const { sendSuccess } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { unreadOnly, limit, offset } = req.query;
  const { notifications, unreadCount, total } = await notificationsService.listMyNotifications(req.user.id, {
    unreadOnly,
    limit,
    offset,
  });
  sendSuccess(res, { data: notifications, meta: { unreadCount, total, limit, offset } });
});

const markRead = asyncHandler(async (req, res) => {
  await notificationsService.markRead(req.params.id, req.user.id);
  sendSuccess(res, { message: 'Notification marked as read' });
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationsService.markAllRead(req.user.id);
  sendSuccess(res, { message: 'All notifications marked as read' });
});

module.exports = { list, markRead, markAllRead };
