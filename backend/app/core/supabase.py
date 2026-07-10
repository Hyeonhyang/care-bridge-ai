import httpx
from app.core.config import get_settings


class SupabaseClient:
    """Supabase REST API 직접 호출 클라이언트."""

    def __init__(self):
        settings = get_settings()
        self.url = settings.SUPABASE_URL
        self.headers = {
            "apikey": settings.SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def table(self, name: str) -> "TableQuery":
        return TableQuery(self.url, self.headers, name)


class TableQuery:
    def __init__(self, url: str, headers: dict, table: str):
        self.base_url = f"{url}/rest/v1/{table}"
        self.headers = headers
        self._params: dict = {}
        self._order_col: str = ""
        self._order_desc: bool = False
        self._limit_val: int | None = None
        self._is_single: bool = False

    def select(self, columns: str = "*") -> "TableQuery":
        self._params["select"] = columns
        return self

    def eq(self, col: str, val: str) -> "TableQuery":
        self._params[col] = f"eq.{val}"
        return self

    def order(self, col: str, desc: bool = False) -> "TableQuery":
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "TableQuery":
        self._limit_val = n
        return self

    def single(self) -> "TableQuery":
        self._is_single = True
        self._limit_val = 1
        return self

    def execute(self):
        params = dict(self._params)
        if self._order_col:
            direction = "desc" if self._order_desc else "asc"
            params["order"] = f"{self._order_col}.{direction}"
        if self._limit_val:
            params["limit"] = str(self._limit_val)

        headers = dict(self.headers)
        if self._is_single:
            headers["Accept"] = "application/vnd.pgrst.object+json"

        r = httpx.get(self.base_url, headers=headers, params=params)
        r.raise_for_status()
        return _Result(r.json())

    def insert(self, data: dict | list) -> "TableInsert":
        return TableInsert(self.base_url, self.headers, data)

    def upsert(self, data: dict | list) -> "TableInsert":
        return TableInsert(self.base_url, self.headers, data, upsert=True)

    def update(self, data: dict) -> "TableUpdate":
        return TableUpdate(self.base_url, self.headers, data, self._params)


class TableUpdate:
    def __init__(self, url: str, headers: dict, data: dict, params: dict):
        self.url = url
        self.headers = headers
        self.data = data
        self.params = params

    def eq(self, col: str, val: str) -> "TableUpdate":
        self.params[col] = f"eq.{val}"
        return self

    def execute(self):
        r = httpx.patch(self.url, headers=self.headers, json=self.data, params=self.params)
        r.raise_for_status()
        return _Result(r.json() if r.content else [])


class TableInsert:
    def __init__(self, url: str, headers: dict, data: dict | list, upsert: bool = False):
        self.url = url
        self.headers = headers
        self.data = data
        self.upsert = upsert

    def execute(self):
        headers = dict(self.headers)
        if self.upsert:
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        r = httpx.post(self.url, headers=headers, json=self.data)
        r.raise_for_status()
        return _Result(r.json())


class _Result:
    def __init__(self, data):
        self.data = data


_client: SupabaseClient | None = None


def get_supabase() -> SupabaseClient:
    global _client
    if _client is None:
        _client = SupabaseClient()
    return _client
