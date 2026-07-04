(async function run() {
  try {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    console.log('Using base URL:', base);

    // Login (or auto-create demo user) to get a token
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo+test@local.invalid' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Obtained token:', Boolean(token));

    // Create a demo session
    const createRes = await fetch(`${base}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ targetRole: 'backend', experienceLevel: 'Entry', maxTurns: 2 })
    });
    const session = await createRes.json();
    console.log('Created session:', session.id);

    // Submit an answer
    const answerRes = await fetch(`${base}/api/sessions/${session.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ answer: 'This is an automated test answer.' })
    });
    const answerData = await answerRes.json();
    console.log('Answer response:', answerData);

    if (answerData.nextQuestion) {
      console.log('Flow advanced to next question. Test PASSED.');
    } else if (answerData.finalized) {
      console.log('Session finalized after answer. Test PASSED.');
    } else {
      console.log('Flow did not advance. Test FAILED.');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
