// js/supabaseConfig.js

// Initialize Supabase with placeholders for Project URL and API Key
// Replace these with your actual Supabase credentials when ready
const supabaseUrl = 'https://qoaupvcescxbcnthanlx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvYXVwdmNlc2N4YmNudGhhbmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDAzMjYsImV4cCI6MjA4ODE3NjMyNn0.90t-KCiDx2Ue7HTjYyY4OjM_PBna5EO6Lel_lEh8ODk';

// Initialize the Supabase client directly onto the window object
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
