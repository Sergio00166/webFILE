# Code by Sergio00166

from json import dumps as jsdumps, loads as jsloads
from redis import Redis, ConnectionPool
from pickle import dumps, loads
from inspect import signature
from functools import wraps
from hashlib import sha256
from redis import Redis
from os import getenv

redis_port  = getenv("REDIS_PORT" ,6379)
redis_addr  = getenv("REDIS_ADDR" ,"127.0.0.1")

def setup_cache(db):
    pool = ConnectionPool(host=redis_addr, port=redis_port, db=db)
    redis_client = Redis(connection_pool=pool)
    return SelectiveRedisCache(redis_client)


class SelectiveRedisCache:
    _instance = None

    def __new__(cls, redis_client):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.redis = redis_client
        return cls._instance

    def cached(self, *invalidators, TTL):
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
                redis.set(cache_key, dumps(result), ex=TTL)
                redis.set(inv_key, jsdumps(inv_values), ex=TTL)
                return result

            return wrapper
        return decorator

 
