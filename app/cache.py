# Code by Sergio00166

from functools import wraps
from sys import getsizeof


# SelectiveCache(max_memory=1000)
# @cache.cached("invalidate_variable")

class SelectiveCache:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._initialized:
            cls._instance = super(SelectiveCache, cls).__new__(cls)
            cls._instance.cache = {}
            cls._instance.inv_keys = {}
            cls._instance.max_memory = kwargs.get("max_memory")
            cls._instance.current_memory = 0
            cls._initialized = True
        return cls._instance

    def cached(self, *invalidators):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                filtered_kwargs = {
                    k: v for k, v in kwargs.items() if k not in invalidators
                }
                key = (func, args, frozenset(filtered_kwargs.items()))
                inv_values = {k: kwargs.get(k) for k in invalidators}

                if key in self.cache and self.inv_keys.get(key) == inv_values:
                    result, freq, size = self.cache[key]
                    self.cache[key] = (result, freq + 1, size)
                    return result

                result = func(*args, **kwargs)
                size = getsizeof(result)

                if self.max_memory is not None:
                    while self.cache and self.current_memory + size > self.max_memory:
                        least_used_key = min(self.cache, key=lambda k: self.cache[k][1])
                        _, _, removed_size = self.cache.pop(least_used_key)
                        self.inv_keys.pop(least_used_key, None)
                        self.current_memory -= removed_size
                    if self.current_memory + size > self.max_memory:
                        return result

                self.cache[key] = (result, 1, size)
                self.inv_keys[key] = inv_values
                self.current_memory += size
                return result

            return wrapper
        return decorator
