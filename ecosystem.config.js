module.exports = {
  apps: [
    {
      name: "prepmate-ai",
      script: "dist/server.cjs",
      exec_mode: "cluster",
      instances: "max",
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
