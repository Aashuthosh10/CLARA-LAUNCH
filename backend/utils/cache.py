"""Small in-memory TTL LRU cache for low-latency hot paths."""

from __future__ import annotations

import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


@dataclass
class _Entry(Generic[V]):
    value: V
    expires_at: float


class TTLRUCache(Generic[K, V]):
    # This cache is intentionally synchronous and lock-free.
    # Async single-flight stampede protection is implemented at call sites.
    def __init__(self, max_size: int = 128, ttl_seconds: float = 300.0):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._store: OrderedDict[K, _Entry[V]] = OrderedDict()

    def get(self, key: K) -> V | None:
        now = time.time()
        entry = self._store.get(key)
        if not entry:
            return None
        if entry.expires_at < now:
            self._store.pop(key, None)
            return None
        self._store.move_to_end(key)
        return entry.value

    def set(self, key: K, value: V) -> None:
        now = time.time()
        self._store[key] = _Entry(value=value, expires_at=now + self.ttl_seconds)
        self._store.move_to_end(key)
        while len(self._store) > self.max_size:
            self._store.popitem(last=False)

    def __len__(self) -> int:
        return len(self._store)
