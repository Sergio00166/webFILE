# Code by Sergio00166

from redis import Redis, ConnectionPool
from msgspec import msgpack, json
from inspect import signature
from functools import wraps
from hashlib import sha256
from os import getenv

redis_port  = getenv("REDIS_PORT" ,6379)
redis_addr  = getenv("REDIS_ADDR" ,"127.0.0.1")

def setup_cache(db):
    pool = ConnectionPool(host=redis_addr, port=redis_port, db=db)
    redis_client = Redis(connection_pool=pool)
    return SelectiveRedisCache(redis_client)


class SelectiveRedisCache:
    def __init__(self, redis_client):
        self.redis = redis_client

    def cached(self, *invalidators, TTL):
        invalidators = set(invalidators)
        def decorator(func):
            sig = signature(func)

            @wraps(func)
            def wrapper(*args, **kwargs):
                bound = sig.bind_partial(*args, **kwargs)
                bound.apply_defaults()
                all_args = dict(bound.arguments)

                inv_values = {
                    k: all_args.pop(k, None) for k in invalidators
                }
                key_data = {
                    "fn": f"{func.__module__}.{func.__qualname__}",
                    "args": all_args,
                }
                redis = self.redis
                digest = sha256(json.encode(key_data)).hexdigest()
                cache_key, inv_key = f"cache:{digest}", f"inv:{digest}"

                if (inv_raw := redis.get(inv_key)):
                    hit = msgpack.decode(inv_raw) == inv_values

                    if hit and (cached_blob := redis.get(cache_key)):
                        return msgpack.decode(cached_blob)

                result = func(*args, **kwargs)
                pipe = redis.pipeline()
                pipe.set(cache_key, msgpack.encode(result),     ex=TTL)
                pipe.set(inv_key,   msgpack.encode(inv_values), ex=TTL)
                pipe.execute()

                return result
            return wrapper
        return decorator

  
