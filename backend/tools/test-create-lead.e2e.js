/* Simple E2E probe to verify create-lead works for center-manager */
const base = 'http://localhost:3001/api';

async function post(path, body, headers = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, data: parsed, headers: Object.fromEntries(res.headers.entries()) };
}
async function get(path, headers = {}) {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, data: parsed, headers: Object.fromEntries(res.headers.entries()) };
}

(async () => {
  try {
    const createAdmin = await post('/auth/create-admin');
    console.log('create-admin:', createAdmin.status, createAdmin.data?.message || createAdmin.data);

    const adminLogin = await post('/auth/login', { username: 'admin', password: 'password123' });
    if (!adminLogin.data?.accessToken) {
      console.error('Admin login failed:', adminLogin);
      process.exit(2);
    }
    const adminToken = adminLogin.data.accessToken;
    console.log('admin login ok');

    // Try create Center Manager
    const cmBody = {
      userName: 'cm1',
      firstName: 'CM',
      lastName: 'One',
      email: 'cm1@example.com',
      password: 'password123',
      role: 'center-manager',
      centerName: 'Test Center',
    };
    const cmCreate = await post('/users', cmBody, { Authorization: `Bearer ${adminToken}` });
    if (cmCreate.status === 201 || cmCreate.status === 200) {
      console.log('center-manager created');
    } else {
      console.log('center-manager create response:', cmCreate.status, cmCreate.data?.message || cmCreate.data);
    }

    // Login as CM
    const cmLogin = await post('/auth/login', { username: 'cm1', password: 'password123' });
    if (!cmLogin.data?.accessToken) {
      console.error('CM login failed:', cmLogin);
      process.exit(3);
    }
    const cmToken = cmLogin.data.accessToken;
    console.log('cm login ok');

  const cmProfile = await get('/auth/profile', { Authorization: `Bearer ${cmToken}` });
  console.log('cm profile:', cmProfile.status, cmProfile.data);
  const whoGet = await get('/leads/whoami', { Authorization: `Bearer ${cmToken}` });
  console.log('whoami GET:', whoGet.status, whoGet.data);
  const whoPost = await post('/leads/whoami', undefined, { Authorization: `Bearer ${cmToken}` });
  console.log('whoami POST:', whoPost.status, whoPost.data);
  const leadsList = await get('/leads', { Authorization: `Bearer ${cmToken}` });
  console.log('leads list (cm):', leadsList.status, typeof leadsList.data === 'string' ? leadsList.data : (leadsList.data?.total ?? leadsList.data?.message));

    // Create a lead with minimal payload
    const leadBody = { firstName: 'Test', lastName: 'Lead', email1: 'testlead@example.com' };
  const leadCreate = await post('/leads', leadBody, { Authorization: `Bearer ${cmToken}` });
    console.log('lead create:', leadCreate.status, typeof leadCreate.data === 'string' ? leadCreate.data : leadCreate.data?.id || leadCreate.data?.message);
  const leadAdmin = await post('/leads', { firstName: 'AdminTry', email1: 'a@b.com' }, { Authorization: `Bearer ${adminToken}` });
  console.log('lead create (admin):', leadAdmin.status, typeof leadAdmin.data === 'string' ? leadAdmin.data : leadAdmin.data?.id || leadAdmin.data?.message);

    // Try with a counselor as well
    const counselorBody = {
      userName: 'c1',
      firstName: 'Coun',
      lastName: 'Selor',
      email: 'c1@example.com',
      password: 'password123',
      role: 'counselor'
      // centerName will be set to CM's center by service
    };
    const cCreate = await post('/users', counselorBody, { Authorization: `Bearer ${cmToken}` });
    console.log('counselor create:', cCreate.status, cCreate.data?.message || (typeof cCreate.data === 'string' ? cCreate.data : 'OK'));
    const cLogin = await post('/auth/login', { username: 'c1', password: 'password123' });
    if (!cLogin.data?.accessToken) {
      console.error('Counselor login failed:', cLogin);
      process.exit(4);
    }
    const cToken = cLogin.data.accessToken;
    const cLead = await post('/leads', { firstName: 'Coun', email1: 'coun@example.com' }, { Authorization: `Bearer ${cToken}` });
    console.log('lead create (counselor):', cLead.status, typeof cLead.data === 'string' ? cLead.data : cLead.data?.id || cLead.data?.message);
  } catch (e) {
    console.error('E2E error:', e?.message || e);
    process.exit(1);
  }
})();
