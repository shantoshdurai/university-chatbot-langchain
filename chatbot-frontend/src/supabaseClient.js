import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tpbaqjdaxabctqxjitps.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XNmUsOZVYWpj8SswVvchSw_dZ48HSZE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
