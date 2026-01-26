import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DB_HOST || !process.env.DB_USER) {
    console.warn("Skipping database initialization: Missing environment variables.");
    process.exit(0);
}

import db from '../config/db';

const initDb = async () => {
    try {
        const client = await db.connect();
        console.log("Connected to PostgreSQL.");

        const sqlPath = path.join(__dirname, '../../src/config/schema.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.error(`Error: Schema file not found at ${sqlPath}`);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query('COMMIT');

        console.log("Database schema initialized successfully.");
        client.release();
        process.exit(0);

    } catch (error) {
        console.warn("Database initialization failed.");
        if (error instanceof Error) {
            console.warn(error.message);
        }
        process.exit(0);
    }
};

initDb();