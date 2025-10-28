// sendMessageToOpenSourceAI.js
const sendMessageToOpenSourceAI = async (messages) => {
  const r = await fetch('https://myaichat-pozgpt.onrender.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  let data;
  try {
    data = await r.json();
  } catch {
    data = null;
  }

  if (!r.ok) {
    const detail = data?.detail || data?.error || `HTTP ${r.status}`;
    throw new Error(detail);
  }

  return data;
};

export default sendMessageToOpenSourceAI;
