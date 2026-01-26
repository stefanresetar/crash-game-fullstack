

export const udb_hash = (buf: string): number => {
    const length = buf.length;
    let s1 = 1;
    let s2 = 0;
    
    for (let n = 0; n < length; n++) {
        s1 = (s1 + buf.charCodeAt(n)) % 65521;
        s2 = (s2 + s1) % 65521;
    }
    return ((s2 << 16) + s1);
};