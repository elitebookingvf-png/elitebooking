import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      type: 'client' | 'pro';
      salonId?: string;
    };
  }
  interface User {
    id: string;
    type: 'client' | 'pro';
    salonId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    type: 'client' | 'pro';
    salonId?: string;
  }
}
