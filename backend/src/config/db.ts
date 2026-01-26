import { Pool, PoolConfig } from 'pg';
import 'dotenv/config';
const poolConfig: PoolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: Number(process.env.DB_PORT) || 5432, 
    max: 20,
    idleTimeoutMillis: 30000
};
const db = new Pool(poolConfig);
export default db;