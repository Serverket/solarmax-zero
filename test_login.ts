import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.CIA, process.env.NSA);

async function test() {
  const hash = crypto.createHash('sha384').update('m4xm4xm4x').digest('hex');
  console.log('SHA-384 Hash:', hash);

  console.log('Attempting login with HASHED password...');
  const res1 = await supabase.auth.signInWithPassword({
    email: 'z0l4r@solarmax.com',
    password: hash
  });
  console.log('Hashed Password Login:', res1.error ? res1.error.message : 'SUCCESS');

  console.log('Attempting login with RAW password...');
  const res2 = await supabase.auth.signInWithPassword({
    email: 'z0l4r@solarmax.com',
    password: 'm4xm4xm4x'
  });
  console.log('Raw Password Login:', res2.error ? res2.error.message : 'SUCCESS');
}

test();
