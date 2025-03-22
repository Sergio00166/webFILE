import unittest
from functools import wraps
from sys import getsizeof
from cache import SelectiveCache  # Replace 'your_module' with the actual module name


class TestSelectiveCache(unittest.TestCase):

    def setUp(self):
        self.cache = SelectiveCache(max_memory=1024)
        self.test_function_calls = 0
        self.test_function2_calls = 0
        self.test_function3_calls = 0

    def test_basic_caching(self):
        @self.cache.cached()
        def test_function(a, b):
            self.test_function_calls += 1
            return a + b

        # First call should compute and cache
        result1 = test_function(1, 2)
        self.assertEqual(result1, 3)
        self.assertEqual(self.test_function_calls, 1)

        # Second call with same arguments should use cache
        result2 = test_function(1, 2)
        self.assertEqual(result2, 3)
        self.assertEqual(self.test_function_calls, 1)

    def test_invalidation(self):
        @self.cache.cached("c")
        def test_function(a, b, c):
            self.test_function_calls += 1
            return a + b + c

        # Initial call
        result1 = test_function(1, 2, c=3)
        self.assertEqual(result1, 6)
        self.assertEqual(self.test_function_calls, 1)

        # Call with same arguments should use cache
        result2 = test_function(1, 2, c=3)
        self.assertEqual(result2, 6)
        self.assertEqual(self.test_function_calls, 1)

        # Change invalidator and check if cache is invalidated
        result3 = test_function(1, 2, c=4)
        self.assertEqual(result3, 7)
        self.assertEqual(self.test_function_calls, 2)

    def test_memory_management(self):
        # Create a function that returns objects of varying sizes
        @self.cache.cached()
        def test_function(size):
            self.test_function_calls += 1
            return 'x' * size  # Varying return size

        # Fill the cache
        for size in range(1, 100):
            test_function(size)

        # Assuming the cache has a max_memory limit, ensure it doesn't exceed it
        # This is a simplified check; actual implementation may require more precise measurement
        self.assertLess(self.cache.current_memory, self.cache.max_memory)

    def test_global_cache_isolation(self):
        # Create two functions with different invalidators
        @self.cache.cached("a")
        def func1(a, b):
            self.test_function_calls += 1
            return a + b

        @self.cache.cached("c")
        def func2(c, d):
            self.test_function2_calls += 1
            return c + d

        # Test func1
        result1 = func1(1, 2)
        self.assertEqual(result1, 3)
        self.assertEqual(self.test_function_calls, 1)

        # Test func2
        result2 = func2(3, 4)
        self.assertEqual(result2, 7)
        self.assertEqual(self.test_function2_calls, 1)

        # Ensure caches are isolated
        self.assertNotIn((func1, (1, 2), frozenset()), self.cache.cache)
        self.assertNotIn((func2, (3, 4), frozenset()), self.cache.cache)

    def test_no_invalidators(self):
        @self.cache.cached()
        def test_function(a, b):
            self.test_function_calls += 1
            return a + b

        # First call
        result1 = test_function(1, 2)
        self.assertEqual(result1, 3)
        self.assertEqual(self.test_function_calls, 1)

        # Second call with same arguments
        result2 = test_function(1, 2)
        self.assertEqual(result2, 3)
        self.assertEqual(self.test_function_calls, 1)

    def test_varying_return_sizes(self):
        @self.cache.cached()
        def test_function(size):
            self.test_function_calls += 1
            return 'x' * size

        # Test with different sizes
        result1 = test_function(10)
        result2 = test_function(20)
        result3 = test_function(30)

        self.assertEqual(len(result1), 10)
        self.assertEqual(len(result2), 20)
        self.assertEqual(len(result3), 30)
        self.assertEqual(self.test_function_calls, 3)

    def test_edge_cases(self):
        # Test with no arguments
        @self.cache.cached()
        def test_function():
            self.test_function_calls += 1
            return "Hello"

        # Test with only positional arguments
        @self.cache.cached()
        def test_function2(a, b):
            self.test_function2_calls += 1
            return a + b

        # Test with only keyword arguments
        @self.cache.cached()
        def test_function3(a, b):
            self.test_function3_calls += 1
            return a + b

        # Reset counters
        self.test_function_calls = 0
        self.test_function2_calls = 0
        self.test_function3_calls = 0

        # First call to test_function
        result = test_function()
        self.assertEqual(result, "Hello")
        self.assertEqual(self.test_function_calls, 1)

        # Call to test_function2
        result = test_function2(1, 2)
        self.assertEqual(result, 3)
        self.assertEqual(self.test_function2_calls, 1)

        # Call to test_function3
        result = test_function3(a=1, b=2)
        self.assertEqual(result, 3)
        self.assertEqual(self.test_function3_calls, 1)

    def test_error_handling(self):
        @self.cache.cached()
        def test_function_raising_exception(a, b):
            self.test_function_calls += 1
            if a < b:
                raise ValueError("a must be greater than or equal to b")
            return a + b

        # Test with valid input
        result = test_function_raising_exception(2, 1)
        self.assertEqual(result, 3)
        self.assertEqual(self.test_function_calls, 1)

        # Test with invalid input
        with self.assertRaises(ValueError):
            test_function_raising_exception(1, 2)

        # Ensure cache isn't populated with invalid results
        self.assertNotIn((test_function_raising_exception, (1, 2), frozenset()), self.cache.cache)

if __name__ == "__main__":
    unittest.main()
