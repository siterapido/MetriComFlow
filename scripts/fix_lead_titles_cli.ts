
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLeadTitles() {
    console.log('Starting lead title fix...');

    // 1. Fetch all leads including necessary fields
    const { data: leads, error } = await supabase
        .from('leads')
        .select('id, title, trade_name, legal_name, email')
        .limit(10000); // Adjust limit if needed, but 10k should cover it for now

    if (error) {
        console.error('Error fetching leads:', error);
        process.exit(1);
    }

    if (!leads || leads.length === 0) {
        console.log('No leads found.');
        return;
    }

    console.log(`Found ${leads.length} leads. analyzing...`);

    const updates = [];
    const isValidName = (name: string | null | undefined) => {
        return name && name.trim() !== '' && name.trim() !== '-';
    };

    for (const lead of leads) {
        let desiredTitle = null;

        // Logic: Trade Name > Legal Name > Email Prefix > "Lead importado..."
        if (isValidName(lead.trade_name)) {
            desiredTitle = lead.trade_name;
        } else if (isValidName(lead.legal_name)) {
            desiredTitle = lead.legal_name;
        }

        // Only update if we have a BETTER title to offer
        if (desiredTitle) {
            // If current title is invalid OR differs from the desired high-quality title
            if (!isValidName(lead.title) || lead.title !== desiredTitle) {
                updates.push({ id: lead.id, title: desiredTitle });
            }
        }
    }

    if (updates.length === 0) {
        console.log('All leads already have correct titles.');
        return;
    }

    console.log(`Identified ${updates.length} leads to update.`);

    // 2. Perform updates in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const chunk = updates.slice(i, i + BATCH_SIZE);

        // Using upsert can be risky if we only provide ID and Title (it might nullify others if not careful, but upsert with PATCH style is safer if we just updating).
        // Actually, supabase .upsert needs all NotNull fields usually. 
        // Safer to use a loop of updates or .upsert if we are sure.
        // Given we are in a script, let's just loop Promises for safety or use upsert if partial update is supported (it is).

        // However, for bulk update of distinct rows with different values, standard SQL UPDATE doesn't do batching easily without CASE/WHEN. 
        // Supabase .upsert() works for bulk updates if we pass the array. 

        // Let's try Promise.all with individual updates for safety and simplicity in this script context.
        // It's slower but safer for < 1000 items. 
        // If > 1000, we might want upsert.

        const results = await Promise.all(chunk.map(u =>
            supabase.from('leads').update({ title: u.title }).eq('id', u.id)
        ));

        const failures = results.filter(r => r.error);
        if (failures.length > 0) {
            console.error(`Batch error: ${failures.length} failed in current batch.`);
            failures.forEach(f => console.error(f.error));
            failCount += failures.length;
            successCount += (chunk.length - failures.length);
        } else {
            successCount += chunk.length;
        }

        console.log(`Processed ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
    }

    console.log('Done!');
    console.log(`Updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

fixLeadTitles();
