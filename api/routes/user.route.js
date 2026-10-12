import express from 'express';
import {
  deleteUser,
  test,
  updateUser,
  getUserListings,
  getUser,
  getFavorites,
  addFavorite,
  removeFavorite,
  getPreferences,
  updatePreferences,
  getPublicProfile,
  setTwoFactor,
  getOwnerResponseStats,
} from '../controllers/user.controller.js';
import { exportMyAnalytics, getMyAnalytics } from '../controllers/analytics.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { blockUser, getBlockStatus, listBlocked, unblockUser } from '../controllers/block.controller.js';
import { exportMyData } from '../controllers/dataExport.controller.js';
import { authLimiter, emailLimiter } from '../utils/rateLimit.js';
import { setTwoFactorSchema, updatePreferencesSchema, updateUserSchema } from '../validation/schemas.js';


const router = express.Router();

router.param('id', validateObjectId);

router.get('/test', test);
router.post('/update/:id', verifyToken, validate(updateUserSchema), updateUser)
router.delete('/delete/:id', verifyToken, deleteUser)
router.get('/listings/:id', verifyToken, getUserListings)
router.get('/analytics', verifyToken, getMyAnalytics)
router.get('/analytics/export', verifyToken, exportMyAnalytics)
router.get('/favorites', verifyToken, getFavorites)
router.put('/favorites/:id', verifyToken, addFavorite)
router.delete('/favorites/:id', verifyToken, removeFavorite)
// Rate-limited: an export reads every collection for the user.
router.get('/export', verifyToken, emailLimiter, exportMyData)
router.get('/blocks', verifyToken, listBlocked)
router.get('/blocks/:id', verifyToken, getBlockStatus)
router.put('/blocks/:id', verifyToken, blockUser)
router.delete('/blocks/:id', verifyToken, unblockUser)
router.post('/two-factor', verifyToken, authLimiter, validate(setTwoFactorSchema), setTwoFactor)
router.get('/preferences', verifyToken, getPreferences)
router.patch('/preferences', verifyToken, validate(updatePreferencesSchema), updatePreferences)
// Public: a seller's profile and active listings.
router.get('/public/:id', getPublicProfile)
router.get('/public/:id/response-stats', getOwnerResponseStats)
// Must stay last: '/:id' would otherwise match '/favorites'.
router.get('/:id', verifyToken, getUser)

export default router;