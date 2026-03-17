module.exports = {
  apps: [
    {
      name: "marketstats-frontend",
      cwd: "/home/krish/marketstats/frontend",
      script: "/home/krish/marketstats/start-frontend.sh",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "marketstats-api",
      cwd: "/home/krish/marketstats/backend",
      script: "/home/krish/marketstats/start-api.sh",
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
  ],
};
