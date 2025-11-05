// Quick script to test if .env.local is being loaded
require('dotenv').config({ path: '.env.local' });

console.log('=== Environment Variable Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('OPENAI_API_KEY prefix:', process.env.OPENAI_API_KEY?.substring(0, 3) || 'N/A');
console.log('OPENAI_API_KEY has whitespace:', /^\s|\s$/.test(process.env.OPENAI_API_KEY || '') ? 'YES ❌' : 'NO ✅');

if (process.env.OPENAI_API_KEY) {
  const key = process.env.OPENAI_API_KEY;
  const trimmed = key.trim();
  if (key !== trimmed) {
    console.log('⚠️  WARNING: API key has leading/trailing whitespace!');
    console.log('   Original length:', key.length);
    console.log('   Trimmed length:', trimmed.length);
  }
}

