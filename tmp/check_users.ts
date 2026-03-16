
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('Listing users...')
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
        console.error('List users error:', error)
        return
    }

    console.log('Total users:', users.length)
    const targetUser = users.find(u => u.email === 'xilasae@gmail.com')
    if (targetUser) {
        console.log('FULL_USER_ID:', targetUser.id)
    } else {
        console.log('Target user NOT found.')
    }
}

main().catch(console.error)
