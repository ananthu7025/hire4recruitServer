import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/companyService';
import { logger } from '../config/logger';

export class CompanyController {
  // Get current company information
  static async getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { company, stats } = await CompanyService.getCompanyWithStats(req.user.companyId);

      res.status(200).json({
        success: true,
        data: {
          company: {
            id: company._id,
            name: company.name,
            domain: company.domain,
            industry: company.industry,
            size: company.size,
            address: company.address,
            phone: company.phone,
            website: company.website,
            settings: company.settings,
            subscription: company.subscription,
            primaryContact: company.primaryContact,
            isActive: company.isActive,
            isVerified: company.isVerified,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
          },
          stats
        }
      });

    } catch (error) {
      logger.error('Get company error:', error);

      res.status(500).json({
        error: 'Failed to get company information',
        message: 'An error occurred while fetching company data'
      });
    }
  }

  // Update company information
  static async updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const updates = req.body;
      const updatedCompany = await CompanyService.updateCompany(
        req.user.companyId,
        updates,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: {
          company: {
            id: updatedCompany._id,
            name: updatedCompany.name,
            domain: updatedCompany.domain,
            industry: updatedCompany.industry,
            size: updatedCompany.size,
            address: updatedCompany.address,
            phone: updatedCompany.phone,
            website: updatedCompany.website,
            settings: updatedCompany.settings,
            updatedAt: updatedCompany.updatedAt
          }
        }
      });

    } catch (error) {
      logger.error('Update company error:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: 'Update failed',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update company',
        message: 'An error occurred while updating company information'
      });
    }
  }

  // Get company statistics
  static async getCompanyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { stats } = await CompanyService.getCompanyWithStats(req.user.companyId);

      res.status(200).json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Get company stats error:', error);

      res.status(500).json({
        error: 'Failed to get company statistics',
        message: 'An error occurred while fetching company statistics'
      });
    }
  }

  // Get company users
  static async getCompanyUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        role: req.query.role as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string
      };

      const result = await CompanyService.getCompanyUsers(req.user.companyId, options);

      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            currentPage: options.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Get company users error:', error);

      res.status(500).json({
        error: 'Failed to get company users',
        message: 'An error occurred while fetching company users'
      });
    }
  }

  // Update subscription
  static async updateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const subscriptionData = req.body;
      const updatedCompany = await CompanyService.updateSubscription(
        req.user.companyId,
        subscriptionData,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          subscription: updatedCompany.subscription
        }
      });

    } catch (error) {
      logger.error('Update subscription error:', error);

      res.status(500).json({
        error: 'Failed to update subscription',
        message: 'An error occurred while updating the subscription'
      });
    }
  }

  // Check subscription limits
  static async checkSubscriptionLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const limits = await CompanyService.checkSubscriptionLimits(req.user.companyId);

      res.status(200).json({
        success: true,
        data: { limits }
      });

    } catch (error) {
      logger.error('Check subscription limits error:', error);

      res.status(500).json({
        error: 'Failed to check subscription limits',
        message: 'An error occurred while checking subscription limits'
      });
    }
  }

  // Get activity summary
  static async getActivitySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      const activity = await CompanyService.getActivitySummary(req.user.companyId, days);

      res.status(200).json({
        success: true,
        data: {
          activity,
          period: `${days} days`
        }
      });

    } catch (error) {
      logger.error('Get activity summary error:', error);

      res.status(500).json({
        error: 'Failed to get activity summary',
        message: 'An error occurred while fetching activity summary'
      });
    }
  }

  // Deactivate company (Admin only)
  static async deactivateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      await CompanyService.deactivateCompany(req.user.companyId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Company deactivated successfully'
      });

    } catch (error) {
      logger.error('Deactivate company error:', error);

      res.status(500).json({
        error: 'Failed to deactivate company',
        message: 'An error occurred while deactivating the company'
      });
    }
  }

  // Reactivate company (Admin only)
  static async reactivateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      await CompanyService.reactivateCompany(req.user.companyId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Company reactivated successfully'
      });

    } catch (error) {
      logger.error('Reactivate company error:', error);

      res.status(500).json({
        error: 'Failed to reactivate company',
        message: 'An error occurred while reactivating the company'
      });
    }
  }
}