import crypto from 'crypto';


export const toCents = (amount: string | number | undefined | null): bigint => {
    try {
        if (!amount) return 0n;
        
       
        let s = amount.toString();
        if (!s.includes('.')) s += '.00';
        const parts = s.split('.');
        const whole = parts[0];
        let fraction = parts[1] || '00';
        if (fraction.length < 2) fraction += '0';
        if (fraction.length > 2) fraction = fraction.substring(0, 2);
        return BigInt(whole + fraction);
    } catch (e) {
        console.error("Error with balance conversion.", amount);
        return 0n;
    }
};


export const toDbFormat = (bigIntAmount: bigint): string => {
    if (bigIntAmount === undefined || bigIntAmount === null) return "0.00";
    
    let s = bigIntAmount.toString();
    
   
    while (s.length < 3) s = "0" + s;
    
   
    return s.slice(0, -2) + '.' + s.slice(-2);
};


export const fromCents = (bigIntAmount: bigint): string => toDbFormat(bigIntAmount);


export const getSecureRandom = (): number => {
    return crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
};


export const serializeBigInt = (key: string, value: any): any => {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
};