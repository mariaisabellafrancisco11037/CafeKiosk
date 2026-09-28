const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { makeRateLimit } = require('../middleware/securityRateLimit');

const loginLimiter = makeRateLimit({ windowMs: 10 * 60 * 1000, max: 12, message: 'Too many login attempts. Please wait before trying again.' });
const pinLimiter = makeRateLimit({ windowMs: 5 * 60 * 1000, max: 20, message: 'Too many PIN attempts. Please wait before trying again.' });
const recoveryLimiter = makeRateLimit({ windowMs: 15 * 60 * 1000, max: 8, message: 'Too many recovery attempts. Please wait before trying again.' });

router.get('/health', controller.health);
router.post('/login', loginLimiter, controller.login);
router.post('/admin-login', loginLimiter, (req, res, next) => {
  req.body = { ...req.body, role: 'Admin' };
  return controller.login(req, res, next);
});
router.post('/staff-login', loginLimiter, (req, res, next) => {
  req.body = { ...req.body, role: 'Staff' };
  return controller.login(req, res, next);
});
router.post('/manager-login', loginLimiter, (req, res, next) => {
  req.body = { ...req.body, role: 'Manager' };
  return controller.login(req, res, next);
});

// Secure registered-email password recovery. The request endpoint deliberately
// returns a generic success message so it does not reveal whether an email exists.
router.post('/forgot-password', recoveryLimiter, controller.requestPasswordReset);
router.get('/password-reset/validate', controller.validatePasswordReset);
router.post('/password-reset', recoveryLimiter, controller.resetPassword);

router.post('/signup/owner', controller.ownerSignup);
router.get('/invites/validate', controller.validateInvite);
router.post('/signup/staff', controller.staffSignup);
router.post('/invites', requireRole('Admin'), controller.createInvite);

// Database-backed user management. Status changes are audited and a
// deactivated account is force-logged-out from every connected device.
router.get('/users', requireRole('Admin'), controller.listUsers);
router.post('/users', requireRole('Admin'), controller.createUser);
router.patch('/users/:userId', requireRole('Admin'), controller.updateUser);
router.patch('/users/:userId/status', requireRole('Admin'), controller.updateUserStatus);

router.get('/me', verifyToken, controller.me);
router.post('/change-user-id', verifyToken, controller.changeUserId);
router.post('/change-password', verifyToken, controller.changePassword);
router.get('/approval-pin', verifyToken, controller.approvalPinStatus);
router.post('/approval-pin', verifyToken, controller.setApprovalPin);
router.post('/approval-pin/verify', pinLimiter, verifyToken, controller.verifyApprovalPin);
router.post('/logout', verifyToken, controller.logout);

module.exports = router;
