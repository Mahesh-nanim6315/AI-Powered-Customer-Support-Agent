import { Request, Response } from 'express';
import { z } from 'zod';
import { FileAttachmentService } from '../services/fileAttachment.service';
import { uuidSchema } from '../validators/common.validators';

const multer = require("multer") as {
  (options?: Record<string, unknown>): {
    single(fieldName: string): (req: Request, res: Response, next: (error?: unknown) => void) => void;
    array(fieldName: string, maxCount?: number): (req: Request, res: Response, next: (error?: unknown) => void) => void;
  };
  memoryStorage(): unknown;
};

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const messageIdParamsSchema = z.object({
  messageId: uuidSchema,
});

const fileIdParamsSchema = z.object({
  fileId: uuidSchema,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req: Request, file: UploadedFile, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

/**
 * File Attachment Controller
 */
export class FileAttachmentController {
  
  /**
   * Upload file to message
   */
  static async uploadFile(req: Request, res: Response) {
    try {
      const { messageId } = messageIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = (req as Request & { file?: UploadedFile }).file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Initialize upload directory
      await FileAttachmentService.initializeUploadDir();

      const result = await FileAttachmentService.uploadFile(
        file,
        messageId,
        userId,
        orgId
      );

      if (result.success && result.file) {
        res.json({
          success: true,
          file: result.file,
          message: 'File uploaded successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to upload file'
        });
      }
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      if (error.message?.includes('not allowed')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to upload file' });
    }
  }

  /**
   * Get attachments for a message
   */
  static async getMessageAttachments(req: Request, res: Response) {
    try {
      const { messageId } = messageIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const attachments = await FileAttachmentService.getMessageAttachments(messageId, userId);

      res.json({
        success: true,
        messageId,
        attachments,
        count: attachments.length
      });
    } catch (error: any) {
      console.error('Failed to get message attachments:', error);
      return res.status(500).json({ error: 'Failed to get attachments' });
    }
  }

  /**
   * Download file
   */
  static async downloadFile(req: Request, res: Response) {
    try {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const fileInfo = await FileAttachmentService.serveFile(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(fileInfo.filePath, fileInfo.filename);
    } catch (error: any) {
      console.error('Failed to download file:', error);
      return res.status(500).json({ error: 'Failed to download file' });
    }
  }

  /**
   * Delete file attachment
   */
  static async deleteFile(req: Request, res: Response) {
    try {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const success = await FileAttachmentService.deleteFile(fileId, userId, orgId);

      if (success) {
        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'File not found or access denied'
        });
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }

  /**
   * Get file statistics
   */
  static async getFileStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await FileAttachmentService.getFileStats(orgId, userId);

      res.json({
        success: true,
        stats,
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get file stats:', error);
      return res.status(500).json({ error: 'Failed to get file statistics' });
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(req: Request, res: Response) {
    try {
      const { fileId } = fileIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await FileAttachmentService.getFile(fileId, userId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        success: true,
        file
      });
    } catch (error: any) {
      console.error('Failed to get file info:', error);
      return res.status(500).json({ error: 'Failed to get file info' });
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(req: Request, res: Response) {
    try {
      const { messageId } = messageIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const files = ((req as Request & { files?: UploadedFile[] }).files || []) as UploadedFile[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Initialize upload directory
      await FileAttachmentService.initializeUploadDir();

      const uploadPromises = files.map(file => 
        FileAttachmentService.uploadFile(file, messageId, userId, orgId)
      );

      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        uploaded: successful.length,
        failed: failed.length,
        files: successful.map(r => r.file),
        errors: failed.map(r => r.error),
        message: `Uploaded ${successful.length} of ${files.length} files successfully`
      });
    } catch (error: any) {
      console.error('Failed to upload multiple files:', error);
      return res.status(500).json({ error: 'Failed to upload files' });
    }
  }
}

// Export upload middleware for use in routes
export const uploadMiddleware = upload.single('file');
export const uploadMultipleMiddleware = upload.array('files', 5); // Max 5 files
