-- =====================================================
-- FIX: Update club names to match API names
-- =====================================================

-- Update club names to match API-Football names exactly
-- This ensures upcoming matches are properly matched

-- Premier League
UPDATE clubs SET name = 'Arsenal' WHERE name = 'Arsenal FC';
UPDATE clubs SET name = 'Aston Villa' WHERE name = 'Aston Villa FC';
UPDATE clubs SET name = 'Chelsea' WHERE name = 'Chelsea FC';
UPDATE clubs SET name = 'Liverpool' WHERE name = 'Liverpool FC';
UPDATE clubs SET name = 'Manchester City' WHERE name = 'Manchester City FC';
UPDATE clubs SET name = 'Manchester United' WHERE name = 'Manchester United FC';
UPDATE clubs SET name = 'Tottenham' WHERE name = 'Tottenham Hotspur FC';
UPDATE clubs SET name = 'Newcastle' WHERE name = 'Newcastle United FC';
UPDATE clubs SET name = 'Everton' WHERE name = 'Everton FC';
UPDATE clubs SET name = 'West Ham' WHERE name = 'West Ham United FC';
UPDATE clubs SET name = 'Leicester' WHERE name = 'Leicester City FC';
UPDATE clubs SET name = 'Wolves' WHERE name = 'Wolverhampton Wanderers FC';
UPDATE clubs SET name = 'Brighton' WHERE name = 'Brighton & Hove Albion FC';
UPDATE clubs SET name = 'Crystal Palace' WHERE name = 'Crystal Palace FC';
UPDATE clubs SET name = 'Fulham' WHERE name = 'Fulham FC';
UPDATE clubs SET name = 'Brentford' WHERE name = 'Brentford FC';
UPDATE clubs SET name = 'Bournemouth' WHERE name = 'Bournemouth FC';
UPDATE clubs SET name = 'Nottingham Forest' WHERE name = 'Nottingham Forest FC';

-- La Liga
UPDATE clubs SET name = 'Real Madrid' WHERE name = 'Real Madrid CF';
UPDATE clubs SET name = 'Barcelona' WHERE name = 'FC Barcelona';
UPDATE clubs SET name = 'Atletico Madrid' WHERE name = 'Atletico Madrid';
UPDATE clubs SET name = 'Sevilla' WHERE name = 'Sevilla FC';
UPDATE clubs SET name = 'Real Sociedad' WHERE name = 'Real Sociedad';
UPDATE clubs SET name = 'Athletic Bilbao' WHERE name = 'Athletic Bilbao';
UPDATE clubs SET name = 'Villarreal' WHERE name = 'Villarreal CF';
UPDATE clubs SET name = 'Real Betis' WHERE name = 'Real Betis';
UPDATE clubs SET name = 'Valencia' WHERE name = 'Valencia CF';
UPDATE clubs SET name = 'Girona' WHERE name = 'Girona FC';

-- Serie A
UPDATE clubs SET name = 'Juventus' WHERE name = 'Juventus FC';
UPDATE clubs SET name = 'AC Milan' WHERE name = 'AC Milan';
UPDATE clubs SET name = 'Inter' WHERE name = 'Inter Milan';
UPDATE clubs SET name = 'Roma' WHERE name = 'AS Roma';
UPDATE clubs SET name = 'Napoli' WHERE name = 'SSC Napoli';
UPDATE clubs SET name = 'Lazio' WHERE name = 'SS Lazio';
UPDATE clubs SET name = 'Fiorentina' WHERE name = 'ACF Fiorentina';
UPDATE clubs SET name = 'Atalanta' WHERE name = 'Atalanta BC';
UPDATE clubs SET name = 'Bologna' WHERE name = 'Bologna FC';

-- Bundesliga
UPDATE clubs SET name = 'Bayern Munich' WHERE name = 'FC Bayern Munich';
UPDATE clubs SET name = 'Dortmund' WHERE name = 'Borussia Dortmund';
UPDATE clubs SET name = 'RB Leipzig' WHERE name = 'RB Leipzig';
UPDATE clubs SET name = 'Leverkusen' WHERE name = 'Bayer 04 Leverkusen';
UPDATE clubs SET name = 'Monchengladbach' WHERE name = 'Borussia Monchengladbach';
UPDATE clubs SET name = 'Stuttgart' WHERE name = 'VfB Stuttgart';
UPDATE clubs SET name = 'Frankfurt' WHERE name = 'Eintracht Frankfurt';
UPDATE clubs SET name = 'Wolfsburg' WHERE name = 'VfL Wolfsburg';

-- Ligue 1
UPDATE clubs SET name = 'Paris Saint Germain' WHERE name = 'Paris Saint-Germain FC';
UPDATE clubs SET name = 'Marseille' WHERE name = 'Olympique de Marseille';
UPDATE clubs SET name = 'Monaco' WHERE name = 'AS Monaco';
UPDATE clubs SET name = 'Lyon' WHERE name = 'Olympique Lyonnais';
UPDATE clubs SET name = 'Lille' WHERE name = 'LOSC Lille';
UPDATE clubs SET name = 'Rennes' WHERE name = 'Stade Rennais FC';
UPDATE clubs SET name = 'Nice' WHERE name = 'OGC Nice';
UPDATE clubs SET name = 'Lens' WHERE name = 'RC Lens';

-- Primeira Liga
UPDATE clubs SET name = 'Benfica' WHERE name = 'SL Benfica';
UPDATE clubs SET name = 'Porto' WHERE name = 'FC Porto';
UPDATE clubs SET name = 'Sporting CP' WHERE name = 'Sporting CP';

-- Eredivisie
UPDATE clubs SET name = 'Ajax' WHERE name = 'AFC Ajax';
UPDATE clubs SET name = 'PSV' WHERE name = 'PSV Eindhoven';
UPDATE clubs SET name = 'Feyenoord' WHERE name = 'Feyenoord';

-- Scottish Premiership
UPDATE clubs SET name = 'Celtic' WHERE name = 'Celtic FC';
UPDATE clubs SET name = 'Rangers' WHERE name = 'Rangers FC';

-- MLS
UPDATE clubs SET name = 'LA Galaxy' WHERE name = 'LA Galaxy';
UPDATE clubs SET name = 'Inter Miami' WHERE name = 'Inter Miami CF';
UPDATE clubs SET name = 'New York City FC' WHERE name = 'New York City FC';
UPDATE clubs SET name = 'Seattle Sounders' WHERE name = 'Seattle Sounders FC';
UPDATE clubs SET name = 'Atlanta United' WHERE name = 'Atlanta United FC';

-- Saudi Pro League
UPDATE clubs SET name = 'Al Hilal' WHERE name = 'Al-Hilal FC';
UPDATE clubs SET name = 'Al Nassr' WHERE name = 'Al-Nassr FC';
UPDATE clubs SET name = 'Al Ittihad' WHERE name = 'Al-Ittihad FC';
UPDATE clubs SET name = 'Al Ahli' WHERE name = 'Al-Ahli FC';

-- =====================================================
-- FIX: Update is_official logic
-- Official clubs are those verified by admin, regardless of loyalty program
-- =====================================================

-- Create function to set club as official when verified
CREATE OR REPLACE FUNCTION verify_club_official(p_club_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE clubs 
  SET is_official = true, 
      status = 'verified',
      updated_at = now()
  WHERE id = p_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add api_name column for better API matching (optional, stores original name for display)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS display_name TEXT;
UPDATE clubs SET display_name = name WHERE display_name IS NULL;
