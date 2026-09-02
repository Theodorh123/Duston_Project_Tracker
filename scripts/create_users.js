const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_E4nC9DSguaZJ@ep-raspy-mode-za8p2eep-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({ connectionString });
  await client.connect();

  const defaultPassword = 'Duston@123!';
  const hash = await bcrypt.hash(defaultPassword, 10);

  const usersList = [
    {
      name: 'Elton K. Dusi',
      email: 'elton.dusi@moslafrica.com',
      role: 'ceo'
    },
    {
      name: 'Theophilus Dorh',
      email: 't.dorh@dustongroup.com',
      role: 'ea'
    },
    {
      name: 'William N. Adjabeng',
      email: 'william.adjabeng@moslafrica.com',
      role: 'hod',
      oldEmail: 'william.adjabeng@moslgh.com'
    },
    {
      name: 'Desmond Ohene-Asante',
      email: 'desmond.oheneasante@moslafrica.com',
      role: 'hod'
    },
    {
      name: 'Gabriel Nomotsu Teye-Ali',
      email: 'g.teye-ali@dustongroup.com',
      role: 'hod'
    },
    {
      name: 'Michael K. Duku',
      email: 'michael.duku@moslafrica.com',
      role: 'hod'
    },
    {
      name: 'Benjamin Arthur',
      email: 'benjamin.arthur@moslafrica.com',
      role: 'hod'
    },
    {
      name: 'Wencelav Safrega',
      email: 'wsafrega@gmail.com',
      role: 'hod'
    }
  ];

  for (const u of usersList) {
    const cleanEmail = u.email.toLowerCase().trim();

    // If there is an old email to migrate
    if (u.oldEmail) {
      const oldCheck = await client.query('SELECT id FROM users WHERE email = $1', [u.oldEmail]);
      if (oldCheck.rows.length > 0) {
        await client.query(
          'UPDATE users SET name = $1, email = $2, role = $3, password_hash = $4, has_global_access = true, is_active = true, updated_at = NOW() WHERE email = $5',
          [u.name, cleanEmail, u.role, hash, u.oldEmail]
        );
        console.log(`Migrated user ${u.oldEmail} -> ${cleanEmail} (${u.name}) as [${u.role}] with Global Access`);
        continue;
      }
    }

    // Check if user already exists by current email
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE users SET name = $1, role = $2, password_hash = $3, has_global_access = true, is_active = true, updated_at = NOW() WHERE email = $4',
        [u.name, u.role, hash, cleanEmail]
      );
      console.log(`Updated user: ${cleanEmail} (${u.name}) to role [${u.role}] with Global Access`);
    } else {
      const res = await client.query(
        'INSERT INTO users (name, email, role, password_hash, has_global_access, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, true, NOW(), NOW()) RETURNING id',
        [u.name, cleanEmail, u.role, hash]
      );
      const newId = res.rows[0].id;
      await client.query(
        'INSERT INTO user_preferences (user_id, default_view, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING',
        [newId, 'todo']
      );
      console.log(`Created user: ${u.name} <${cleanEmail}> [Role: ${u.role}] with Global Access (ID: ${newId})`);
    }
  }

  // Also ensure any existing demo accounts have role 'hod' and global access if not ceo, ea, or admin
  await client.query(
    "UPDATE users SET role = 'hod', has_global_access = true WHERE role NOT IN ('ceo', 'ea', 'admin')"
  );

  const all = await client.query('SELECT id, name, email, role, has_global_access, is_active FROM users ORDER BY name');
  console.log('\nAll users in database:');
  console.table(all.rows);

  await client.end();
}

main().catch((err) => {
  console.error('Error updating users:', err);
  process.exit(1);
});
