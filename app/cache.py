# Code by Sergio00166

from json import dumps as jsdumps, loads as jsloads
from redis import Redis, ConnectionPool
from pickle import dumps, loads
from inspect import signature
from functools import wraps
from hashlib import sha256
from redis import Redis
from os import getenv


cache_limit = getenv("MAX_CACHE",None)
if cache_limit and not cache_limit.isdigit():
    print("MAX_CACHE MUST BE AN INT VALUE")
    exit(1) # Dont continue

cache_limit = int(cache_limit) if cache_limit else 256
cache_limit *= 1024 * 1024 # MB -> bytes

# Connect to Redis server. DB0 is used for sessions
def setup_cache(host="127.0.0.1", port=6379, db=1):
    pool = ConnectionPool(host=host, port=port, db=db)
    redis_client = Redis(connection_pool=pool)

    if redis_client.set("app:redis_configured", "1", nx=True, ex=60):
        lock_key = "app:redis_memory_configured"
        acquired = redis_client.set(lock_key, "1", nx=True, ex=60)
        if acquired:
            redis_client.config_set("maxmemory", cache_limit)
            redis_client.config_set("maxmemory-policy", "allkeys-lru")

    return SelectiveRedisCache(redis_client)



class SelectiveRedisCache:
    _instance = None

    def __new__(cls, redis_client):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.redis = redis_client
        return cls._instance

    def cached(self, *invalidators):
        invalidators = set(invalidators)

        def decorator(func):
            sig = signature(func)

            @wraps(func)
            def wrapper(*args, **kwargs):
                bound = sig.bind_partial(*args, **kwargs)
                bound.apply_defaults()
                all_args = dict(bound.arguments)

                inv_values = {k: all_args.get(k) for k in invalidators}
                for k in invalidators:
                    all_args.pop(k, None)

                key_data = {
                    "fn": f"{func.__module__}.{func.__qualname__}",
                    "args": all_args,
                }
                digest = sha256(jsdumps(key_data, sort_keys=True, default=repr).encode()).hexdigest()
                cache_key = f"cache:{digest}"
                inv_key = f"inv:{digest}"

                redis = self.redis
                cached_blob = redis.get(cache_key)
                stored_inv_raw = redis.get(inv_key)
                stored_inv = jsloads(stored_inv_raw) if stored_inv_raw else {}

                if cached_blob and stored_inv == inv_values:
                    return loads(cached_blob)

                result = func(*args, **kwargs)
                redis.set(cache_key, dumps(result))
                redis.set(inv_key, jsdumps(inv_values))
                return result

            return wrapper
        return decorator

 