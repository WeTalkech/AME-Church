const session = require('express-session');

class SupabaseStore extends session.Store {
  constructor(supabase) {
    super();
    this.supabase = supabase;
    setInterval(() => this._pruneExpired(), 15 * 60 * 1000).unref();
  }

  async get(sid, callback) {
    try {
      const { data, error } = await this.supabase
        .from('church_session').select('sess, expire').eq('sid', sid).single();
      if (error || !data) return callback(null, null);
      if (new Date(data.expire) < new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }
      callback(null, typeof data.sess === 'string' ? JSON.parse(data.sess) : data.sess);
    } catch (err) {
      console.error('SupabaseStore.get error:', err.message);
      callback(null, null);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie?.maxAge || 28800000;
      const expire = new Date(Date.now() + maxAge).toISOString();
      const { error } = await this.supabase.from('church_session')
        .upsert({ sid, sess: sessionData, expire }, { onConflict: 'sid' });
      if (error) {
        console.error('SupabaseStore.set error:', error.message, error.code);
        return callback(new Error(error.message));
      }
      callback(null);
    } catch (err) {
      console.error('SupabaseStore.set exception:', err.message);
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.supabase.from('church_session').delete().eq('sid', sid);
      callback(null);
    } catch (err) { callback(err); }
  }

  async touch(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie?.maxAge || 28800000;
      const expire = new Date(Date.now() + maxAge).toISOString();
      await this.supabase.from('church_session').update({ expire }).eq('sid', sid);
      callback(null);
    } catch (err) { callback(null); }
  }

  async _pruneExpired() {
    await this.supabase.from('church_session').delete().lt('expire', new Date().toISOString());
  }
}

module.exports = SupabaseStore;
