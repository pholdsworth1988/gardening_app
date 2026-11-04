"""The garden layout the AI returns. Everything is in metres.

The origin (0, 0) is the back-left corner of the garden as seen on the
sketch: x runs to the right, y runs down the page (towards the house).
"""

from typing import Literal

from pydantic import BaseModel, Field


class Point(BaseModel):
    x: float = Field(description="Metres from the left edge of the garden")
    y: float = Field(description="Metres from the top (far) edge of the garden")


FeatureKind = Literal[
    "lawn", "bed", "raised_bed", "path", "patio", "decking", "pond",
    "shed", "greenhouse", "fence", "hedge", "wall", "water_butt",
    "compost", "seating", "house", "other",
]


class Feature(BaseModel):
    id: str = Field(description="Short id such as F1")
    kind: FeatureKind
    label: str = Field(description="Short label for the drawing, such as 'Herb bed'")
    shape: Literal["polygon", "circle"]
    points: list[Point] = Field(
        description="Corners in order for a polygon (at least 3). Empty for a circle."
    )
    center: Point = Field(description="Centre for a circle. For a polygon, its middle.")
    radius_m: float = Field(description="Radius for a circle. 0 for a polygon.")
    material: str = Field(description="Surface or material if known, such as 'gravel'. Empty if unknown.")


class Plant(BaseModel):
    id: str = Field(description="Short id such as P1")
    common_name: str
    latin_name: str
    x: float
    y: float
    plant_type: Literal["Tree", "Shrub", "Perennial", "Climber", "Herb", "Grass"] = Field(
        default="Perennial", description="What kind of plant it is, which sets its symbol on the plan"
    )
    spread_m: float = Field(description="Mature spread in metres")
    height_m: float = Field(default=0.6, description="Mature height in metres")
    quantity: int
    feature_id: str = Field(description="Id of the bed it sits in, or empty")


FurnitureKind = Literal[
    "dining_set", "bistro_set", "bench", "lounger", "sofa", "fire_pit", "pot",
]


class Furniture(BaseModel):
    id: str = Field(description="Short id such as S1")
    kind: FurnitureKind
    x: float = Field(description="Centre, metres from the left edge")
    y: float = Field(description="Centre, metres from the top edge")
    rotation_deg: float = Field(description="Clockwise turn from facing down the page. 0 if unsure.")
    seats: int = Field(description="Number of chairs for dining_set or bistro_set, otherwise 0")


class GardenLayout(BaseModel):
    title: str = Field(description="Short name for the design, such as 'Back garden'")
    width_m: float
    depth_m: float
    north_deg: float = Field(
        description="Direction north points, in degrees clockwise from straight up the page. 0 if unknown."
    )
    features: list[Feature]
    plants: list[Plant]
    furniture: list[Furniture] = Field(
        default_factory=list,
        description="Tables, chairs, benches, loungers, sofas, fire pits and pots on the plan"
    )
    assumptions: list[str] = Field(
        description="Anything guessed because the sketch did not say, such as sizes read from proportions"
    )
