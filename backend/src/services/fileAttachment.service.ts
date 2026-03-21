import { Request } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuditService } from './audit.service';

export interface FileAttachment {
  id: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface UploadResult {
  success: boolean;
  file?: FileAttachment;
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * File Attachment Service - Handle file uploads and management
 */
export class FileAttachmentService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = [
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

  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads');

  /**
   * Initialize upload directory
   */
  static async initializeUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Validate file upload
   */
  static validateFile(file: Express.Multer.File): FileValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        maxSize: this.MAX_FILE_SIZE
      };
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `File type ${file.mimetype} is not allowed`,
        allowedTypes: this.ALLOWED_MIME_TYPES
      };
    }

    return { isValid: true };
  }

  /**
   * Upload file and create attachment record
   */
  static async uploadFile(
    file: Express.Multer.File,
    messageId: string,
    uploadedBy: string,
    orgId: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.UPLOAD_DIR, uniqueFilename);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Create file attachment record
      const attachment = await prisma.fileAttachment.create({
        data: {
          messageId,
          filename: uniqueFilename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/${uniqueFilename}`,
          uploadedBy
        }
      });

      // Log file upload activity
      await AuditService.logUserActivity({
        userId: uploadedBy,
        orgId,
        action: 'MESSAGE_SENT', // Using existing action type
        resourceType: 'FILE_ATTACHMENT',
        resourceId: attachment.id,
        details: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          messageId
        }
      });

      return {
        success: true,
        file: attachment
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      return {
        success: false,
        error: 'Failed to upload file'
      };
    }
  }

  /**
   * Get file attachments for a message
   */
  static async getMessageAttachments(messageId: string, userId: string): Promise<FileAttachment[]> {
    try {
      const attachments = await prisma.fileAttachment.findMany({
        where: {
          messageId,
          message: {
            ticket: {
              OR: [
                { createdByUserId: userId },
                { customer: { userId } },
                { assignedAgent: { userId } }
              ]
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return attachments;
    } catch (error) {
      console.error('Failed to get message attachments:', error);
      return [];
    }
  }

  /**
   * Get file by ID
   */
  static async getFile(fileId: string, userId: string): Promise<FileAttachment | null> {
    try {
      const file = await prisma.fileAttachment.findFirst({
        where: {
          id: fileId,
          message: {
            ticket: {
              OR: [
                { createdByUserId: userId },
                { customer: { userId } },
                { assignedAgent: { userId } }
              ]
            }
          }
        }
      });

      return file;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  /**
   * Delete file attachment
   */
  static async deleteFile(fileId: string, userId: string, orgId: string): Promise<boolean> {
    try {
      const file = await prisma.fileAttachment.findFirst({
        where: {
          id: fileId,
          uploadedBy: userId // Only allow uploader to delete
        }
      });

      if (!file) {
        return false;
      }

      // Delete file from disk
      const filePath = path.join(this.UPLOAD_DIR, file.filename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Failed to delete file from disk:', error);
      }

      // Delete database record
      await prisma.fileAttachment.delete({
        where: { id: fileId }
      });

      // Log file deletion
      await AuditService.logUserActivity({
        userId,
        orgId,
        action: 'MESSAGE_SENT', // Using existing action type
        resourceType: 'FILE_ATTACHMENT',
        resourceId: fileId,
        details: {
          originalName: file.originalName,
          deleted: true
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get file statistics for an organization
   */
  static async getFileStats(orgId: string, userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentFiles: FileAttachment[];
  }> {
    try {
      // Get total files and size
      const stats = await prisma.fileAttachment.aggregate({
        where: {
          message: {
            ticket: {
              orgId,
              OR: [
                { createdByUserId: userId },
                { customer: { userId } },
                { assignedAgent: { userId } }
              ]
            }
          }
        },
        _count: {
          id: true
        },
        _sum: {
          size: true
        }
      });

      // Get files by type
      const filesByType = await prisma.$queryRaw`
        SELECT "mimeType", COUNT(*) as count
        FROM "FileAttachment" fa
        JOIN "TicketMessage" tm ON fa."messageId" = tm.id
        JOIN "Ticket" t ON tm."ticketId" = t.id
        WHERE t."orgId" = ${orgId}
        AND (
          t."createdByUserId" = ${userId}
          OR t."customerId" IN (SELECT id FROM "Customer" WHERE "userId" = ${userId})
          OR t."assignedAgentId" IN (SELECT id FROM "Agent" WHERE "userId" = ${userId})
        )
        GROUP BY "mimeType"
      ` as { mimeType: string; count: number }[];

      // Get recent files
      const recentFiles = await prisma.fileAttachment.findMany({
        where: {
          message: {
            ticket: {
              orgId,
              OR: [
                { createdByUserId: userId },
                { customer: { userId } },
                { assignedAgent: { userId } }
              ]
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      const fileTypeStats: Record<string, number> = {};
      filesByType.forEach(item => {
        fileTypeStats[item.mimeType] = item.count;
      });

      return {
        totalFiles: stats._count.id || 0,
        totalSize: stats._sum.size || 0,
        filesByType: fileTypeStats,
        recentFiles
      };
    } catch (error) {
      console.error('Failed to get file stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        recentFiles: []
      };
    }
  }

  /**
   * Cleanup old files (older than 90 days)
   */
  static async cleanupOldFiles(daysToKeep: number = 90): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Get old files
      const oldFiles = await prisma.fileAttachment.findMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      let deletedCount = 0;
      let freedSpace = 0;

      // Delete files from disk and database
      for (const file of oldFiles) {
        try {
          // Delete from disk
          const filePath = path.join(this.UPLOAD_DIR, file.filename);
          await fs.unlink(filePath);
          freedSpace += file.size;
        } catch (error) {
          console.warn(`Failed to delete file ${file.filename} from disk:`, error);
        }

        // Delete from database
        await prisma.fileAttachment.delete({
          where: { id: file.id }
        });
        deletedCount++;
      }

      return {
        deletedCount,
        freedSpace
      };
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return {
        deletedCount: 0,
        freedSpace: 0
      };
    }
  }

  /**
   * Serve file for download
   */
  static async serveFile(fileId: string, userId: string): Promise<{
    filePath: string;
    filename: string;
    mimeType: string;
  } | null> {
    try {
      const file = await this.getFile(fileId, userId);
      
      if (!file) {
        return null;
      }

      const filePath = path.join(this.UPLOAD_DIR, file.filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null;
      }

      return {
        filePath,
        filename: file.originalName,
        mimeType: file.mimeType
      };
    } catch (error) {
      console.error('Failed to serve file:', error);
      return null;
    }
  }
}
