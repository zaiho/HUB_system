/*
  # Ajout du type 'pid' aux types de sondages autorisés

  1. Modifications
    - Ajout du type 'pid' à la contrainte CHECK de la colonne type dans la table surveys
*/

ALTER TABLE surveys 
DROP CONSTRAINT IF EXISTS surveys_type_check;

ALTER TABLE surveys 
ADD CONSTRAINT surveys_type_check 
CHECK (type IN ('soil', 'groundwater', 'gas', 'ambient_air', 'pid'));