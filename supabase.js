// 1. Substitua com a URL e CHAVE do seu projeto Supabase
// (Você encontra isso em Project Settings -> API)
const SUPABASE_URL = 'https://oavadpdbxobhtnmirgzp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_McGNgwEN08ir_fH9IU8new_DGec_4_l';

// 2. Inicializa o cliente do Supabase
// Como estamos usando via CDN (script tag), o objeto 'supabase' fica disponível globalmente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase inicializado!");
