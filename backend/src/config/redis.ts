import { createClient } from 'redis';
import dotenv from 'dotenv';


dotenv.config();


const redis = createClient({ 
    url: process.env.REDIS_URL || 'redis://localhost:6379' 
});


const redisPub = redis.duplicate();


redis.on('error', (err) => console.error('Redis Client Error', err));
redisPub.on('error', (err) => console.error('Redis Pub Client Error', err));


export const connectRedis = async (): Promise<void> => {

    if (!redis.isOpen) {
        await redis.connect();
    }
    
    if (!redisPub.isOpen) {
        await redisPub.connect();
    }

    console.log("Redis Connected");
};
export { redis, redisPub };