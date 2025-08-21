import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number;
        username: string;
        email: string;
        role: string;
        full_name: string;
        avatar_url?: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        last_login_at?: string;
      };
    }
  }
}