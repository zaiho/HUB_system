/*
  # Ajout des colonnes manquantes à la table sites

  1. Modifications
    - Ajout de la colonne `description` pour stocker la description du site
    - Ajout de la colonne `environment_types` pour stocker les types de milieux à étudier
*/

ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS environment_types TEXT[] DEFAULT '{}';