import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';

const key = process.env.RESEND_API_KEY;
const payload = JSON.parse(fs.readFileSync('./emails/body.json', 'utf-8'));

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const data = await res.json();
console.log(res.ok ? `✅ Sent! ID: ${data.id}` : `❌ Error: ${data.message}`);
