module.exports = {
  apps: [
    {
      name: "marketstats-frontend",
      cwd: "/home/krish/marketstats/frontend",
      script: "npm",
      args: "run dev",
      env: {
        PORT: 3000,
        NODE_ENV: "development",
      },
    },
    {
      name: "marketstats-api",
      cwd: "/home/krish/marketstats/backend",
      script: "/home/krish/anaconda3/bin/uvicorn",
      args: "main:app --host 0.0.0.0 --port 8000",
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
  ],
};
