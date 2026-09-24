const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/health', controller.health);
router.post('/login', controller.login);
router.post('/admin-login', (req, res, next) => {
  req.body = { ...req.body, role: 'Admin' };
  return controller.login(req, res, next);
});
router.post('/staff-login', (req, res, next) => {
  req.body = { ...req.body, role: 'Staff' };
  return controller.login(req, res, next);
});
router.post('/manager-login', (req, res, next) => {
  req.body = { ...req.body, role: 'Manager' };
  return controller.login(req, res, next);
});

// Secure registered-email password recovery. The request endpoint deliberately
// returns a generic success message so it does not reveal whether an email exists.
router.post('/forgot-password', controller.requestPasswordReset);
router.get('/password-reset/validate', controller.validatePasswordReset);
router.post('/password-reset', controller.resetPassword);

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
router.post('/change-password', verifyToken, controller.changePassword);
router.get('/approval-pin', verifyToken, controller.approvalPinStatus);
router.post('/approval-pin', verifyToken, controller.setApprovalPin);
router.post('/logout', verifyToken, controller.logout);

module.exports = router;
