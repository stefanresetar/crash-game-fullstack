import { io } from 'socket.io-client';
const URL = 'http://localhost:8443'; 

export const socket = io(URL, {
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
});