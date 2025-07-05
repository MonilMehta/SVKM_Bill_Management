import express from 'express';
import { multerUpload } from '../utils/multer.js';
import { authenticate, authorize } from '../middleware/middleware.js';
import {
    updateBillAttachments,
    deleteBillAttachment,
    getBillAttachments
} from '../controllers/billattachment-controller.js';

const router = express.Router();

router.use(authenticate);

router.put('/:id/attachments',multerUpload.array('files', 15),updateBillAttachments);

router.delete('/:id/attachments/:fileKey',authorize('admin', 'site_officer'),deleteBillAttachment);

router.get('/:id/attachments',getBillAttachments);

export default router;
