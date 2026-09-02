const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function test() {
  const connectionString = 'postgresql://neondb_owner:npg_E4nC9DSguaZJ@ep-raspy-mode-za8p2eep-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({ connectionString });
  await client.connect();

  const testEmails = [
    'elton.dusi@moslafrica.com',
    't.dorh@dustongroup.com',
    'william.adjabeng@moslafrica.com',
    'desmond.oheneasante@moslafrica.com',
    'g.teye-ali@dustongroup.com',
    'michael.duku@moslafrica.com',
    'benjamin.arthur@moslafrica.com',
    'wsafrega@gmail.com'
  ];

  for (const email of testEmails) {
    const res = await client.query('SELECT name, password_hash, role, has_global_access FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      console.log(`User ${email} not found!`);
      continue;
    }
    const user = res.rows[0];
    const match = await bcrypt.compare('Duston@123!', user.password_hash);
    console.log(`Verified ${user.name} (${email}): Role = ${user.role}, Global Access = ${user.has_global_access}, Password Match = ${match}`);
  }

  await client.end();
}

test().catch(console.error);
