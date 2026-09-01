import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.CIA, process.env.NSA);

async function testSignIn256() {
  const hash = crypto.createHash('sha256').update('m4xm4xm4x').digest('hex');
  
  console.log('Attempting signIn with SHA-256 HASHED password...');
  const res1 = await supabase.auth.signInWithPassword({
    email: 'test1234@gmail.com',
    password: hash
  });
  console.log('Hashed Password SignIn:', res1.error ? res1.error.message : 'SUCCESS');
}

testSignIn256();
