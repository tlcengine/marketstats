#\!/bin/bash
cd /home/krish/marketstats/backend
exec /home/krish/anaconda3/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
