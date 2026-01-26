
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    playername VARCHAR(50) UNIQUE NOT NULL,
    balance BIGINT DEFAULT 0, 
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS crash_games (
    id SERIAL PRIMARY KEY,
    crash_point NUMERIC(10, 2),
    hash TEXT,
    salt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS game_seeds (
    game_id SERIAL PRIMARY KEY,
    hash CHAR(64),
    seed TEXT,
    used BOOLEAN DEFAULT FALSE
);


CREATE TABLE IF NOT EXISTS crash_bets (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    bet_amount BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'balance',
    auto_cashout NUMERIC(10, 2) DEFAULT 0,
    cashed_out_at NUMERIC(10, 2) DEFAULT 0,
    profit VARCHAR(50) DEFAULT '0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_players_username ON players(playername);
CREATE INDEX IF NOT EXISTS idx_bets_game_id ON crash_bets(game_id);




INSERT INTO players (playername, password, balance)
VALUES (
    'demo', 
    '19726487', -- <-- Password is 123
    100000
)
ON CONFLICT (playername) DO NOTHING;


INSERT INTO game_seeds (hash, seed, used)
VALUES (
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 
    'test_seed_123', 
    FALSE
)
ON CONFLICT DO NOTHING;