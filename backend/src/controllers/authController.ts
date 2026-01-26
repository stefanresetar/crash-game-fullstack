import { Request, Response } from 'express';
import db from '../config/db';
import jwt from 'jsonwebtoken';
import { udb_hash } from '../utils/legacyHash';

const JWT_SECRET = process.env.JWT_SECRET || 'secretpassword';

export const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: "Enter your credentials." });
        return;
    }

    try {
        
        const result = await db.query(
            'SELECT id, playername, password, balance FROM players WHERE playername = $1', 
            [username]
        );
        const user = result.rows[0];
        const inputHash = udb_hash(password);
        if (result.rows.length === 0 || Number(user.password) !== inputHash) {
            res.status(401).json({ error: "Incorrect username/password." });
            return;
        }
        const token = jwt.sign(
            { 
                data: {
                    id: user.id,
                    username: user.playername
                } 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.playername,
                balance: Number(user.balance) 
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};