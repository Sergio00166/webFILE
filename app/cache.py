# Code by Sergio00166

from functools import wraps
from sys import getsizeof


#SelectiveCache(max_memory=1000)
#@cache.cached("invalidate_variable")
class SelectiveCache:
    def __init__(self, max_memory=None):
        self.cache = {}
        self.inv_keys = {}    # key -> invalidator values
        self.max_memory = max_memory  # memory limit in bytes
        self.current_memory = 0       # current mem usage

    def cached(self, *invalidators):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                filtered_kwargs = {k: v for k, v in kwargs.items() if k not in invalidators}
                key = (func, args, frozenset(filtered_kwargs.items()))
                inv_values = {k: kwargs.get(k) for k in invalidators}

                if key in self.cache and self.inv_keys.get(key) == inv_values:
                    result, freq, size = self.cache[key]
                    self.cache[key] = (result, freq + 1, size)
                    return result

                result = func(*args, **kwargs)
                size = getsizeof(result)

                if self.max_memory is not None:
                    # Elimina entradas con menor frecuencia hasta liberar suficiente memoria
                    while self.cache and self.current_memory + size > self.max_memory:
                        least_used_key = min(self.cache, key=lambda k: self.cache[k][1])
                        _, _, removed_size = self.cache.pop(least_used_key)
                        self.inv_keys.pop(least_used_key, None)
                        self.current_memory -= removed_size
                    # Si la nueva entrada es demasiado grande, no se cachea
                    if self.current_memory + size > self.max_memory:
                        return result

                self.cache[key] = (result, 1, size)
                self.inv_keys[key] = inv_values
                self.current_memory += size
                return result
            return wrapper
        return decorator

