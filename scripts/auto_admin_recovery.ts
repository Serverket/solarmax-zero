import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// The URL and SERVICE_ROLE should be provided in the environment
const SUPABASE_URL = process.env.CIA;
const SERVICE_ROLE = process.env.JONES; 

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: Missing CIA (URL) or JONES (SERVICE_ROLE) in environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Generate the base64 hash of 'm4xm4xm4x' (exactly what the frontend will send)
const hashBuffer = crypto.createHash('sha384').update('m4xm4xm4x').digest();
const hashBase64 = hashBuffer.toString('base64');
console.log("[DIAGNOSTIC] Base64 Hash:", hashBase64);
console.log("[DIAGNOSTIC] Hash length:", hashBase64.length, "characters");

async function runAutoAdmin() {
  console.log("--- STARTING AUTO ADMIN RECOVERY ---");
  
  const usersToRecreate = [
    { email: 'z0l4r@solarmax.com', role: 'admin' },
    { email: 'z0l4r_normal@solarmax.com', role: 'player' }
  ];

  for (const user of usersToRecreate) {
    console.log(`\nProcessing user: ${user.email}`);
    
    // 1. Delete if exists (to start clean)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users.find(u => u.email === user.email);
    
    if (existing) {
      console.log(`Deleting stuck/existing account for ${user.email}...`);
      await supabase.auth.admin.deleteUser(existing.id);
    }
    
    // 2. Recreate with the Base64 hash and auto-confirm
    console.log(`Recreating account for ${user.email}...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: hashBase64,
      email_confirm: true // Force confirmation so login works immediately
    });
    
    if (createError) {
      console.error(`Failed to create ${user.email}:`, createError.message);
      continue;
    }
    
    // 3. Update the profiles table to inject the role
    if (newUser?.user) {
      console.log(`Injecting role '${user.role}' into profiles table for ${user.email}...`);
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: user.role })
        .eq('id', newUser.user.id);
        
      if (roleError) {
        console.error(`Failed to assign role to ${user.email}:`, roleError.message);
      } else {
        console.log(`Successfully recovered and secured ${user.email} as ${user.role}.`);
      }
    }
  }
  
  console.log("\n--- AUTO ADMIN RECOVERY COMPLETE ---");
}

runAutoAdmin();
