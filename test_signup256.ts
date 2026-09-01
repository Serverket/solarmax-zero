import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.CIA, process.env.NSA);

async function testSignUp256() {
  const hash = crypto.createHash('sha256').update('m4xm4xm4x').digest('hex');
  
  console.log('SHA-256 Hex length:', hash.length);
  console.log('Attempting signUp with SHA-256 HASHED password...');
  const res1 = await supabase.auth.signUp({
    email: 'z0l4r@solarmax.com',
    password: hash
  });
  console.log('Hashed Password SignUp:', res1.error ? res1.error.message : 'SUCCESS (user created)');
}

testSignUp256();
