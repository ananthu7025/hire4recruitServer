import { IEmployee } from '../models/Employee';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        companyId: string;
        email: string;
        role: string;
        permissions?: {
          jobs: {
            create: boolean;
            read: boolean;
            update: boolean;
            delete: boolean;
          };
          candidates: {
            create: boolean;
            read: boolean;
            update: boolean;
            delete: boolean;
          };
          interviews: {
            create: boolean;
            read: boolean;
            update: boolean;
            delete: boolean;
          };
          assessments: {
            create: boolean;
            read: boolean;
            update: boolean;
            delete: boolean;
          };
          employees: {
            create: boolean;
            read: boolean;
            update: boolean;
            delete: boolean;
          };
          settings: {
            read: boolean;
            update: boolean;
          };
        };
        userData?: IEmployee;
      };
      validatedData?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}