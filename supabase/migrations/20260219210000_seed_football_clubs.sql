-- =====================================================
-- SEED DATA: Popular Football Clubs as Fan Communities
-- These are pre-populated communities fans can join
-- is_official = false means it's a fan community awaiting official club
-- =====================================================

-- Insert popular football clubs as fan communities
-- Note: admin_id is set to a system value; these will be claimed later

INSERT INTO public.clubs (id, name, country, city, primary_color, is_official, status, created_at) VALUES
-- Premier League (England)
('00000001-0000-0000-0000-000000000001', 'Arsenal FC', 'England', 'London', '#EF0107', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000002', 'Aston Villa FC', 'England', 'Birmingham', '#95BFE5', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000003', 'Chelsea FC', 'England', 'London', '#034694', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000004', 'Liverpool FC', 'England', 'Liverpool', '#C8102E', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000005', 'Manchester City FC', 'England', 'Manchester', '#6CABDD', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000006', 'Manchester United FC', 'England', 'Manchester', '#DA291C', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000007', 'Tottenham Hotspur FC', 'England', 'London', '#132257', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000008', 'Newcastle United FC', 'England', 'Newcastle', '#241F20', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000009', 'Everton FC', 'England', 'Liverpool', '#003399', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000010', 'West Ham United FC', 'England', 'London', '#7A263A', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000011', 'Leicester City FC', 'England', 'Leicester', '#003090', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000012', 'Wolverhampton Wanderers FC', 'England', 'Wolverhampton', '#FDB913', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000013', 'Brighton & Hove Albion FC', 'England', 'Brighton', '#0057B8', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000014', 'Crystal Palace FC', 'England', 'London', '#1B458F', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000015', 'Fulham FC', 'England', 'London', '#000000', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000016', 'Brentford FC', 'England', 'London', '#E30613', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000017', 'Bournemouth FC', 'England', 'Bournemouth', '#DA291C', false, 'unverified', now()),
('00000001-0000-0000-0000-000000000018', 'Nottingham Forest FC', 'England', 'Nottingham', '#FF0000', false, 'unverified', now()),

-- La Liga (Spain)
('00000002-0000-0000-0000-000000000001', 'Real Madrid CF', 'Spain', 'Madrid', '#FFFFFF', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000002', 'FC Barcelona', 'Spain', 'Barcelona', '#A50044', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000003', 'Atletico Madrid', 'Spain', 'Madrid', '#CB3524', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000004', 'Sevilla FC', 'Spain', 'Seville', '#F43333', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000005', 'Real Sociedad', 'Spain', 'San Sebastian', '#0067B1', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000006', 'Athletic Bilbao', 'Spain', 'Bilbao', '#EE2523', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000007', 'Villarreal CF', 'Spain', 'Villarreal', '#FFE667', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000008', 'Real Betis', 'Spain', 'Seville', '#00954C', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000009', 'Valencia CF', 'Spain', 'Valencia', '#FF7C00', false, 'unverified', now()),
('00000002-0000-0000-0000-000000000010', 'Girona FC', 'Spain', 'Girona', '#FF0000', false, 'unverified', now()),

-- Serie A (Italy)
('00000003-0000-0000-0000-000000000001', 'Juventus FC', 'Italy', 'Turin', '#000000', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000002', 'AC Milan', 'Italy', 'Milan', '#FB090B', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000003', 'Inter Milan', 'Italy', 'Milan', '#0068A8', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000004', 'AS Roma', 'Italy', 'Rome', '#8E1F2F', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000005', 'SSC Napoli', 'Italy', 'Naples', '#12A0D7', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000006', 'SS Lazio', 'Italy', 'Rome', '#87D8F7', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000007', 'ACF Fiorentina', 'Italy', 'Florence', '#4B1B7F', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000008', 'Atalanta BC', 'Italy', 'Bergamo', '#1E71B8', false, 'unverified', now()),
('00000003-0000-0000-0000-000000000009', 'Bologna FC', 'Italy', 'Bologna', '#A11E22', false, 'unverified', now()),

-- Bundesliga (Germany)
('00000004-0000-0000-0000-000000000001', 'FC Bayern Munich', 'Germany', 'Munich', '#DC052D', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000002', 'Borussia Dortmund', 'Germany', 'Dortmund', '#FDE100', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000003', 'RB Leipzig', 'Germany', 'Leipzig', '#DD0741', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000004', 'Bayer 04 Leverkusen', 'Germany', 'Leverkusen', '#E32221', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000005', 'Borussia Monchengladbach', 'Germany', 'Monchengladbach', '#000000', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000006', 'VfB Stuttgart', 'Germany', 'Stuttgart', '#E32219', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000007', 'Eintracht Frankfurt', 'Germany', 'Frankfurt', '#E1000F', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000008', 'VfL Wolfsburg', 'Germany', 'Wolfsburg', '#65B32E', false, 'unverified', now()),
('00000004-0000-0000-0000-000000000009', 'Borussia Dortmund II', 'Germany', 'Dortmund', '#FDE100', false, 'unverified', now()),

-- Ligue 1 (France)
('00000005-0000-0000-0000-000000000001', 'Paris Saint-Germain FC', 'France', 'Paris', '#004170', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000002', 'Olympique de Marseille', 'France', 'Marseille', '#2FAEE0', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000003', 'AS Monaco', 'France', 'Monaco', '#E6001F', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000004', 'Olympique Lyonnais', 'France', 'Lyon', '#004170', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000005', 'LOSC Lille', 'France', 'Lille', '#E30613', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000006', 'Stade Rennais FC', 'France', 'Rennes', '#E30613', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000007', 'OGC Nice', 'France', 'Nice', '#000000', false, 'unverified', now()),
('00000005-0000-0000-0000-000000000008', 'RC Lens', 'France', 'Lens', '#FFD700', false, 'unverified', now()),

-- Primeira Liga (Portugal)
('00000006-0000-0000-0000-000000000001', 'SL Benfica', 'Portugal', 'Lisbon', '#FF0000', false, 'unverified', now()),
('00000006-0000-0000-0000-000000000002', 'FC Porto', 'Portugal', 'Porto', '#003893', false, 'unverified', now()),
('00000006-0000-0000-0000-000000000003', 'Sporting CP', 'Portugal', 'Lisbon', '#008000', false, 'unverified', now()),

-- Eredivisie (Netherlands)
('00000007-0000-0000-0000-000000000001', 'AFC Ajax', 'Netherlands', 'Amsterdam', '#D2122E', false, 'unverified', now()),
('00000007-0000-0000-0000-000000000002', 'PSV Eindhoven', 'Netherlands', 'Eindhoven', '#EE1C25', false, 'unverified', now()),
('00000007-0000-0000-0000-000000000003', 'Feyenoord', 'Netherlands', 'Rotterdam', '#FF0000', false, 'unverified', now()),

-- Scottish Premiership
('00000008-0000-0000-0000-000000000001', 'Celtic FC', 'Scotland', 'Glasgow', '#16B74C', false, 'unverified', now()),
('00000008-0000-0000-0000-000000000002', 'Rangers FC', 'Scotland', 'Glasgow', '#00539B', false, 'unverified', now()),

-- MLS (USA)
('00000009-0000-0000-0000-000000000001', 'LA Galaxy', 'USA', 'Los Angeles', '#00245D', false, 'unverified', now()),
('00000009-0000-0000-0000-000000000002', 'Inter Miami CF', 'USA', 'Miami', '#F4B41A', false, 'unverified', now()),
('00000009-0000-0000-0000-000000000003', 'New York City FC', 'USA', 'New York', '#69B3E7', false, 'unverified', now()),
('00000009-0000-0000-0000-000000000004', 'Seattle Sounders FC', 'USA', 'Seattle', '#5BCC3B', false, 'unverified', now()),
('00000009-0000-0000-0000-000000000005', 'Atlanta United FC', 'USA', 'Atlanta', '#9D2235', false, 'unverified', now()),

-- Saudi Pro League
('00000010-0000-0000-0000-000000000001', 'Al-Hilal FC', 'Saudi Arabia', 'Riyadh', '#1E3A8A', false, 'unverified', now()),
('00000010-0000-0000-0000-000000000002', 'Al-Nassr FC', 'Saudi Arabia', 'Riyadh', '#FFC72C', false, 'unverified', now()),
('00000010-0000-0000-0000-000000000003', 'Al-Ittihad FC', 'Saudi Arabia', 'Jeddah', '#000000', false, 'unverified', now()),
('00000010-0000-0000-0000-000000000004', 'Al-Ahli FC', 'Saudi Arabia', 'Jeddah', '#007A33', false, 'unverified', now())

ON CONFLICT (id) DO NOTHING;

-- Update sequences to avoid conflicts
SELECT setval('clubs_id_seq', (SELECT MAX(id) FROM clubs));
