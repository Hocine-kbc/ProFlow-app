import { supabase } from './supabase.ts';
import { Article, ServicePricingType } from '../types/index.ts';

// Interface pour les données de la base de données
interface DatabaseArticle {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  pricing_type: string;
  default_rate: number;
  default_quantity: number | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Récupérer tous les articles de l'utilisateur
export async function fetchArticles(): Promise<Article[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((article: DatabaseArticle) => ({
      id: article.id,
      name: article.name,
      description: article.description || undefined,
      pricingType: article.pricing_type as ServicePricingType,
      defaultRate: article.default_rate,
      defaultQuantity: article.default_quantity || undefined,
      category: article.category || undefined,
      isActive: article.is_active,
      created_at: article.created_at,
      updated_at: article.updated_at,
      // Propriétés legacy pour compatibilité avec le composant
      hourly_rate: article.default_rate,
      pricing_type: article.pricing_type as ServicePricingType,
      is_active: article.is_active,
    }));
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
}

// Créer un nouvel article
export async function createArticle(payload: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Promise<Article> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const articleData: Partial<DatabaseArticle> = {
      user_id: user.id,
      name: payload.name,
      description: payload.description || null,
      pricing_type: payload.pricingType,
      default_rate: payload.defaultRate,
      default_quantity: payload.defaultQuantity || null,
      category: payload.category || null,
      is_active: payload.isActive !== undefined ? payload.isActive : true,
    };

    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      pricingType: data.pricing_type as ServicePricingType,
      defaultRate: data.default_rate,
      defaultQuantity: data.default_quantity || undefined,
      category: data.category || undefined,
      isActive: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Propriétés legacy pour compatibilité avec le composant
      hourly_rate: data.default_rate,
      pricing_type: data.pricing_type as ServicePricingType,
      is_active: data.is_active,
    };
  } catch (error) {
    console.error('Error creating article:', error);
    throw error;
  }
}

// Mettre à jour un article existant
export async function updateArticle(id: string, payload: Partial<Article>): Promise<Article> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const updateData: Partial<DatabaseArticle> = {};
    
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.pricingType !== undefined) updateData.pricing_type = payload.pricingType;
    if (payload.defaultRate !== undefined) updateData.default_rate = payload.defaultRate;
    if (payload.defaultQuantity !== undefined) updateData.default_quantity = payload.defaultQuantity || null;
    if (payload.category !== undefined) updateData.category = payload.category || null;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { data, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      pricingType: data.pricing_type as ServicePricingType,
      defaultRate: data.default_rate,
      defaultQuantity: data.default_quantity || undefined,
      category: data.category || undefined,
      isActive: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Propriétés legacy pour compatibilité avec le composant
      hourly_rate: data.default_rate,
      pricing_type: data.pricing_type as ServicePricingType,
      is_active: data.is_active,
    };
  } catch (error) {
    console.error('Error updating article:', error);
    throw error;
  }
}

// Supprimer un article
export async function deleteArticle(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
}

// Fonction helper pour migrer les articles de localStorage vers Supabase
export async function migrateArticlesFromLocalStorage(): Promise<{ migrated: number; errors: number }> {
  try {
    const savedArticles = localStorage.getItem('articles');
    if (!savedArticles) {
      console.log('Aucun article à migrer depuis localStorage');
      return { migrated: 0, errors: 0 };
    }

    const localArticles: Article[] = JSON.parse(savedArticles);
    console.log(`Migration de ${localArticles.length} articles depuis localStorage...`);

    let migrated = 0;
    let errors = 0;

    for (const article of localArticles) {
      try {
        // Vérifier si l'article n'existe pas déjà
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('name', article.name)
          .single();

        if (!existing) {
          await createArticle(article);
          migrated++;
          console.log(`✅ Article migré: ${article.name}`);
        } else {
          console.log(`⏭️ Article déjà existant: ${article.name}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Erreur migration article ${article.name}:`, error);
      }
    }

    // Sauvegarder une backup puis effacer localStorage
    localStorage.setItem('articles_backup', savedArticles);
    localStorage.removeItem('articles');
    console.log(`✅ Migration terminée: ${migrated} migrés, ${errors} erreurs`);

    return { migrated, errors };
  } catch (error) {
    console.error('Erreur lors de la migration des articles:', error);
    throw error;
  }
}

