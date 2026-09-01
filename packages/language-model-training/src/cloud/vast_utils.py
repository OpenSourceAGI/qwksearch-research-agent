"""
Vast.ai REST client and offer-selection helpers.

Vast.ai rents spare GPUs on a marketplace: you search available offers via
GET /bundles/, then accept one by PUT to /asks/{id}/, which creates a running
instance. Auth is a bearer token (the account's API key) on every request.
See https://docs.vast.ai/api-reference for the underlying HTTP API.

This module only wraps that HTTP API - it knows nothing about SSH or the
training container's job lifecycle. See src/services/vast_job.py for the
piece that turns a launched instance into a Job the control API can track.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

VAST_API_BASE = os.getenv("VAST_API_BASE", "https://console.vast.ai/api/v0")


class VastAPIError(RuntimeError):
    """Raised when the Vast.ai API returns a non-2xx response."""


class VastClient:
    """Thin wrapper over the Vast.ai REST API."""

    def __init__(self, api_key: Optional[str] = None, base_url: str = VAST_API_BASE):
        self.api_key = api_key or os.getenv("VAST_API_KEY", "")
        if not self.api_key:
            raise VastAPIError("VAST_API_KEY is not set")
        self.base_url = base_url.rstrip("/")

    def _request(self, method: str, path: str, *, params: Optional[dict] = None, json: Optional[dict] = None) -> Any:
        url = f"{self.base_url}{path}"
        resp = requests.request(
            method,
            url,
            params={k: v for k, v in (params or {}).items() if v is not None},
            json=json,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=30,
        )
        if not resp.ok:
            raise VastAPIError(f"Vast API {method} {path} failed: {resp.status_code} {resp.text}")
        if not resp.content:
            return {}
        return resp.json()

    def search_offers(
        self,
        gpu_name: Optional[str] = None,
        num_gpus: int = 1,
        max_hourly: Optional[float] = None,
        verified: bool = True,
        rentable: bool = True,
        order: str = "dlperf_usd-",
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """GET /bundles/ - the set of GPU offers currently for rent."""
        query: Dict[str, Any] = {"num_gpus": num_gpus, "order": order, "limit": limit}
        if gpu_name:
            query["gpu_name"] = gpu_name
        if verified:
            query["verified"] = "true"
        if rentable:
            query["rentable"] = "true"
        if max_hourly is not None:
            query["dph_total"] = f"lte={max_hourly}"
        result = self._request("GET", "/bundles/", params=query)
        return result.get("offers", result if isinstance(result, list) else [])

    def create_instance(
        self,
        ask_id: int,
        *,
        image: str,
        disk: float,
        onstart: str = "",
        env: Optional[Dict[str, str]] = None,
        ssh: bool = True,
        direct: bool = True,
        jupyter: bool = False,
    ) -> Dict[str, Any]:
        """PUT /asks/{id}/ - accept an offer, creating a running instance."""
        return self._request(
            "PUT",
            f"/asks/{ask_id}/",
            json={
                "image": image,
                "disk": disk,
                "ssh": ssh,
                "direct": direct,
                "env": env or {},
                "onstart": onstart,
                "jupyter": jupyter,
                "runtype": "ssh" if ssh else "args",
            },
        )

    def list_instances(self) -> List[Dict[str, Any]]:
        result = self._request("GET", "/instances/")
        return result.get("instances", result if isinstance(result, list) else [])

    def show_instance(self, instance_id: int) -> Dict[str, Any]:
        result = self._request("GET", f"/instances/{instance_id}/")
        return result.get("instances", result)

    def stop_instance(self, instance_id: int) -> Dict[str, Any]:
        return self._request("PUT", f"/instances/{instance_id}/", json={"state": "stopped"})

    def destroy_instance(self, instance_id: int) -> Dict[str, Any]:
        return self._request("DELETE", f"/instances/{instance_id}/")


def pick_best_offer(offers: List[Dict[str, Any]], max_hourly: Optional[float] = None) -> Dict[str, Any]:
    """Cheapest-performance-per-dollar offer, optionally capped at max_hourly."""
    candidates = [
        o for o in offers
        if max_hourly is None or float(o.get("dph_total", o.get("dph_base", float("inf")))) <= max_hourly
    ]
    if not candidates:
        raise VastAPIError("No Vast.ai offers matched the search filters and price cap")

    candidates.sort(
        key=lambda o: float(o.get("dlperf_per_dphtotal", o.get("dlperf_usd", 0.0))),
        reverse=True,
    )
    return candidates[0]
