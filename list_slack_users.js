require('dotenv').config();

const SLACK_USERS_LIST_URL = 'https://slack.com/api/users.list';

async function listSlackUsers() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('SLACK_BOT_TOKEN not set');
    process.exit(1);
  }

  console.log('\n=== SLACK USERS.LIST REQUEST ===\n');
  console.log(`URL: ${SLACK_USERS_LIST_URL}`);
  console.log(`Auth: Bearer ${token.slice(0, 20)}...\n`);

  try {
    const res = await fetch(SLACK_USERS_LIST_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    console.log('=== RESPONSE ===\n');
    if (!data.ok) {
      console.error('Error:', data.error);
      process.exit(1);
    }

    console.log(`Found ${data.members.length} users in workspace:\n`);

    const members = data.members
      .filter(m => !m.is_bot && m.profile && m.profile.email)
      .sort((a, b) => a.profile.email.localeCompare(b.profile.email));

    members.forEach(m => {
      console.log(`  • ${m.real_name || m.name}`);
      console.log(`    Email: ${m.profile.email}`);
      console.log(`    Slack ID: ${m.id}`);
      console.log(`    Active: ${m.deleted ? 'NO (deleted)' : 'YES'}\n`);
    });

  } catch (err) {
    console.error('Fetch error:', err.message);
    process.exit(1);
  }
}

listSlackUsers();
