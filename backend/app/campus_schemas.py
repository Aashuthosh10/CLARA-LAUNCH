"""Strict request contracts for the public, fixed-data campus APIs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CampusMatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    transcript: str = Field(min_length=1, max_length=1024)


class CampusRouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    origin_node_id: str | None = Field(default=None, max_length=128)
    destination_room_code: str = Field(min_length=1, max_length=64)
    destination_floor_id: Literal["GF", "FF", "SF"] | None = None
    mode: Literal["shortest", "accessible", "lift", "stairs"] = "shortest"
    language: str = Field(default="en", min_length=2, max_length=16)
