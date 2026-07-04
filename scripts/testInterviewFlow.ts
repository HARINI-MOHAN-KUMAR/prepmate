async function run() {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  console.log('Using base URL:', base);

  // Create a demo session
  const createRes = await fetch(`${base}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'backend', experienceLevel: 'Entry', maxTurns: 2 })
  });
  const session = await createRes.json();
  console.log('Created session:', session.id);

  // Submit an answer
  const answerRes = await fetch(`${base}/api/sessions/${session.id}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}

run().catch(err => { console.error(err); process.exit(1); });
