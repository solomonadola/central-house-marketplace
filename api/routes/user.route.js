import express from 'express';
import { deleteUser, test, updateUser,  getUserListings, getUser} from '../controllers/user.controller.js';
import { verifyToken } from '../utils/verifyUser.js';
import { validateObjectId } from '../utils/validateObjectId.js';
import { validate } from '../validation/validate.js';
import { updateUserSchema } from '../validation/schemas.js';


const router = express.Router();

router.param('id', validateObjectId);

router.get('/test', test);
router.post('/update/:id', verifyToken, validate(updateUserSchema), updateUser)
router.delete('/delete/:id', verifyToken, deleteUser)
router.get('/listings/:id', verifyToken, getUserListings)
router.get('/:id', verifyToken, getUser)

export default router;