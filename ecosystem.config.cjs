module.exports = {
  apps: [
    {
      name: "teamvault",
      script: "./server.js", // For standalone build, or "npm start" for standard build
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3030,
        HOSTNAME: "0.0.0.0",
        TEAMVAULT_APP_ROOT: "./",
        TEAMVAULT_DATABASE_PATH: "./data/teamvault.db",
      },
    },
  ],
}
