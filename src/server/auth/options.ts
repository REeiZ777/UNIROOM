import type { Role } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/server/db/client";
import { verifyPassword } from "../security/password";

const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  throw new Error(
    "AUTH_SECRET est requis. Merci de le definir dans vos variables d'environnement.",
  );
}

const useSecureCookies = process.env.NODE_ENV === "production";

const credentialsLabels = {
  email: "Adresse e-mail",
  password: "Mot de passe",
} as const;

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  jwt: {
    maxAge: 60 * 60 * 8,
    secret: AUTH_SECRET,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Identifiants",
      credentials: {
        email: {
          label: credentialsLabels.email,
          type: "text",
          placeholder: "admin@uniroom.school",
        },
        password: {
          label: credentialsLabels.password,
          type: "password",
          placeholder: "********",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password.trim();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }

      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
};
