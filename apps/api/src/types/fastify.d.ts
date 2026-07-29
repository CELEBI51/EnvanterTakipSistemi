import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    /** Korumali route'larda `preHandler: app.authenticate` olarak kullanilir. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: number;
      username: string;
      /** mustChangePassword — token'da tasinir ki her istekte DB'ye gidilmesin. */
      mcp: boolean;
    };
    user: {
      sub: number;
      username: string;
      mcp: boolean;
      iat: number;
      exp: number;
    };
  }
}
