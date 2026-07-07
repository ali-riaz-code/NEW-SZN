require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const SLACK_POST_URL = 'https://slack.com/api/chat.postMessage';
const SLACK_LOOKUP_URL = 'https://slack.com/api/users.lookupByEmail';

async function testResolveSlackUserId(userId, email) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('SLACK_BOT_TOKEN not set');
    process.exit(1);
  }

  console.log('\n=== 1. USERS.LOOKUPEMAIL REQUEST ===\n');
  const lookupUrl = new URL(SLACK_LOOKUP_URL);
  lookupUrl.searchParams.set('email', email);
  console.log(`URL: ${lookupUrl.toString()}`);
  console.log(`Auth: Bearer ${token.slice(0, 20)}...`);

  try {
    const res = await fetch(lookupUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    console.log('\n=== 2. USERS.LOOKUPEMAIL RESPONSE ===\n');
    console.log(JSON.stringify(data, null, 2));

    if (!data.ok || !data.user?.id) {
      console.error('\n❌ Lookup failed:', data.error);
      return null;
    }

    const slackUserId = data.user.id;
    console.log('\n✓ Resolved Slack user ID:', slackUserId);
    return slackUserId;
  } catch (err) {
    console.error('Fetch error:', err.message);
    return null;
  }
}

async function testSendSlackDM(slackUserId, message) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('SLACK_BOT_TOKEN not set');
    return false;
  }

  console.log('\n=== 3. CHAT.POSTMESSAGE REQUEST ===\n');
  console.log(`URL: ${SLACK_POST_URL}`);
  console.log(`Method: POST`);
  console.log(`Auth: Bearer ${token.slice(0, 20)}...`);

  const payload = {
    channel: slackUserId,
    text: message,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🧪 Test DM', emoji: true },
      },
      { type: 'section', text: { type: 'mrkdwn', text: message } },
    ],
  };
  console.log('\nPayload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(SLACK_POST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    console.log('\n=== 4. CHAT.POSTMESSAGE RESPONSE ===\n');
    console.log(JSON.stringify(data, null, 2));

    if (!data.ok) {
      console.error('\n❌ Message send failed:', data.error);
      return false;
    }

    console.log('\n✓ Message posted successfully');
    console.log(`  Channel: ${data.channel}`);
    console.log(`  Timestamp: ${data.ts}`);
    return true;
  } catch (err) {
    console.error('Fetch error:', err.message);
    return false;
  }
}

(async () => {
  const userId = 'cmr2d46s3000013fx4gx44o5f';
  const email = 'admin@newsznagency.com';

  console.log(`\n========================================`);
  console.log(`Testing Slack DM Resolution & Delivery`);
  console.log(`========================================\n`);
  console.log(`User: ${email}`);
  console.log(`User ID: ${userId}\n`);

  const slackUserId = await testResolveSlackUserId(userId, email);

  if (slackUserId) {
    const testMsg = `🧪 Test DM from NEW SZN app — testing Slack integration (sent ${new Date().toISOString()})`;
    await testSendSlackDM(slackUserId, testMsg);
  } else {
    console.log(
      '\n❌ Could not resolve Slack user ID — stopping here.\n' +
      '   Check that:\n' +
      '   1. SLACK_BOT_TOKEN in .env is valid\n' +
      '   2. Bot has users:read.email scope\n' +
      `   3. Email ${email} has a Slack account in the workspace`
    );
  }

  process.exit(0);
})().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
