/// <reference types="./types.d.ts" />

import { serve } from "std/http/server.ts"
import { createClient } from 'supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create admin client to delete user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Delete all user data first (in correct order to respect foreign key constraints)
    console.log('Deleting user data for:', user.id)
    
    // Delete services first (they reference clients)
    const { error: servicesError } = await supabaseAdmin.from('services').delete().eq('user_id', user.id)
    if (servicesError) {
      console.error('Error deleting services:', servicesError)
      throw new Error('Failed to delete services')
    }
    
    // Delete invoices (they reference clients)
    const { error: invoicesError } = await supabaseAdmin.from('invoices').delete().eq('user_id', user.id)
    if (invoicesError) {
      console.error('Error deleting invoices:', invoicesError)
      throw new Error('Failed to delete invoices')
    }
    
    // Delete clients
    const { error: clientsError } = await supabaseAdmin.from('clients').delete().eq('user_id', user.id)
    if (clientsError) {
      console.error('Error deleting clients:', clientsError)
      throw new Error('Failed to delete clients')
    }
    
    // Delete settings
    const { error: settingsError } = await supabaseAdmin.from('settings').delete().eq('user_id', user.id)
    if (settingsError) {
      console.error('Error deleting settings:', settingsError)
      throw new Error('Failed to delete settings')
    }

    // Finally delete the user account
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User account deleted successfully:', user.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-user-account function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
