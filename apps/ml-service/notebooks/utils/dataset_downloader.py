"""Kaggle dataset download helpers using kagglehub."""

import shutil
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# All datasets used by SnackTrack ML training
DATASETS = {
    # User's 3 original datasets
    "diet_recommendations": {
        "kaggle_id": "ziya07/diet-recommendations-dataset",
        "description": "Diet recommendations based on health profiles (1K rows)",
    },
    "daily_food_nutrition": {
        "kaggle_id": "adilshamim8/daily-food-and-nutrition-dataset/versions/1",
        "description": "Daily food consumption with nutrition values",
    },
    "medical_diet": {
        "kaggle_id": "ziya07/personalized-medical-diet-recommendations-dataset",
        "description": "Personalized medical diet recommendations",
    },
    # Recommended datasets
    "foodcom_reviews": {
        "kaggle_id": "irkaal/foodcom-recipes-and-reviews",
        "description": "Food.com 522K recipes + 1.4M reviews with ratings",
    },
    "foodcom_interactions": {
        "kaggle_id": "shuyangli94/food-com-recipes-and-user-interactions",
        "description": "Food.com 200K recipes + 700K interactions (train/val/test splits)",
    },
    "epicurious": {
        "kaggle_id": "hugodarwood/epirecipes",
        "description": "Epicurious 20K+ recipes with ratings and nutrition",
    },
    "recipe_ingredients": {
        "kaggle_id": "kaggle/recipe-ingredients-dataset",
        "description": "40K recipes with ingredient lists + cuisine labels",
    },
    "global_food_nutrition": {
        "kaggle_id": "ahsanneural/global-food-and-nutrition-database-2026",
        "description": "45K+ foods with USDA nutrition, allergens, Nutri-Score",
    },
    "recipes_64k": {
        "kaggle_id": "prashantsingh001/recipes-dataset-64k-dishes",
        "description": "64K recipes with categories, ingredients, directions",
    },
    "food_recommendation": {
        "kaggle_id": "schemersays/food-recommendation-system",
        "description": "Food + ingredient + cuisine + rating data",
    },
}


def download_dataset(name: str, force: bool = False) -> Path:
    """Download a single dataset and return the path to the downloaded files."""
    import kagglehub

    if name not in DATASETS:
        raise ValueError(f"Unknown dataset: {name}. Available: {list(DATASETS.keys())}")

    info = DATASETS[name]
    dest = DATA_DIR / name

    if dest.exists() and not force:
        print(f"  [{name}] Already downloaded at {dest}")
        return dest

    print(f"  [{name}] Downloading {info['kaggle_id']}...")
    path = kagglehub.dataset_download(info["kaggle_id"])
    download_path = Path(path)

    # Copy to our data directory
    dest.mkdir(parents=True, exist_ok=True)
    for f in download_path.iterdir():
        if f.is_file():
            shutil.copy2(f, dest / f.name)

    print(f"  [{name}] Saved to {dest}")
    return dest


def download_all(force: bool = False) -> dict[str, Path]:
    """Download all datasets."""
    results = {}
    for name in DATASETS:
        try:
            results[name] = download_dataset(name, force=force)
        except Exception as e:
            print(f"  [{name}] FAILED: {e}")
            results[name] = None
    return results


def list_datasets() -> None:
    """Print all available datasets."""
    print(f"{'Name':<25} {'Kaggle ID':<55} {'Description'}")
    print("-" * 120)
    for name, info in DATASETS.items():
        print(f"{name:<25} {info['kaggle_id']:<55} {info['description']}")
