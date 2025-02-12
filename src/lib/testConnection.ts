import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    // Tente de récupérer la version de la base de données
    const { data, error } = await supabase
      .from('sites')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erreur de connexion à Supabase:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data
    };
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
}