import { Router } from 'express';
import { FileAttachmentController, uploadMiddleware, uploadMultipleMiddleware } from '../controllers/fileAttachment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Upload single file to message
router.post('/messages/:messageId/files', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  uploadMiddleware,
  FileAttachmentController.uploadFile
);

// Upload multiple files to message
router.post('/messages/:messageId/files/multiple', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  uploadMultipleMiddleware,
  FileAttachmentController.uploadMultipleFiles
);

// Get attachments for a message
router.get('/messages/:messageId/files', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  FileAttachmentController.getMessageAttachments
);

// Download file
router.get('/files/:fileId/download', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  FileAttachmentController.downloadFile
);

// Get file info
router.get('/files/:fileId', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  FileAttachmentController.getFileInfo
);

// Delete file attachment
router.delete('/files/:fileId', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  FileAttachmentController.deleteFile
);

// Get file statistics
router.get('/files/stats', 
  allowRoles(['ADMIN', 'AGENT']),
  FileAttachmentController.getFileStats
);

export default router;
