import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from './mongodb';
import { User } from '../models';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/auth' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
        type:     { label: 'Type',     type: 'text' },
      },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials?.email?.toLowerCase() });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials?.password ?? '', user.password);
        if (!ok) return null;
        if (credentials?.type && user.type !== credentials.type) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
          type: user.type,
          salonId: user.salonId?.toString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.type    = (user as any).type;
        token.salonId = (user as any).salonId;
        token.userId  = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).type    = token.type;
      (session.user as any).salonId = token.salonId;
      (session.user as any).id      = token.userId;
      return session;
    },
  },
};
