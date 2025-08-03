# Code by Sergio00166

from json import dumps as jsdumps, loads as jsloads
from redis import Redis, ConnectionPool
from pickle import dumps, loads
from hashlib import sha256
from functools import wraps
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

    def __new__(cls, redis_client: Redis):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.redis = redis_client
        return cls._instance

    def cached(self, *invalidators):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                inv_values = {k: kwargs.get(k) for k in invalidators}
                filtered_kwargs = {
                    k: v for k, v in kwargs.items() if k not in invalidators
                }
                raw_key = {
                    'fn': f"{func.__module__}.{func.__name__}",
                    'args': args,
                    'kwargs': filtered_kwargs
                }
                digest = sha256(jsdumps(raw_key, sort_keys=True, default=repr).encode()).hexdigest()
                cache_key = f"cache:{digest}"
                inv_key = f"inv:{digest}"

                cached_blob = self.redis.get(cache_key)
                if cached_blob is not None:
                    stored_inv = jsloads(self.redis.get(inv_key) or b'{}')
                    if stored_inv == inv_values:
                        return loads(cached_blob)

                result = func(*args, **kwargs)
                self.redis.set(cache_key, dumps(result))
                self.redis.set(inv_key, jsdumps(inv_values))
                return result

            return wrapper
        return decorator



