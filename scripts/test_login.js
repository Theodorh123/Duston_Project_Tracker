const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function test() {
  const connectionString = 'postgresql://neondb_owner:npg_E4nC9DSguaZJ@ep-raspy-mode-za8p2eep-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({ connectionString });
  await client.connect();

  const testEmails = [
    'elton.dusi@moslafrica.com',
    't.dorh@dustongroup.com',
    'william.adjabeng@moslgh.com',
    'desmond.oheneasante@moslafrica.com'
  ];

  for (const email of testEmails) {
    const res = await client.query('SELECT name, password_hash, role FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      console.log(`User ${email} not found!`);
      continue;
    }
    const user = res.rows[0];
    const match = await bcrypt.compare('Duston@123!', user.password_hash);
    console.log(`Verified ${user.name} (${email}): Role = ${user.role}, Password Match = ${match}`);
  }

  await client.end();
}

test().catch(console.error);
