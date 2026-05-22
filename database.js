const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedDatabase() {
  // Seed default site settings
  const defaults = [
    ['church_name',            "A.M.E. ST. Joseph Church"],
    ['tagline',                'Walking in Faith, Serving in Love'],
    ['address',                'Cnr of Bougaard and, Kearns St, Rabiesdale, Paarl, 7646'],
    ['phone',                  '(000) 000-0000'],
    ['email',                  'info@amestjosephs.org'],
    ['service_sunday_school',  '9:00 AM'],
    ['service_sunday_morning', '11:00 AM'],
    ['service_wednesday',      '7:00 PM'],
    ['facebook_url',           ''],
    ['youtube_url',            ''],
    ['about_text',             "A.M.E. ST. Joseph Church is a proud congregation of the African Methodist Episcopal Church, one of the oldest and most historic Black denominations in the United States. Founded on the principles of freedom, justice, and the love of God, we are committed to nurturing spiritual growth, serving our community, and uplifting our members through faith, education, and action."],
    ['pastor_name',            'Pastor Name'],
    ['pastor_bio',             'Our pastor leads our congregation with wisdom, compassion, and a deep commitment to the Gospel.'],
    ['founded_year',           ''],
  ];

  for (const [key, value] of defaults) {
    await supabase.from('church_site_settings').upsert({ key, value }, { onConflict: 'key', ignoreDuplicates: true });
  }

  // Seed default super_admin if no users exist
  const { data: users, error: usersError } = await supabase.from('church_users').select('id').limit(1);
  if (usersError) console.error('DB check failed (is schema.sql applied?):', usersError.message);
  if (!users || users.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    const { error: insertError } = await supabase.from('church_users').insert({ username: 'admin', password: hash, role: 'super_admin' });
    if (insertError) console.error('Failed to create admin user:', insertError.message);
    else console.log('Default admin created: username=admin, password=admin123');
  }

}

module.exports = { supabase, seedDatabase };
