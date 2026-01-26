module.exports = {
  apps : [{
    name   : "crash-game",
    script : "./server.js",
    // OVO JE KLJUCNO:
    kill_timeout : 60000, // PM2 ce cekati 60 sekundi pre nasilnog gašenja
    wait_ready: true,     // Ceka da aplikacija javi da je spremna
    listen_timeout: 10000
  }]
}