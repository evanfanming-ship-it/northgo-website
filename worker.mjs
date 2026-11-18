import { enquiryApi, securityHeaders } from './enquiry-api.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!env.DB || !env.LOGIN_LIMIT || !env.ENQUIRY_LIMIT) {
        return Response.json({ error:'service_unavailable' }, { status:503, headers:securityHeaders });
      }
      const key = request.headers.get('CF-Connecting-IP') || 'local';
      return enquiryApi(request, {
        db: env.DB,
        password: env.ADMIN_PASSWORD,
        adminUsername: env.ADMIN_USERNAME || 'admin',
        origin: url.origin,
        allow: async kind => {
          const limiter = kind === 'login' ? env.LOGIN_LIMIT : env.ENQUIRY_LIMIT;
          const { success } = await limiter.limit({ key: 'northgo:' + key });
          return success;
        },
      });
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status:405 });
    if (url.pathname === '/') url.pathname = '/index.html';
    if (url.pathname === '/admin' || url.pathname === '/admin/') url.pathname = '/admin.html';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
