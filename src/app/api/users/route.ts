import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client (server-side)
const supabaseUrl = 'https://nucrceisrgwinfejiuur.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51Y3JjZWlzcmd3aW5mZWppdXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1Mjc0NjEsImV4cCI6MjA2MzEwMzQ2MX0.wVqzBw1Fq3GxdVbb5vjkxA6li9Ew9825B-zucFXFVvQ';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Query the users table
    const { data, error } = await supabase
      .from('users')
      .select('id, name, cedula, email');

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      error: error.message, 
      hint: 'Verify that the users table exists and you have proper permissions.' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, cedula, email } = body;
    
    if (!name || !cedula || !email) {
      return NextResponse.json({ 
        error: 'Incomplete data. Name, cedula, and email are required.'
      }, { status: 400 });
    }

    // Insert into users table
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, cedula, email }])
      .select();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Error inserting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 