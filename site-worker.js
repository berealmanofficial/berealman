/** Freebuff Sites worker — serves the built SPA with assets; SPA routing via spa:true */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
